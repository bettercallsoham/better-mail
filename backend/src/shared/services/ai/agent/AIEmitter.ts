import { logger } from "@sentry/node";
import { pusher } from "../../../config/pusher";

export class AIEmitter {
  /**
   * Emits tokens word-by-word for the typewriter effect.
   */
  emitToken(conversationId: string, token: string) {
    pusher.trigger(`private-${conversationId}`, "ai.token", {
      token,
      timestamp: Date.now(),
    });
  }

  /**
   * Notifies the UI that the AI has generated a concise title for a new thread.
   */
  emitTitleGenerated(conversationId: string, title: string) {
    pusher.trigger(`private-${conversationId}`, "ai.title.generated", {
      title,
      timestamp: Date.now(),
    });
  }

  /**
   * Standardized HITL emission.
   * Items now match the middleware's 'action_requests' structure.
   */
  emitActionRequired(
    conversationId: string,
    action: {
      actionId: string;
      description: string;
      items: Array<any>; // These are the action_requests from the middleware
    },
  ) {
    pusher.trigger(`private-${conversationId}`, "ai.action.required", {
      ...action,
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

  emitComplete(conversationId: string, messageId: string) {
    pusher.trigger(`private-${conversationId}`, "ai.complete", {
      messageId,
      timestamp: Date.now(),
    });
  }

  emitError(conversationId: string, error: string) {
    logger.error(`[Emitter Error] ${conversationId}:`+  error);
    pusher.trigger(`private-${conversationId}`, "ai.error", {
      error,
      timestamp: Date.now(),
    });
  }
}
