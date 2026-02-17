import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { pool } from "../../../config/db";
import { searchEmailsTool } from "../tools/searchEmailsTools";
import { emailActionsTool } from "../tools/emailActionTool";
import { gpt41LLM } from "../../../config/llm";
import { AGENT_SYSTEM_PROMPT } from "../prompts/system-prompt";
import { sendTelegramMessageTool } from "../tools/sendTelegramMessageTool";

export class AgentFactory {
  async createChatAgent() {
    return createAgent({
      model: gpt41LLM,
      tools: [searchEmailsTool, emailActionsTool, sendTelegramMessageTool],
      checkpointer: new PostgresSaver(pool),
      middleware: [
        humanInTheLoopMiddleware({
          interruptOn: {
            email_actions: {
              allowedDecisions: ["approve", "reject", "edit"],
              description: "Review email action",
            },
          },
        }),
      ],
      systemPrompt: AGENT_SYSTEM_PROMPT,
    });
  }
}
