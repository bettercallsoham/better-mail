import { Command } from "@langchain/langgraph";
import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
import { buildContext } from "./helper";
import crypto from "crypto";

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
    const { conversationId, userId, messageId } = input;
    const config = {
      configurable: {
        thread_id: conversationId,
        userId: userId,
        conversationId: conversationId,
      },
      interruptBefore: ["email_actions"],
    };

    try {
      const agent = await this.agentFactory.createChatAgent();
      const state = (await agent.getState(config)) as any;

      // Determine if the thread is waiting for approval
      const isInterrupted = state.next && state.next.length > 0;

      let stream;
      if (isInterrupted) {
        console.log(
          `[Orchestrator] Resuming thread ${conversationId} with Command`,
        );
        stream = await agent.stream(
          new Command({ resume: "Proceed with requested actions." }),
          { ...config, streamMode: ["messages", "updates"] },
        );
      } else {
        console.log(
          `[Orchestrator] Starting new turn for thread ${conversationId}`,
        );
        const { summary, messages: history } =
          await this.conversationService.getConversationContext(conversationId);
        // Only build context for fresh turns
        const formattedMessages = buildContext({ summary, messages: history });

        stream = await agent.stream(
          { messages: formattedMessages },
          { ...config, streamMode: ["messages", "updates"] },
        );
      }

      await this.runStreamLoop(stream, {
        agent,
        conversationId,
        userId,
        messageId,
        config,
      });
    } catch (error: any) {
      console.error(`[Orchestrator Error] ${conversationId}:`, error);
      this.emitter.emitError(conversationId, error.message);
    }
  }

  async handleApproval(input: {
    conversationId: string;
    userId: string;
    messageId: string;
    approved: boolean;
  }) {
    const { conversationId, userId, messageId, approved } = input;
    const config = {
      configurable: { thread_id: conversationId },
      interruptBefore: ["email_actions"],
    };

    try {
      const agent = await this.agentFactory.createChatAgent();
      // Explicit user decision injected via Command
      const stream = await agent.stream(
        new Command({ resume: approved ? "approved" : "rejected" }),
        { ...config, streamMode: ["messages", "updates"] },
      );

      await this.runStreamLoop(stream, {
        agent,
        conversationId,
        userId,
        messageId,
        config,
      });
    } catch (error: any) {
      this.emitter.emitError(conversationId, error.message);
    }
  }

  private async runStreamLoop(
    stream: any,
    ctx: {
      agent: any;
      conversationId: string;
      userId: string;
      messageId: string;
      config: any;
    },
  ) {
    let finalText = "";
    let sources: any[] = [];

    console.log(`\n--- 🚀 STREAM START: ${ctx.conversationId} ---`);

    for await (const [mode, data] of stream) {
      if (mode === "updates") {
        const nodeName = Object.keys(data)[0];
        console.log(`\n[NODE TRANSITION] --> ${nodeName.toUpperCase()}`);

        if (data && "__interrupt__" in data) {
          console.warn(`[⏸️ INTERRUPT] Pausing before: ${nodeName}`);
          const state = (await ctx.agent.getState(ctx.config)) as any;
          const pending =
            state.values?.messages[state.values.messages.length - 1]
              ?.tool_calls || [];

          this.emitter.emitActionRequired(ctx.conversationId, {
            actionId: crypto.randomUUID(),
            items: pending.map((tc: any) => ({
              tool: tc.name,
              args: tc.args,
              tool_call_id: tc.id,
            })),
            type: "confirmation_required",
            description: "Awaiting approval for sensitive action.",
          });
          return;
        }

        // ✅ Extract email results specifically for the 'sources' field
        if (data?.tools?.emails) {
          console.log(
            `[🛠️ TOOL RESULT] Found ${data.tools.emails.length} emails.`,
          );
          sources.push(...data.tools.emails);
        }
      }

      if (mode === "messages") {
        const [chunk] = data;
        if (chunk?.content) {
          const token =
            typeof chunk.content === "string"
              ? chunk.content
              : JSON.stringify(chunk.content);
          finalText += token;
          process.stdout.write(token);
          this.emitter.emitToken(ctx.conversationId, token);
        }
      }
    }

    console.log(`\n--- ✅ STREAM COMPLETE: ${ctx.conversationId} ---\n`);

    // ✅ FINAL MAPPING FIX: Match your Elasticsearch 'strict' schema
    const assistantMsg: ConversationMessage = {
      messageId: crypto.randomUUID(),
      conversationId: ctx.conversationId,
      userId: ctx.userId,
      role: "assistant",
      content: finalText || "Task completed.",
      status: "completed",
      createdAt: new Date(),
      updatedAt: new Date(),

      // ✅ toolCalls moved to top-level
      toolCalls:
        sources.length > 0
          ? sources.map((s) => ({
              toolName: "search_emails",
              output: s,
            }))
          : [],

      // ✅ sources moved to top-level
      sources: sources.map((s) => ({
        type: "email",
        emailId: s.emailId,
        snippet: s.snippet,
      })),
    };

    await this.conversationService.createMessage(assistantMsg);
    this.emitter.emitComplete(ctx.conversationId, assistantMsg.messageId);
  }
}
