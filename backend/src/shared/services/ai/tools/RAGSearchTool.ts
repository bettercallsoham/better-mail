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
      "Natural language query for semantic search over emails (e.g. 'emails about project Alpha', 'security alerts from Google')",
    ),
  limit: z.number().default(5),
});

export const unifiedRAGTool = tool(
  async (input, config) => {
    const userId = config.configurable?.userId;

    if (!userId) {
      return "Error: Missing required context (userId).";
    }

    const vectorSearch = new VectorSearchService(elasticClient);
    const embeddings = new EmbeddingsService();
    const ragService = new RAGService(embeddings, vectorSearch);

    try {
      const { context } = await ragService.getEmailContext(input.query, userId);

      return context;
    } catch (error: any) {
      console.error("RAG Tool Failure:", error);
      return `Error retrieving context: ${error.message}.`;
    }
  },
  {
    name: "search_email_knowledge",
    description:
      "Semantically search the user's email knowledge base for conceptual or topic-based questions. Use this when the user asks things like 'have I ever discussed X?', 'emails about project Y', or needs semantic reasoning over email content. Do NOT use for real-time inbox filtering, metadata queries, or unread counts — use search_emails for those.",
    schema: ragSearchSchema,
  },
);
