import { tool, type ToolRuntime } from "langchain";
import { z } from "zod";
import { elasticClient } from "../../../config/elastic";
import { VectorSearchService } from "../../elastic/vector-search.service";
import { EmbeddingsService } from "../embeddings.service";
import { RAGService } from "../rag.service";

// Define the schema for the LLM
const ragSearchSchema = z.object({
  query: z
    .string()
    .describe(
      "The natural language query to search for context, e.g., 'What did John say about the project budget?'",
    ),
  limit: z
    .number()
    .default(5)
    .describe("Number of context pieces to retrieve."),
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
      "Use this tool when the user asks a question that requires information from their emails or past conversations. " +
      "It performs a semantic search to find the most relevant historical facts.",
    schema: ragSearchSchema,
  },
);
