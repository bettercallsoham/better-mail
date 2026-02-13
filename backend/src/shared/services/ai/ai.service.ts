import {
  azureClient4o_mini,
  GPT_4O_MINI_MODEL,
  azureClient41,
  GPT_41_MODEL,
} from "../../config/llm";
import { logger } from "../../utils/logger";
import { EmbeddingsService } from "./embeddings.service";

interface SummaryInput {
  emailsText: string;
  previousSummary?: string;
}

interface RAGChatInput {
  query: string;
  emailAddresses: string[];
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    from?: string;
    labels?: string[];
  };
}

/**
 * Simple LLM wrapper for AI operations
 * No business logic - just makes API calls
 */
export class AISummaryService {
  constructor(private embeddingsService?: EmbeddingsService) {}
  /**
   * Summarize thread emails
   * @param input - Formatted emails text and optional previous summary
   * @returns Raw LLM response as string
   */
  async summarizeThread(input: SummaryInput): Promise<string> {
    const { emailsText, previousSummary } = input;

    try {
      const systemPrompt = `You're an  assistant that summarizes email threads.
Provide a comprehensive summary in pure JSON format (no markdown, no code blocks) with these fields:
- summary: A concise overview of the thread
- keyPoints: Array of main discussion points
- actionItems: Array of tasks or follow-ups needed
- sentiment: "positive", "neutral", or "negative"
- priority: "low", "medium", or "high"

DON'T MISS OUT ON ANY IMPORTANT INFORMATION.

Return ONLY the JSON object, nothing else.`;

      const userPrompt = previousSummary
        ? `Previous Summary:\n${previousSummary}\n\nNew Emails:\n${emailsText}\n\nUpdate the summary with the new information.`
        : `Emails:\n${emailsText}\n\nSummarize this email thread.`;

      logger.info("Calling Azure OpenAI for thread summary");
      const response = await azureClient4o_mini.chat.completions.create({
        model: GPT_4O_MINI_MODEL!,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      logger.info("Summary generated successfully");

      return content;
    } catch (error) {
      logger.error("Error calling OpenAI:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * RAG-based chat: Search emails and answer questions
   */
  async ragChat(input: RAGChatInput): Promise<string> {
    const {
      query,
      emailAddresses,
      conversationHistory = [],
      filters = {},
    } = input;

    if (!this.embeddingsService) {
      throw new Error("EmbeddingsService not initialized");
    }

    try {
      logger.info(`RAG Chat query: "${query.slice(0, 50)}..."`);

      // Search for relevant emails using vector search
      const { context, results } =
        await this.embeddingsService.searchAndFormatContext(
          query,
          { emailAddresses, ...filters },
          5, // Top 5 most relevant emails
        );

      if (results.length === 0) {
        return "I couldn't find any relevant emails to answer your question. Try rephrasing or adjusting your filters.";
      }

      // Build system prompt for RAG
      const systemPrompt = `You are an intelligent email assistant. Answer the user's question based ONLY on the provided email context.

Guidelines:
- Be concise and direct
- Reference specific emails when answering (e.g., "In the email from John...")
- If the context doesn't contain the answer, say so clearly
- Don't make up information
- Use natural, conversational language

Email Context:
${context}`;

      // Build messages with conversation history
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: query },
      ];

      logger.info("Calling Azure OpenAI GPT-4 for RAG response");
      const response = await azureClient41.chat.completions.create({
        model: GPT_41_MODEL!,
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      });

      const answer =
        response.choices[0]?.message?.content ||
        "I couldn't generate a response.";
      logger.info("RAG response generated successfully");

      return answer;
    } catch (error) {
      logger.error("RAG chat failed:", {
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
