import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
import { buildContext } from "./helper";
import { redis } from "../../../config/redis";
import { addConversationEmbeddingsJob } from "../../../queues/generate-conversation-embeddings.queue";

interface ProcessMessageInput {
  conversationId: string;
  userId: string;
  messageId: string;
  messageContent: string;
}

export class AIOrchestratorService {
  constructor(
    private conversationService: ConversationService,
    private agentFactory: AgentFactory,
    private emitter: AIEmitter,
  ) {}

  async processMessage(input: ProcessMessageInput) {
    const { conversationId, userId, messageId, messageContent } = input;

    try {
      await this.conversationService.updateMessage(conversationId, messageId, {
        status: "completed",
      });

      const { summary, messages: history } =
        await this.conversationService.getConversationContext(conversationId);

      const formattedMessages = buildContext({ summary, messages: history });

      const agent = this.agentFactory.createChatAgent();

      /**
       * Note: We use streamMode: "values" or "updates" to easily catch tool outputs.
       * If staying with "messages", we check the node names in metadata.
       */
      const stream = await agent.stream(
        { messages: formattedMessages },
        {
          streamMode: "messages",
          context: { userId, conversationId },
        },
      );

      const streamKey = `stream:${conversationId}:${userId}:${messageId}`;
      await redis.del(streamKey);

      let finalText = "";
      let sources: any[] = []; // Collector for UI-interactive data

      for await (const [chunk, metadata] of stream) {
        // 1. CAPTURE TOOL OUTPUTS (Sources)
        // In LangGraph, tool results usually come from a node named 'tools'
        if (metadata.langgraph_node === "tools" && chunk.content) {
          try {
            const contentStr = Array.isArray(chunk.content)
              ? chunk.content
                  .map((c: any) => ("text" in c ? c.text : ""))
                  .join("")
              : chunk.content;
            const toolData = JSON.parse(contentStr);
            this.emitter.emitToken(conversationId, toolData);

            if (toolData.emails && Array.isArray(toolData.emails)) {
              sources.push(...toolData.emails);
            }
          } catch (e) {
            console.warn(
              "Tool output was not JSON, skipping source extraction",
            );
          }
        }

        // 2. CAPTURE ASSISTANT TEXT (Streaming)
        if (
          (metadata.langgraph_node === "model" ||
            metadata.langgraph_node === "model_request") &&
          chunk.content
        ) {
          const content = Array.isArray(chunk.content)
            ? chunk.content
                .map((c: any) => ("text" in c ? c.text : ""))
                .join("")
            : chunk.content;

          finalText += content;
          await redis.setex(streamKey, 3600, finalText);
          this.emitter.emitToken(conversationId, content);
        }
      }

      if (!finalText || finalText.trim() === "") {
        const cachedText = await redis.get(streamKey);
        if (cachedText) finalText = cachedText;
      }

      await redis.del(streamKey);

      // 3. CREATE MESSAGE WITH METADATA
      const assistantMessage: ConversationMessage = {
        messageId: crypto.randomUUID(),
        conversationId,
        userId,
        role: "assistant",
        content: finalText,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          toolCalls: sources.length > 0 ? sources : undefined,
        },
      };

      await this.conversationService.createMessage(assistantMessage);
      this.emitter.emitComplete(conversationId, assistantMessage.messageId);

      await addConversationEmbeddingsJob({
        conversationId,
        userId,
        messageIds: [messageId, assistantMessage.messageId],
      });
    } catch (error: any) {
      console.error("Orchestrator Error:", error);
      await this.conversationService.updateMessage(conversationId, messageId, {
        status: "failed",
        metadata: { errorMessage: error.message },
      });
      this.emitter.emitError(conversationId, error.message);
    }
  }
}
