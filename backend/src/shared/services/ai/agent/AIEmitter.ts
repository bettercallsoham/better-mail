import { pusher } from "../../../config/pusher";

export class AIEmitter {
  emitToken(conversationId: string, token: string) {
    pusher.trigger(`private-${conversationId}`, "ai.token", {
      token,
      timestamp: Date.now(),
    });
  }

  emitToolStart(conversationId: string, toolName: string) {
    pusher.trigger(`private-${conversationId}`, "ai.tool.start", {
      tool: toolName,
      status: "executing",
      timestamp: Date.now(),
    });
  }

  emitToolResult(conversationId: string, data: any) {
    pusher.trigger(`private-${conversationId}`, "ai.tool.result", {
      data,
      timestamp: Date.now(),
    });
  }

  emitActionRequired(
    conversationId: string,
    action: {
      actionId: string;
      type: string;
      description: string;
      items: Array<{
        messageId: string;
        subject: string;
        from: string;
        date: string;
      }>;
    },
  ) {
    pusher.trigger(`private-${conversationId}`, "ai.action.required", {
      ...action,
      timestamp: Date.now(),
    });
  }

  emitComplete(conversationId: string, messageId: string) {
    pusher.trigger(`private-${conversationId}`, "ai.complete", { messageId });
  }

  emitError(conversationId: string, error: string) {
    pusher.trigger(`private-${conversationId}`, "ai.error", {
      error,
      timestamp: Date.now(),
    });
  }
}
