import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
import { buildContext } from "./helper"; 

interface ProcessMessageInput {
  conversationId: string;
  userId: string;
  messageId: string;
}

export class AIOrchestratorService {
  constructor(
    private conversationService: ConversationService,
    private agentFactory: AgentFactory,
    private emitter: AIEmitter,
  ) {}

  async processMessage(input: ProcessMessageInput) {
    const { conversationId, userId, messageId } = input;

    try {
      await this.conversationService.updateMessage(conversationId, messageId, {
        status: "processing",
      });

      const { summary, messages: history } =
        await this.conversationService.getConversationContext(conversationId);

      
      const formattedMessages = buildContext({ summary, messages: history });

      const agent = this.agentFactory.createChatAgent();

      const stream = await agent.stream(
        { messages: formattedMessages },
        { 
          streamMode: "messages",
          context: { userId, conversationId } 
        }
      );

      let finalText = "";

      // 5. Iterate through the stream
      for await (const [chunk, metadata] of stream) {
      
        if (metadata.langgraph_node === "model" && chunk.content) {
          const content = Array.isArray(chunk.content) 
            ? chunk.content.map(c => ("text" in c ? c.text : "")).join("")
            : chunk.content;

          finalText += content;
          this.emitter.emitToken(conversationId, content);
        }
      }

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