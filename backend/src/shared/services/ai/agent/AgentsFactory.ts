import { createAgent } from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { pool } from "../../../config/db";
import { searchEmailsTool } from "../tools/searchEmailsTools";
import { emailActionsTool } from "../tools/emailActionTool";
import { unifiedRAGTool } from "../tools/RAGSearchTool";
import { gpt41LLM } from "../../../config/llm";
import { AGENT_SYSTEM_PROMPT } from "../prompts/system-prompt";

export class AgentFactory {
  private static checkpointer: PostgresSaver | null = null;

  private async getCheckpointer() {
    if (!AgentFactory.checkpointer) {
      const saver = new PostgresSaver(pool);
      await saver.setup();
      AgentFactory.checkpointer = saver;
    }
    return AgentFactory.checkpointer;
  }

  async createChatAgent() {
    const checkpointer = await this.getCheckpointer();

    return createAgent({
      model: gpt41LLM,
      tools: [searchEmailsTool, unifiedRAGTool, emailActionsTool],
      checkpointer: checkpointer,
      systemPrompt: AGENT_SYSTEM_PROMPT,
    });
  }
}
