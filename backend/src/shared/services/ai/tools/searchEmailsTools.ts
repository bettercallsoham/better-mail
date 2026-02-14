import { tool, type ToolRuntime } from "langchain";
import { z } from "zod";
import { elasticClient } from "../../../config/elastic";
import { ElasticsearchService } from "../../elastic/elastic.service";
import { getUserEmails } from "../../../../apis/utils/email-helper";

const searchEmailsSchema = z.object({
  query: z
    .string()
    .describe(
      "Search query text. Can be natural language like 'emails from John'",
    ),
  filters: z
    .object({
      isRead: z.boolean().optional(),
      isStarred: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      hasAttachments: z.boolean().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      labels: z.array(z.string()).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
    .optional(),
  limit: z.number().default(5).describe("Number of results (max 10)"),
});

// Define the tool
export const searchEmailsTool = tool(
  async (input, runtime: ToolRuntime) => {
    const { userId } = runtime.context as { userId: string }; 
    const elasticService = new ElasticsearchService(elasticClient);

    try {
      const { emails: emailAddresses, error } = await getUserEmails(userId);
      if (error || !emailAddresses.length) {
        return "No email accounts connected. Please connect an account first.";
      }

      const result = await elasticService.searchEmails({
        emailAddresses,
        query: input.query,
        size: Math.min(input.limit, 10),
        filters: input.filters || {},
      });

      // Transform for LLM consumption
      const simplified = result.emails.map((email: any) => ({
        emailId: email._id,
        subject: email.subject || "(No subject)",
        from: email.from?.email,
        snippet: email.snippet,
        receivedAt: email.receivedAt,
      }));

      return JSON.stringify({
        total: result.total,
        emails: simplified,
        summary: `Found ${result.total} emails.`,
      });
    } catch (e: any) {
      return `Error searching emails: ${e.message}`;
    }
  },
  {
    name: "search_emails",
    description:
      "Search through user's emails using filters like 'from', 'date', or 'unread'.",
    schema: searchEmailsSchema,
  },
);
