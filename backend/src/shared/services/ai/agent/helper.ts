import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  ConversationMessage,
  ConversationSummary,
} from "../../elastic/conversation.service";

export function buildContext(input: {
  summary: ConversationSummary | null;
  messages: ConversationMessage[];
}) {
  const langchainMessages: any[] = [];

  if (input.summary) {
    langchainMessages.push(
      new SystemMessage(
        `Previous Conversation Summary: ${input.summary.summary}`,
      ),
    );
  }

  const history = input.messages.map((m) => {
    if (m.role === "user") return new HumanMessage(m.content);
    if (m.role === "assistant") return new AIMessage(m.content);
    return new SystemMessage(m.content);
  });

  return [...langchainMessages, ...history];
}
