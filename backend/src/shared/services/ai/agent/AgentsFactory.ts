import { createAgent } from "langchain";
import { searchEmailsTool } from "../tools/searchEmailsTools";
import { z } from "zod";
import { gpt41LLM } from "../../../config/llm";

const contextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

export class AgentFactory {
  createChatAgent() {
    return createAgent({
      model: gpt41LLM,
      tools: [searchEmailsTool],
      contextSchema,
      systemPrompt: `
        You are BetterMail AI assistant. 
        Help users manage emails efficiently.
        Be concise and actionable.
      `,
    });
  }
}
