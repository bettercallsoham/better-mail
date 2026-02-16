import { tool, type ToolRuntime } from "langchain";
import { z } from "zod";
import { elasticClient } from "../../../config/elastic";
import { VectorSearchService } from "../../elastic/vector-search.service";
import { EmbeddingsService } from "../embeddings.service";
import { RAGService } from "../rag.service";

const ragSearchSchema = z.object({
  query: z
    .string()
    .describe(
      "Natural language query for semantic reasoning (e.g. 'Summarize Google security alerts')",
    ),
  limit: z.number().default(5),
});

export const unifiedRAGTool = tool(
  async (input, config) => {
    const userId = config.configurable?.userId;
    const conversationId = config.configurable?.conversationId;

    if (!userId || !conversationId) {
      return "Error: Missing required context (userId or conversationId).";
    }

    const vectorSearch = new VectorSearchService(elasticClient);
    const embeddings = new EmbeddingsService();
    const ragService = new RAGService(embeddings, vectorSearch);

    try {
      const { context } = await ragService.getUnifiedContext(
        input.query,
        userId,
        conversationId,
      );

      console.log("Context retrieved for query:", input.query);
      return context;
    } catch (error: any) {
      console.error("RAG Tool Failure:", error);
      return `Error retrieving context: ${error.message}.`;
    }
  },
  {
    name: "search_knowledge_and_history",
    description: "Search across past chats and existing email knowledge base.",
    schema: ragSearchSchema,
  },
);
