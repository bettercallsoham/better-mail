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

/**
 * Unified RAG Tool
 * Purpose: Provides the LLM with 'Memory' (Past Chats) and 'Knowledge' (Emails).
 */
export const unifiedRAGTool = tool(
  async (input, runtime: ToolRuntime) => {
    console.log("Got unifiedRAG tool ");
    const { userId, conversationId } = runtime.context as {
      userId: string;
      conversationId: string;
    };
    const vectorSearch = new VectorSearchService(elasticClient);
    const embeddings = new EmbeddingsService();
    const ragService = new RAGService(embeddings, vectorSearch);

    try {
      // 3. Perform the Dual-Index Hybrid Search
      const { context, raw } = await ragService.getUnifiedContext(
        input.query,
        userId,
        conversationId, // Pass this to avoid searching the active chat
      );

      console.log("context from ragSearch", context);
      return context;
    } catch (error: any) {
      console.error("RAG Tool Failure:", error);
      return `Error retrieving context: ${error.message}. Proceed with existing conversation history.`;
    }
  },
  {
    name: "search_knowledge_and_history",
    description:
      "Best for: Summarizing topics, 'What'/'How' questions, and finding info across chats when user query isn't complete and emails.",
    schema: ragSearchSchema,
  },
);
