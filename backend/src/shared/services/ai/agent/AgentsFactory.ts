import { createAgent } from "langchain";
import { humanInTheLoopMiddleware, summarizationMiddleware } from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { pool } from "../../../config/db";
import { gpt41LLM, gpt4oMiniLLM } from "../../../config/llm";
import { searchEmailsTool } from "../tools/searchEmailsTools";
import { emailActionsTool } from "../tools/emailActionTool";
import { sendTelegramMessageTool } from "../tools/sendTelegramMessageTool";
import { getAgentSystemPrompt } from "../prompts/system-prompt";
import { unifiedRAGTool } from "../tools/RAGSearchTool";
import { getEmailContentTool } from "../tools/getEmailContentTool";

export class AgentFactory {
  private static checkpointer: PostgresSaver | null = null;

  // Cache the agent instance — no reason to recreate it per message
  private static agentInstance: Awaited<ReturnType<typeof createAgent>> | null = null;

  private async getCheckpointer(): Promise<PostgresSaver> {
    if (!AgentFactory.checkpointer) {
      AgentFactory.checkpointer = new PostgresSaver(pool);
      await AgentFactory.checkpointer.setup();
    }
    return AgentFactory.checkpointer;
  }

  async createChatAgent() {
    // Return cached instance — the checkpointer handles per-thread state
    if (AgentFactory.agentInstance) {
      return AgentFactory.agentInstance;
    }

    const saver = await this.getCheckpointer();

    AgentFactory.agentInstance = createAgent({
      model: gpt41LLM,
      tools: [
        searchEmailsTool,
        getEmailContentTool,
        emailActionsTool,
        unifiedRAGTool,
        sendTelegramMessageTool,
      ],
      checkpointer: saver,
      middleware: [
      summarizationMiddleware({
          model: gpt4oMiniLLM,
          trigger: { messages: 30 },
          keep: { messages: 20 },
          summaryPrefix:
            "Previous conversation context (user memory is tracked separately):",
        }),
        humanInTheLoopMiddleware({
          interruptOn: {
            email_actions: {
              allowedDecisions: ["approve", "reject", "edit"],
              description: "Review email action",
            },
          },
        }),
      ],
    
      systemPrompt: getAgentSystemPrompt(),
    });

    return AgentFactory.agentInstance;
  }

  /**
   * Build a dynamic system prompt with injected memory context.
   * Called by AIOrchestratorService before each agent.stream() call.
   */
  static buildSystemPrompt(memoryBlock: string): string {
    const base = getAgentSystemPrompt();
    if (!memoryBlock) return base;
    return `${base}\n\n${memoryBlock}`;
  }
}