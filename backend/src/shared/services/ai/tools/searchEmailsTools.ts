import { tool, type ToolRuntime } from "langchain";
import { z } from "zod";
import { elasticClient } from "../../../config/elastic";
import { ElasticsearchService } from "../../elastic/elastic.service";
import { getUserEmails } from "../../../../apis/utils/email-helper";

const searchEmailsSchema = z.object({
  query: z
    .string()
    .describe(
      "Search query with keywords. Use this for general searches like 'google', 'apollo', 'project update', etc. Do NOT use filter syntax here.",
    ),
  filters: z
    .object({
      isRead: z.boolean().optional().describe("Filter by read/unread status"),
      isStarred: z.boolean().optional().describe("Filter by starred status"),
      isArchived: z.boolean().optional().describe("Filter by archived status"),
      hasAttachments: z
        .boolean()
        .optional()
        .describe("Filter emails with attachments"),
      from: z
        .string()
        .optional()
        .describe(
          "Filter by COMPLETE sender email address only (e.g., 'john@company.com'). Do NOT use partial matches or domains.",
        ),
      to: z.string().optional().describe("Filter by recipient email address"),
      labels: z
        .array(z.string())
        .optional()
        .describe("Filter by email labels/tags"),
      dateFrom: z
        .string()
        .optional()
        .describe("Filter emails from this date (ISO format)"),
      dateTo: z
        .string()
        .optional()
        .describe("Filter emails until this date (ISO format)"),
    })
    .optional()
    .describe(
      "Optional filters - use ONLY when you have complete, specific information. For general searches, use keywords in the query field instead.",
    ),
  limit: z.number().default(5).describe("Number of results (max 10)"),
});

// Define the tool
export const searchEmailsTool = tool(
  async (input, runtime: ToolRuntime) => {
    console.log("inside searchEmailTool with ", input);
    const { userId } = runtime.context as { userId: string }; // Type assertion for context
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
      "Search through user's emails. Use the 'query' field for keyword searches like 'google', 'apollo', 'project update'. Use 'filters' ONLY for complete, specific information like exact email addresses or date ranges.",
    schema: searchEmailsSchema,
  },
);
