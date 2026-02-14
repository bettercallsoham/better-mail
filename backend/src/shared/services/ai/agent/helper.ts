import {
  ConversationMessage,
  ConversationSummary,
} from "../../elastic/conversation.service";

export function buildContext({
  summary,
  messages,
}: {
  summary: ConversationSummary | null;
  messages: ConversationMessage[];
}) {
  const context: any[] = [];

  context.push({
    role: "system",
    content: "You are BetterMail AI assistant. Help user manage emails.",
  });

  if (summary) {
    context.push({
      role: "system",
      content: `Conversation summary: ${summary.summary}`,
    });
  }

  for (const msg of messages) {
    context.push({
      role: msg.role,
      content: msg.content,
    });
  }

  return context;
}
