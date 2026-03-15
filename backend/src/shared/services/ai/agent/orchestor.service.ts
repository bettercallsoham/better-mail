import { Command } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
import { gpt4oMiniLLM } from "../../../config/llm";
import { MemoryService } from "../memory.service";
import crypto from "crypto";
import { logger } from "@sentry/node";
import { TelegramHandler } from "../../../../modules/telegram/telegram.handler";
import { piiService } from "../pii.service";

export class AIOrchestratorService {
  private telegramHandler = new TelegramHandler();

  constructor(
    private conversationService: ConversationService,
    private agentFactory: AgentFactory,
    private emitter: AIEmitter,
    private memoryService: MemoryService, 
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
      const safeContent = await piiService.sanitize(messageContent);

      const state = (await agent.getState(config)) as any;
      const isFirstMessage =
        !state.values?.messages || state.values.messages.length === 0;

      const memoryBlock = await this.memoryService.inject(userId, safeContent);
      const dynamicSystemPrompt = AgentFactory.buildSystemPrompt(memoryBlock);

      const stream = await agent.stream(
        {
          messages: [new HumanMessage(safeContent)],
          
        },
        {
          ...config,
          streamMode: ["messages", "updates"],
          configurable: {
            ...config.configurable,
            systemPrompt: dynamicSystemPrompt,
          },
        },
      );

      const finalText = await this.handleStream(stream, {
        conversationId,
        userId,
        isTelegram,
        isFirstMessage,
        messageContent: safeContent,
      });

      if (finalText && safeContent) {
        this.memoryService
          .extract(userId, {
            user: safeContent,
            assistant: finalText,
            conversationId,
          })
          .catch((err) =>
            logger.error("[MemoryService.extract background error]:", err),
          );
      }
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

  // ─── Returns finalText so processMessage can pass it to memory.extract ──────
  private async handleStream(stream: any, ctx: any): Promise<string> {
    let finalText = "";
    let tgMessageId: number | null = null;
    let lastStreamedLength = 0;
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
            await this.telegramHandler.sendActionRequired(
              chatId,
              interrupt.description,
              ctx.conversationId,
            );
          } else {
            this.emitter.emitActionRequired(ctx.conversationId, interrupt);
          }
          return finalText; // early return on interrupt
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

        if (msg._getType() === "tool") {
          const toolName: string = msg.name ?? "";
          const toolContent: string =
            typeof msg.content === "string" ? msg.content : "";

          const newSources = this.extractSourcesFromToolResult(
            toolName,
            toolContent,
          );
          for (const src of newSources) {
            if (src.emailId) capturedSources.set(src.emailId, src);
          }

          if (newSources.length > 0 && !ctx.isTelegram) {
            this.emitter.emitToolResult(ctx.conversationId, {
              sources: Array.from(capturedSources.values()),
            });
          }
        }
      }
    }

    // Finalize Telegram stream
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

    return finalText;
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
  ) {
    try {
      // Use cheap mini model — this is just a title
      const response = await gpt4oMiniLLM.invoke([
        {
          role: "system",
          content: "Create a 3-5 word title for this chat. Return ONLY title text, no quotes.",
        },
        { role: "user", content: firstMsg.slice(0, 200) },
      ]);

      const title = response.content.toString().trim();

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

      this.emitter.emitTitleGenerated(convId, title);
    } catch (err) {
      logger.error("[Title Background Error]:", { err });
    }
  }

  private getAgentConfig(thread_id: string, userId: string) {
    return { configurable: { thread_id, userId, conversationId: thread_id } };
  }

  private handleError(conversationId: string, error: any, isTelegram: boolean) {
    logger.error(`[Orchestrator Fatal Error]:`, error);
    if (!isTelegram) {
      this.emitter.emitError(conversationId, error.message);
    }
  }

  private extractSourcesFromToolResult(
    toolName: string,
    content: string,
  ): any[] {
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