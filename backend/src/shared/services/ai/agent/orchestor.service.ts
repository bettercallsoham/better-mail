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
import { TelegramHandler } from "../../../../modules/telegram/telegram.handler";

export class AIOrchestratorService {
  private telegramHandler = new TelegramHandler();

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
        const lastMessage =
          state.values?.messages?.[state.values.messages.length - 1];
        const hasToolCalls = lastMessage?.tool_calls?.length > 0;

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
          stream = await agent.stream(new Command({ resume: messageContent }), {
            ...config,
            streamMode: ["messages", "updates"],
          });
        }
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
        conversationId,
        userId,
        messageId,
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

    try {
      const agent = await this.agentFactory.createChatAgent();
      const state = (await agent.getState(config)) as any;
      const lastMsg =
        state.values?.messages?.[state.values.messages.length - 1];
      const pendingCalls = lastMsg?.tool_calls || [];

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
        conversationId,
        userId,
        decisionStatus: approved ? "approved" : "rejected",
      });
    } catch (error: any) {
      this.handleError(conversationId, error);
    }
  }

  private async handleStream(stream: any, ctx: any) {
    let finalText = "";
    let tgMessageId: number | null = null;
    let lastStreamedLength = 0;
    const capturedToolCalls: any[] = [];

    const isTelegram = ctx.conversationId.startsWith("tg_");
    const chatId = isTelegram ? ctx.conversationId.replace("tg_", "") : null;

    for await (const [mode, data] of stream) {
      // 1. Process Updates (Tools and Interrupts)
      if (mode === "updates") {
        // Safely check if model_request exists and has messages
        if (data.model_request?.messages) {
          const msg = data.model_request.messages[0];
          if (msg?.tool_calls?.length > 0) {
            // Tool calls are handled here if needed
          }
        }

        // Handle standard tool output capture
        if (data.tools) {
          Object.entries(data.tools).forEach(([toolName, output]) => {
            capturedToolCalls.push({ toolName, output });
            if (isTelegram && chatId && toolName === "search_emails") {
              this.telegramHandler.sendMessage(
                ctx.userId,
                "🔍 <i>Searching your inbox...</i>",
              );
            }
          });
        }

        // Handle Interrupts
        if ("__interrupt__" in data) {
          const interrupt = data.__interrupt__[0].value;
          if (isTelegram && chatId) {
            return this.telegramHandler.sendActionRequired(
              chatId,
              interrupt.review_configs?.[0]?.description ||
                "Approval required.",
              ctx.conversationId,
            );
          }
          return this.emitter.emitActionRequired(ctx.conversationId, interrupt);
        }
      }

      if (mode === "messages") {
        const msg = data[0];

        const isAI = msg._getType() === "ai";
        const hasContent =
          typeof msg.content === "string" && msg.content.length > 0;
        const isToolCall = msg.tool_calls && msg.tool_calls.length > 0;

        if (isAI && hasContent && !isToolCall) {
          const token = msg.content;
          finalText += token;

          if (!isTelegram) {
            this.emitter.emitToken(ctx.conversationId, token);
          }

          if (
            isTelegram &&
            chatId &&
            finalText.length - lastStreamedLength > 40
          ) {
            tgMessageId = await this.telegramHandler.streamToTelegram(
              chatId,
              finalText,
              tgMessageId,
              false,
            );
            lastStreamedLength = finalText.length;
          }
        }
      }
    }

    if (isTelegram && chatId) {
      if (tgMessageId) {
        await this.telegramHandler.streamToTelegram(
          chatId,
          finalText,
          tgMessageId,
          true,
        );
      } else if (finalText.trim().length > 0) {
        await this.telegramHandler.sendMessage(ctx.userId, finalText);
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
    if (ctx.isFirstMessage)
      await this.generateAndSaveTitle(
        ctx.conversationId,
        ctx.userId,
        ctx.messageContent,
      );
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
          "Create a 3-5 word title for this chat. Return ONLY the title.",
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
