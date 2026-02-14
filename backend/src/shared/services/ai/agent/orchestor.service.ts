import {
  ConversationMessage,
  ConversationService,
} from "../../elastic/conversation.service";
import { AgentFactory } from "./AgentsFactory";
import { AIEmitter } from "./AIEmitter";
import { buildContext } from "./helper";
import { run } from "@openai/agents";

interface ProcessMessageInput {
  conversationId: string;
  userId: string;
  messageId: string; // user message
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
      // 1. Mark user message as processing
      await this.conversationService.updateMessage(conversationId, messageId, {
        status: "processing",
      });

      // 2. Load context
      const { summary, messages } =
        await this.conversationService.getConversationContext(conversationId);

      const context = buildContext({ summary, messages });

      // 3. Create agent
      const agent = this.agentFactory.createChatAgent({
        userId,
        conversationId,
      });

      // 4. Start streaming run
      const stream = await run(agent, context, {
        stream: true,
      });

      let finalText = "";

      // 5. Stream tokens
      const textStream = stream.toTextStream({
        compatibleWithNodeStreams: false,
      });

      for await (const chunk of textStream) {
        finalText += chunk;
        this.emitter.emitToken(conversationId, chunk);
      }

      // 6. Wait until fully completed
      await stream.completed;

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

      // 8. Emit completion event
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
