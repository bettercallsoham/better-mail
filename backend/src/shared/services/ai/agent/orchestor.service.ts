import { Command } from "@langchain/langgraph";
import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
import { buildContext } from "./helper";
import { gpt41LLM } from "../../../config/llm";
import crypto from "crypto";
import { HumanMessage, SystemMessage } from "langchain";

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
      const state = (await Promise.resolve(agent.getState(config))) as any;

      // Determine if this is the first message to trigger title generation
      const isFirstMessage =
        !state.values?.messages || state.values.messages.length === 0;
      const isInterrupted = state.next && state.next.length > 0;

      let stream;
      if (isInterrupted) {
        // Conversational resume: LLM interprets user intent (approve/reject/edit)
        stream = await agent.stream(new Command({ resume: messageContent }), {
          ...config,
          streamMode: ["messages", "updates"],
        });
      } else {
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
        isFirstMessage,
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
    const config = this.getAgentConfig(input.conversationId, input.userId);
    try {
      const agent = await this.agentFactory.createChatAgent();
      const state = (await Promise.resolve(agent.getState(config))) as any;
      const pendingCalls =
        state.values?.messages?.[state.values.messages.length - 1]
          ?.tool_calls || [];

      const stream = await agent.stream(
        new Command({
          resume: {
            decisions: pendingCalls.map(() => ({
              type: input.approved ? "approve" : "reject",
            })),
          },
        }),
        { ...config, streamMode: ["messages", "updates"] },
      );

      await this.handleStream(stream, {
        agent,
        ...input,
        config,
        isFirstMessage: false,
      });
    } catch (error: any) {
      this.handleError(input.conversationId, error);
    }
  }

  private async handleStream(stream: any, ctx: any) {
    let finalText = "";
    let toolResults: any[] = [];

    for await (const [mode, data] of stream) {
      if (mode === "updates") {
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
        if (data.tools?.emails) toolResults.push(...data.tools.emails);
      }

      if (mode === "messages" && data[0]?.content) {
        const token = data[0].content;
        finalText += token;
        process.stdout.write(token); // Real-time typewriter logging
        this.emitter.emitToken(ctx.conversationId, token);
      }
    }

    await this.persistCompletion(ctx, finalText, toolResults);
  }

  private async persistCompletion(ctx: any, content: string, sources: any[]) {
    if (!content && sources.length === 0) return;

    const message: ConversationMessage = {
      messageId: crypto.randomUUID(),
      conversationId: ctx.conversationId,
      userId: ctx.userId,
      role: "assistant",
      content: content || "Action processed.",
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
      toolCalls: sources.map((s) => ({ toolName: "search_emails", output: s })),
      sources: sources.map((s) => ({
        type: "email",
        emailId: s.emailId,
        snippet: s.snippet,
      })),
    };

    await this.conversationService.createMessage(message);

    if (ctx.isFirstMessage) {
      this.generateAndSaveTitle(
        ctx.conversationId,
        ctx.userId,
        ctx.messageContent,
      );
    }

    this.emitter.emitComplete(ctx.conversationId, message.messageId);
  }

  private async generateAndSaveTitle(
    conversationId: string,
    userId: string,
    firstMessage: string,
  ) {
    try {
      const response = await gpt41LLM.invoke([
        new SystemMessage(
          "Create a 3-5 word concise title for this conversation. Return ONLY the title.",
        ),
        new HumanMessage(firstMessage),
      ]);

      const title = response.content.toString().replace(/"/g, "");

      await this.conversationService.createOrUpdateSummary({
        conversationId,
        userId,
        title,
        summary: firstMessage.slice(0, 100),
        messageCount: 2,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      this.emitter.emitTitleGenerated(conversationId, title); // Notify frontend
    } catch (err) {
      console.error("[Title Gen Error]:", err);
    }
  }

  private getAgentConfig(thread_id: string, userId: string) {
    return { configurable: { thread_id, userId, conversationId: thread_id } };
  }

  private handleError(conversationId: string, error: any) {
    console.error(`[Orchestrator Fatal]:`, error);
    this.emitter.emitError(conversationId, error.message);
  }
}
