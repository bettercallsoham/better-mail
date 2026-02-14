import { Agent } from "@openai/agents";
import { azureClient4o_mini, GPT_4O_MINI_MODEL } from "../../../config/llm";

interface CreateAgentInput {
  userId: string;
  conversationId: string;
}

export class AgentFactory {
  createChatAgent(_: CreateAgentInput): Agent {
    return new Agent({
      name: "Better Agent",
      model: GPT_4O_MINI_MODEL!,
      instructions: `
        You are BetterMail AI assistant.
        Help users manage emails efficiently.
        Be concise, structured and actionable.
      `,
      tools: [], // we add later
    });
  }
}
