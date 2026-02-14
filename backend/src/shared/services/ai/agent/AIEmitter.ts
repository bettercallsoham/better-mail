import { pusher } from "../../../config/pusher";

export class AIEmitter {
  emitToken(conversationId: string, token: string) {
    console.log("conversation id : ", conversationId, "token", token);

    pusher.trigger(`private-${conversationId}`, "ai.token", {
      token,
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
