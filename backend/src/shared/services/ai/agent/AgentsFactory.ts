import {
  createAgent,
  humanInTheLoopMiddleware,
  summarizationMiddleware,
} from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { pool } from "../../../config/db";
import { gpt41LLM } from "../../../config/llm";
import { searchEmailsTool } from "../tools/searchEmailsTools";
import { emailActionsTool } from "../tools/emailActionTool";
import { sendTelegramMessageTool } from "../tools/sendTelegramMessageTool";
import { getAgentSystemPrompt } from "../prompts/system-prompt";
import { unifiedRAGTool } from "../tools/RAGSearchTool";
import { getEmailContentTool } from "../tools/getEmailContentTool";

export class AgentFactory {
  private static checkpointer: PostgresSaver | null = null;

  private async getCheckpointer(): Promise<PostgresSaver> {
    if (!AgentFactory.checkpointer) {
      AgentFactory.checkpointer = new PostgresSaver(pool);
      await AgentFactory.checkpointer.setup();
    }
    return AgentFactory.checkpointer;
  }

  async createChatAgent() {
    const saver = await this.getCheckpointer();

    return createAgent({
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
          model: gpt41LLM,
          trigger: { messages: 20 },
          keep: { messages: 10 },
          summaryPrefix: "Context summary:",
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
  }
}
