import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
import { buildContext } from "./helper";
import { redis } from "../../../config/redis";

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
        status: "processing",
      });

      const { summary, messages: history } =
        await this.conversationService.getConversationContext(conversationId);

      console.log("summary :", summary);
      console.log("messages :", history);

      const formattedMessages = buildContext({ summary, messages: history });

      console.log("formatted Messages :", formattedMessages);

      const agent = this.agentFactory.createChatAgent();

      const stream = await agent.stream(
        { messages: formattedMessages },
        {
          streamMode: "messages",
          context: { userId, conversationId },
        },
      );

      // Redis key to store streaming text
      const streamKey = `stream:${conversationId}:${userId}:${messageId}`;
      await redis.del(streamKey); // Clear any previous data

      let finalText = "";
      let chunkCount = 0;

      // Iterate through the stream
      for await (const [chunk, metadata] of stream) {
        chunkCount++;
        console.log(`\n🔍 Chunk #${chunkCount}:`, {
          node: metadata.langgraph_node,
          hasContent: !!chunk.content,
          contentType: typeof chunk.content,
          contentPreview: typeof chunk.content === 'string' 
            ? chunk.content.substring(0, 50) 
            : Array.isArray(chunk.content) 
              ? `Array[${chunk.content.length}]` 
              : chunk.content,
        });

        // Accept both "model" and "model_request" nodes
        if ((metadata.langgraph_node === "model" || metadata.langgraph_node === "model_request") && chunk.content) {
          const content = Array.isArray(chunk.content)
            ? chunk.content.map((c) => ("text" in c ? c.text : "")).join("")
            : chunk.content;

          finalText += content;
          
          // Store in Redis as we accumulate (with 1 hour TTL)
          await redis.setex(streamKey, 3600, finalText);
          
          this.emitter.emitToken(conversationId, content);
          console.log("✅ Accumulated text length:", finalText.length);
        }
      }

      console.log(`\n📊 Stream completed: ${chunkCount} chunks processed, finalText length: ${finalText.length}`);

      // Retrieve from Redis as fallback if finalText is empty
      if (!finalText || finalText.trim() === "") {
        console.log("⚠️ finalText is empty, retrieving from Redis...");
        const cachedText = await redis.get(streamKey);
        if (cachedText) {
          finalText = cachedText;
          console.log("✅ Retrieved from Redis, length:", finalText.length);
        }
      }

      console.log("finalText: ", finalText);
      
      // Clean up Redis after retrieval
      await redis.del(streamKey);
      // 7. Persist assistant message
      const assistantMessage: ConversationMessage = {
        messageId: crypto.randomUUID(),
        conversationId,
        userId,
        role: "assistant",
        content: finalText,
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.conversationService.createMessage(assistantMessage);
      this.emitter.emitComplete(conversationId, assistantMessage.messageId);
    } catch (error: any) {
      await this.conversationService.updateMessage(conversationId, messageId, {
        status: "failed",
        metadata: { errorMessage: error.message },
      });
      this.emitter.emitError(conversationId, error.message);
    }
  }
}
