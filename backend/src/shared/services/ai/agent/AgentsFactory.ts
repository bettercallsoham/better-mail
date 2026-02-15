import { createAgent } from "langchain";
import { searchEmailsTool } from "../tools/searchEmailsTools";
import { z } from "zod";
import { gpt41LLM } from "../../../config/llm";
import { AGENT_SYSTEM_PROMPT } from "../prompts/system-prompt";
import { unifiedRAGTool } from "../tools/RAGSearchTool";

const contextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

export class AgentFactory {
  createChatAgent() {
    return createAgent({
      model: gpt41LLM,
      tools: [searchEmailsTool, unifiedRAGTool],
      contextSchema,
      systemPrompt: AGENT_SYSTEM_PROMPT,
    });
  }
}
