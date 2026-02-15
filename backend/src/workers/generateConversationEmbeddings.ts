import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { ConversationService } from "../shared/services/elastic/conversation.service";
import { EmbeddingsService } from "../shared/services/ai/embeddings.service";
import { elasticClient } from "../shared/config/elastic";
import { logger } from "../shared/utils/logger";

interface GenerateConversationEmbeddingsJob {
  conversationId: string;
  userId: string;
  messageIds: string[];
}

// Initialize services
const conversationService = new ConversationService(elasticClient);
const embeddingsService = new EmbeddingsService();

export const conversationEmbeddingsWorker =
  new Worker<GenerateConversationEmbeddingsJob>(
    "conversation-embeddings-queue",
    async (job: Job<GenerateConversationEmbeddingsJob>) => {
      const { conversationId, userId, messageIds } = job.data;

      logger.info(`Generating embeddings for conversation messages`, {
        conversationId,
        userId,
        messageCount: messageIds.length,
        jobId: job.id,
      });

      try {
        // Get messages that need embeddings
        const messages = await Promise.all(
          messageIds.map((id) => conversationService.getMessageById(id)),
        );

        // Filter out messages that already have embeddings or are not completed
        const messagesNeedingEmbeddings = messages
          .filter((msg) => msg && msg.status === "completed" && !msg.embeddings)
          .filter(Boolean) as any[];

        if (messagesNeedingEmbeddings.length === 0) {
          logger.info(`No messages need embeddings`, { conversationId });
          return;
        }

        // Extract content for embedding generation
        const contents = messagesNeedingEmbeddings.map((msg) => msg.content);

        // Generate embeddings in batch for efficiency
        const embeddings = await embeddingsService.generateBatch(contents);

        // Update each message with its embedding
        await Promise.all(
          messagesNeedingEmbeddings.map((msg, index) =>
            conversationService.updateMessage(conversationId, msg.messageId, {
              embeddings: embeddings[index],
            }),
          ),
        );

        logger.info(`Successfully generated embeddings for conversation`, {
          conversationId,
          processedCount: messagesNeedingEmbeddings.length,
          totalRequested: messageIds.length,
        });
      } catch (error) {
        logger.error(`Failed to generate conversation embeddings`, {
          conversationId,
          userId,
          messageIds,
          error: (error as Error).message,
          stack: (error as Error).stack,
        });
        throw error;
      }
    },
    {
      connection: redis as any,
      concurrency: 2, // Lower concurrency for embedding generation
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 1000, // Per second (rate limiting for API calls)
      },
    },
  );

// Event listeners for monitoring
conversationEmbeddingsWorker.on("completed", (job) => {
  logger.info(`Conversation embeddings job completed`, {
    jobId: job.id,
    conversationId: job.data.conversationId,
  });
});

conversationEmbeddingsWorker.on("failed", (job, err) => {
  logger.error(`Conversation embeddings job failed`, {
    jobId: job?.id,
    conversationId: job?.data.conversationId,
    error: err.message,
  });
});
