// helper.ts
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

export function buildContext(input: {
  summary: any | null;
  messages: any[];
}) {
  const langchainMessages: any[] = [];

  if (input.summary?.summary) {
    langchainMessages.push(new SystemMessage(`Summary: ${input.summary.summary}`));
  }

  const history = input.messages.map((m) => {
    if (m.role === "user") return new HumanMessage(m.content);
    
    if (m.role === "assistant") {
      // ✅ CRITICAL: If the assistant made tool calls, we must preserve them
      // so the next message can legally be a ToolMessage or a Resume Command.
      return new AIMessage({
        content: m.content,
        tool_calls: m.metadata?.toolCalls || [], 
      });
    }
    
    // ✅ Handle ToolMessages if they exist in your DB
    if (m.role === "tool") {
      return new ToolMessage({
        content: m.content,
        tool_call_id: m.metadata?.tool_call_id,
      });
    }

    return new SystemMessage(m.content);
  });

  return [...langchainMessages, ...history];
}