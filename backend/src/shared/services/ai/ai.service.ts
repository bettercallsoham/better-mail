import {
  azureClient4o_mini,
  GPT_4O_MINI_MODEL,
  azureClient41,
  GPT_41_MODEL,
} from "../../config/llm";
import { logger } from "../../utils/logger";
import { RAGService } from "./rag.service";

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
 * AI Service - LLM orchestration layer
 * Handles LLM API calls and response formatting
 */
export class AISummaryService {
  constructor(private ragService?: RAGService) {}
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
- summary: A concise overview of the thread [keep it complete , short and correct]
- keyPoints: Array of main discussion points
- actionItems: Array of tasks or follow-ups needed [include coupon codes given or any important info]
- sentiment: "positive", "neutral", or "negative"
- priority: "low", "medium", or "high"

DON'T MISS OUT ON ANY IMPORTANT INFORMATION.

Return ONLY the JSON object, nothing else.`;

      const userPrompt = previousSummary
        ? `Previous Summary:
${previousSummary}

New Emails:
${emailsText}

Update the summary. For action items, distinguish between resolved, ongoing, and new ones.`
        : `Emails:\n${emailsText}\n\nSummarize this email thread.`;

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
}
