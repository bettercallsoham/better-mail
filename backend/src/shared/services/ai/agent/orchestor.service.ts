import { Command } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
import { buildContext } from "./helper";
import { gpt41LLM } from "../../../config/llm";
import crypto from "crypto";
import { logger } from "@sentry/node";

export class AIOrchestratorService {
  constructor(
    private conversationService: ConversationService,
    private agentFactory: AgentFactory,
    private emitter: AIEmitter,
  ) {}

  async processMessage(input: {
    conversationId: string;
    userId: string;
    messageId: string;
    messageContent: string;
  }) {
    const { conversationId, userId, messageId, messageContent } = input;
    const config = this.getAgentConfig(conversationId, userId);

    try {
      const agent = await this.agentFactory.createChatAgent();
      const state = (await agent.getState(config)) as any;
      const isInterrupted = state.next && state.next.length > 0;

      let stream;
      if (isInterrupted) {
        // 1. CHECK FOR PENDING TOOL CALLS
        const lastMessage =
          state.values?.messages?.[state.values.messages.length - 1];
        const hasToolCalls = lastMessage?.tool_calls?.length > 0;

        // 2. TRANSLATE NATURAL LANGUAGE TO DECISION
        // If there are pending tool calls, LangGraph middleware REQUIRES the 'decisions' format.
        if (hasToolCalls) {
          const isPositive = /yes|approve|do it|proceed|go ahead|delete/i.test(
            messageContent,
          );

          stream = await agent.stream(
            new Command({
              resume: {
                decisions: lastMessage.tool_calls.map(() => ({
                  type: isPositive ? "approve" : "reject",
                })),
              },
            }),
            { ...config, streamMode: ["messages", "updates"] },
          );
        } else {
          // Fallback for non-tool interrupts
          stream = await agent.stream(new Command({ resume: messageContent }), {
            ...config,
            streamMode: ["messages", "updates"],
          });
        }
      } else {
        // Standard flow (New Turn)
        const { summary, messages: history } =
          await this.conversationService.getConversationContext(conversationId);
        const messages = [
          ...buildContext({ summary, messages: history }),
          new HumanMessage(messageContent),
        ];
        stream = await agent.stream(
          { messages },
          { ...config, streamMode: ["messages", "updates"] },
        );
      }

      await this.handleStream(stream, {
        agent,
        conversationId,
        userId,
        messageId,
        config,
        isFirstMessage: !state.values?.messages?.length,
        messageContent,
      });
    } catch (error: any) {
      this.handleError(conversationId, error);
    }
  }

  async handleApproval(input: {
    conversationId: string;
    userId: string;
    messageId: string;
    approved: boolean;
  }) {
    const { conversationId, userId, approved } = input;
    const config = this.getAgentConfig(conversationId, userId);
    const decisionStatus = approved ? "approved" : "rejected";

    try {
      const agent = await this.agentFactory.createChatAgent();
      const state = (await agent.getState(config)) as any;
      const lastMsg =
        state.values?.messages?.[state.values.messages.length - 1];
      const pendingCalls = lastMsg?.tool_calls || [];

      // Resume graph with structured decision
      const stream = await agent.stream(
        new Command({
          resume: {
            decisions: pendingCalls.map(() => ({
              type: approved ? "approve" : "reject",
            })),
          },
        }),
        { ...config, streamMode: ["messages", "updates"] },
      );

      await this.handleStream(stream, {
        agent,
        conversationId,
        userId,
        config,
        decisionStatus,
      });
    } catch (error: any) {
      this.handleError(conversationId, error);
    }
  }

  private async handleStream(stream: any, ctx: any) {
    let finalText = "";
    let capturedToolCalls: any[] = [];

    for await (const [mode, data] of stream) {
      if (mode === "updates") {
        // Handle Interrupts
        if ("__interrupt__" in data) {
          const interrupt = data.__interrupt__[0].value;
          return this.emitter.emitActionRequired(ctx.conversationId, {
            actionId: crypto.randomUUID(),
            items: interrupt.action_requests,
            description:
              interrupt.review_configs?.[0]?.description ||
              "Approval required.",
          });
        }

        // Capture Tool Outputs
        if (data.tools) {
          Object.entries(data.tools).forEach(([toolName, output]) => {
            capturedToolCalls.push({
              toolName,
              output,
              status: ctx.decisionStatus || "auto_executed",
            });
          });
        }
      }

      if (mode === "messages" && data[0]?.content) {
        const token = data[0].content;
        finalText += token;
        this.emitter.emitToken(ctx.conversationId, token);
      }
    }

    await this.persistCompletion(ctx, finalText, capturedToolCalls);
  }

  private async persistCompletion(ctx: any, content: string, toolCalls: any[]) {
    if (!content && toolCalls.length === 0) return;

    const assistantMessage: ConversationMessage = {
      messageId: crypto.randomUUID(),
      conversationId: ctx.conversationId,
      userId: ctx.userId,
      role: "assistant",
      content: content || (toolCalls.length > 0 ? "Action processed." : ""),
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
      toolCalls: toolCalls,
      metadata: {
        model: "gpt-4.1",
        userDecision: ctx.decisionStatus || "auto_executed",
      },
      sources: this.extractSources(toolCalls),
    };

    await this.conversationService.createMessage(assistantMessage);

    if (ctx.isFirstMessage) {
      await this.generateAndSaveTitle(
        ctx.conversationId,
        ctx.userId,
        ctx.messageContent,
      );
    }

    this.emitter.emitComplete(ctx.conversationId, assistantMessage.messageId);
  }

  private extractSources(toolCalls: any[]) {
    return toolCalls
      .filter((tc) => tc.toolName === "search_emails" && tc.output?.emails)
      .flatMap((tc) =>
        tc.output.emails.map((e: any) => ({
          type: "email",
          emailId: e.emailId,
          snippet: e.snippet,
        })),
      );
  }

  private async generateAndSaveTitle(
    conversationId: string,
    userId: string,
    firstMsg: string,
  ) {
    try {
      const response = await gpt41LLM.invoke([
        new SystemMessage(
          "Create a 3-5 word concise title for this conversation. Return ONLY the title.",
        ),
        new HumanMessage(firstMsg),
      ]);
      const title = response.content.toString().replace(/"/g, "");
      await this.conversationService.createOrUpdateSummary({
        conversationId,
        userId,
        title,
        summary: firstMsg.slice(0, 100),
        messageCount: 2,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      this.emitter.emitTitleGenerated(conversationId, title);
    } catch (err) {
      logger.error("[Title Gen Error]:" + err);
    }
  }

  private getAgentConfig(thread_id: string, userId: string) {
    return { configurable: { thread_id, userId, conversationId: thread_id } };
  }

  private handleError(conversationId: string, error: any) {
    logger.error(`[Orchestrator Fatal]:`, error);
    this.emitter.emitError(conversationId, error.message);
  }
}
