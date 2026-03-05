import { logger } from "@sentry/node";
import { pusher } from "../../../config/pusher";

export class AIEmitter {

  emitToken(conversationId: string, token: string) {
    console.log("[AIEmitter] emitToken →", `private-${conversationId}`, token.slice(0, 30));
    pusher.trigger(`private-${conversationId}`, "ai.token", {
      token,
      timestamp: Date.now(),
    });
  }

  /**
   * Notifies the UI that the AI has generated a concise title for a new thread.
   */
  emitTitleGenerated(conversationId: string, title: string) {
    console.log("[AIEmitter] emitTitleGenerated →", conversationId, title);
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
    console.log("[AIEmitter] emitActionRequired →", conversationId, action);
    pusher.trigger(`private-${conversationId}`, "ai.action.required", {
      ...action,
      timestamp: Date.now(),
    });
  }

  emitToolStart(conversationId: string, toolName: string) {
    console.log("[AIEmitter] emitToolStart →", conversationId, toolName);
    pusher.trigger(`private-${conversationId}`, "ai.tool.start", {
      tool: toolName,
      status: "executing",
      timestamp: Date.now(),
    });
  }

  emitToolResult(conversationId: string, data: any) {
    console.log("[AIEmitter] emitToolResult →", conversationId);
    pusher.trigger(`private-${conversationId}`, "ai.tool.result", {
      data,
      timestamp: Date.now(),
    });
  }

  emitComplete(conversationId: string, messageId: string) {
    console.log("[AIEmitter] emitComplete →", conversationId, messageId);
    pusher.trigger(`private-${conversationId}`, "ai.complete", {
      messageId,
      timestamp: Date.now(),
    });
  }

  emitError(conversationId: string, error: string) {
    console.error("[AIEmitter] emitError →", conversationId, error);
    logger.error(`[Emitter Error] ${conversationId}:` + error);
    pusher.trigger(`private-${conversationId}`, "ai.error", {
      error,
      timestamp: Date.now(),
    });
  }
}
