import { azureClient4o_mini, GPT_4O_MINI_MODEL } from "../../config/llm";
import { logger } from "../../utils/logger";

interface SummaryInput {
  emailsText: string;
  previousSummary?: string;
}

/**
 * Simple LLM wrapper for AI operations
 * No business logic - just makes API calls
 */
export class AISummaryService {
  /**
   * Summarize thread emails
   * @param input - Formatted emails text and optional previous summary
   * @returns Raw LLM response as string
   */
  async summarizeThread(input: SummaryInput): Promise<string> {
    const { emailsText, previousSummary } = input;

    try {
      const systemPrompt = `You are an AI assistant that summarizes email threads.
Provide a comprehensive summary in pure JSON format (no markdown, no code blocks) with these fields:
- summary: A concise overview of the thread
- keyPoints: Array of main discussion points
- actionItems: Array of tasks or follow-ups needed
- sentiment: "positive", "neutral", or "negative"
- priority: "low", "medium", or "high"

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
        temperature: 0.3,
        max_tokens: 1000,
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
