import { Worker, Job } from "bullmq";
import { redis } from "../shared/config/redis";
import { AIOrchestratorService } from "../shared/services/ai/agent/orchestor.service";
import { ConversationService } from "../shared/services/elastic/conversation.service";
import { elasticClient } from "../shared/config/elastic";
import { AgentFactory } from "../shared/services/ai/agent/AgentsFactory";
import { AIEmitter } from "../shared/services/ai/agent/AIEmitter";
import { logger } from "../shared/utils/logger";
import { conversationQueue } from "../shared/queues/conversation.queue";

interface ProcessConversationMessageJob {
  conversationId: string;
  userId: string;
  messageId: string;
  messageContent: string;
}

// Initialize services
const conversationService = new ConversationService(elasticClient);
const agentFactory = new AgentFactory();
const emitter = new AIEmitter();
const orchestrator = new AIOrchestratorService(
  conversationService,
  agentFactory,
  emitter,
);

export const conversationWorker = new Worker<ProcessConversationMessageJob>(
  conversationQueue.name,
  async (job: Job<ProcessConversationMessageJob>) => {
    const { conversationId, userId, messageId, messageContent } = job.data;

    logger.info(`Processing conversation message`, {
      conversationId,
      userId,
      messageId,
      jobId: job.id,
    });

    try {
      // Call the AI orchestrator to process the message
      await orchestrator.processMessage({
        conversationId,
        userId,
        messageId,
        messageContent,
      });

      logger.info(`Successfully processed conversation message`, {
        conversationId,
        messageId,
        jobId: job.id,
      });
    } catch (error: any) {
      logger.error(`Failed to process conversation message`, {
        conversationId,
        messageId,
        jobId: job.id,
        error: error.message,
        stack: error.stack,
      });
      throw error; // Re-throw to trigger BullMQ retry
    }
  },
  {
    connection: redis as any,
    concurrency: 5, // Process 5 conversations concurrently
  },
);

// Worker event handlers
conversationWorker.on("completed", (job) => {
  logger.info(`Conversation job completed`, { jobId: job.id });
});

conversationWorker.on("failed", (job, err) => {
  logger.error(`Conversation job failed`, {
    jobId: job?.id,
    error: err.message,
  });
});

conversationWorker.on("error", (err) => {
  logger.error(`Conversation worker error`, { error: err.message });
});

logger.info("Conversation worker started");
