import { Command } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
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
    messageContent: string;
  }) {
    const { conversationId, userId, messageContent } = input;
    const config = this.getAgentConfig(conversationId, userId);
    const isTelegram = conversationId.startsWith("tg_");

    try {
      const agent = await this.agentFactory.createChatAgent();

      const state = (await agent.getState(config)) as any;
      const isFirstMessage =
        !state.values?.messages || state.values.messages.length === 0;

      const stream = await agent.stream(
        { messages: [new HumanMessage(messageContent)] },
        { ...config, streamMode: ["messages", "updates"] },
      );

      await this.handleStream(stream, {
        conversationId,
        userId,
        isTelegram,
        isFirstMessage,
        messageContent,
      });
    } catch (error: any) {
      this.handleError(conversationId, error, isTelegram);
    }
  }

  async handleApproval(input: {
    conversationId: string;
    userId: string;
    approved: boolean;
  }) {
    const { conversationId, userId, approved } = input;
    const config = this.getAgentConfig(conversationId, userId);
    const isTelegram = conversationId.startsWith("tg_");

    try {
      const agent = await this.agentFactory.createChatAgent();

      // Resume the graph using the structured Command API
      const stream = await agent.stream(
        new Command({ resume: approved ? "approve" : "reject" }),
        { ...config, streamMode: ["messages", "updates"] },
      );

      await this.handleStream(stream, {
        conversationId,
        userId,
        isTelegram,
        decisionStatus: approved ? "approved" : "rejected",
      });
    } catch (error: any) {
      this.handleError(conversationId, error, isTelegram);
    }
  }

  /**
   * Unified stream handler with Client Isolation (TG vs Web).
   */
  private async handleStream(stream: any, ctx: any) {
    let finalText = "";
    let tgMessageId: number | null = null;
    let lastStreamedLength = 0;
    // Map keyed by emailId for automatic deduplication across tool calls
    const capturedSources = new Map<string, any>();
    const chatId = ctx.isTelegram
      ? ctx.conversationId.replace("tg_", "")
      : null;

    for await (const [mode, data] of stream) {
      if (mode === "updates") {
        if (data.tools) {
          const toolName = Object.keys(data.tools)[0];
          if (ctx.isTelegram) {
            await this.telegramHandler.sendMessage(
              ctx.userId,
              `⚙️ <i>Using ${toolName}...</i>`,
            );
          } else {
            this.emitter.emitToolStart(ctx.conversationId, toolName);
          }
        }
        if ("__interrupt__" in data) {
          const interrupt = data.__interrupt__[0].value;
          if (ctx.isTelegram && chatId) {
            return this.telegramHandler.sendActionRequired(
              chatId,
              interrupt.description,
              ctx.conversationId,
            );
          } else {
            return this.emitter.emitActionRequired(
              ctx.conversationId,
              interrupt,
            );
          }
        }
      }

      if (mode === "messages") {
        const msg = data[0];

        if (msg._getType() === "ai" && msg.content && !msg.tool_calls?.length) {
          finalText += msg.content;

          if (ctx.isTelegram && chatId) {
            if (finalText.length - lastStreamedLength > 50) {
              tgMessageId = await this.telegramHandler.streamToTelegram(
                chatId,
                finalText,
                tgMessageId,
                false,
              );
              lastStreamedLength = finalText.length;
            }
          } else {
            this.emitter.emitToken(ctx.conversationId, msg.content);
          }
        }

        // Capture tool results for citations
        if (msg._getType() === "tool") {
          const toolName: string = msg.name ?? "";
          const toolContent: string =
            typeof msg.content === "string" ? msg.content : "";

          const newSources = this.extractSourcesFromToolResult(
            toolName,
            toolContent,
          );
          for (const src of newSources) {
            if (src.emailId) {
              capturedSources.set(src.emailId, src);
            }
          }

          if (newSources.length > 0 && !ctx.isTelegram) {
            this.emitter.emitToolResult(ctx.conversationId, {
              sources: Array.from(capturedSources.values()),
            });
          }
        }
      }
    }

    if (ctx.isTelegram && chatId && finalText.trim().length > 0) {
      await this.telegramHandler.streamToTelegram(
        chatId,
        finalText,
        tgMessageId,
        true,
      );
    }

    await this.persistCompletion(
      ctx,
      finalText,
      Array.from(capturedSources.values()),
    );
  }

  private async persistCompletion(ctx: any, content: string, sources: any[]) {
    if (!content && sources.length === 0) return;

    const messageId = crypto.randomUUID();
    const assistantMessage: ConversationMessage = {
      messageId,
      conversationId: ctx.conversationId,
      userId: ctx.userId,
      role: "assistant",
      content: content || "Action processed.",
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        model: "gpt-4.1",
        userDecision: ctx.decisionStatus || "auto_executed",
      },
      sources: sources.length > 0 ? sources : undefined,
    };

    await this.conversationService.createMessage(assistantMessage);

    if (ctx.isFirstMessage && ctx.messageContent && !ctx.isTelegram) {
      this.generateTitleBackground(
        ctx.conversationId,
        ctx.userId,
        ctx.messageContent,
        ctx.isTelegram,
      ).catch((err) => logger.error("[Title Gen Error]:", err));
    }

    if (!ctx.isTelegram) {
      this.emitter.emitComplete(ctx.conversationId, messageId);
    }
  }

  private async generateTitleBackground(
    convId: string,
    uId: string,
    firstMsg: string,
    isTg: boolean,
  ) {
    try {
      const response = await gpt41LLM.invoke([
        {
          role: "system",
          content:
            "Create a 3-5 word title for this chat. Return ONLY title text.",
        },
        { role: "user", content: firstMsg },
      ]);
      const title = response.content.toString().replace(/"/g, "");

      await this.conversationService.createOrUpdateSummary({
        conversationId: convId,
        userId: uId,
        title,
        summary: firstMsg.slice(0, 100),
        messageCount: 2,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (!isTg) this.emitter.emitTitleGenerated(convId, title);
    } catch (err) {
      logger.error("[Title Background Error]:", { err });
    }
  }

  private getAgentConfig(thread_id: string, userId: string) {
    return { configurable: { thread_id, userId, conversationId: thread_id } };
  }

  private handleError(conversationId: string, error: any, isTelegram: boolean) {
    logger.error(`[Orchestrator Fatal Error]:`, error);
    if (isTelegram) {
      const chatId = conversationId.replace("tg_", "");
      console.log("ERROR HAPPEEENEDDDDD");
      console.dir(error, { depth: null });
    } else {
      this.emitter.emitError(conversationId, error.message);
    }
  }

  private extractSourcesFromToolResult(toolName: string, content: string): any[] {
    const sources: any[] = [];

    if (toolName === "search_emails" || toolName === "get_email_content") {
      try {
        const parsed = JSON.parse(content);
        const emails: any[] = parsed.emails ?? [];
        for (const email of emails) {
          if (!email.emailId) continue;
          const bodyText: string = email.bodyText ?? email.snippet ?? "";
          sources.push({
            type: "email",
            emailId: email.emailId,
            snippet: bodyText.slice(0, 120) || undefined,
            metadata: {
              subject: email.subject,
              from: email.from,
              threadId: email.threadId,
              receivedAt: email.receivedAt,
            },
          });
        }
      } catch {
        // non-JSON result, skip
      }
    } else if (toolName === "search_knowledge_and_history") {
      // Parse the formatted RAG string produced by rag.service.ts
      // Format per block: "Email N [Score: X.XX] [emailId: ID]:\nFrom: ...\nDate: ...\nBody: ...\n"
      const blocks = content.split("---").filter((b) => b.trim());
      for (const block of blocks) {
        const emailIdMatch = block.match(/\[emailId:\s*([^\]]+)\]/);
        if (!emailIdMatch) continue;

        const emailId = emailIdMatch[1].trim();
        const subjectMatch = block.match(/Subject:\s*(.+)/);
        const fromMatch = block.match(/From:\s*([^|]+)/);
        const dateMatch = block.match(/Date:\s*([^|]+)/);
        const bodyMatch = block.match(/Body:\s*([\s\S]+)/);

        sources.push({
          type: "email",
          emailId,
          snippet: bodyMatch?.[1]?.trim().slice(0, 120) || undefined,
          metadata: {
            subject: subjectMatch?.[1]?.trim(),
            from: fromMatch?.[1]?.trim(),
            receivedAt: dateMatch?.[1]?.trim(),
          },
        });
      }
    }

    return sources;
  }
}
