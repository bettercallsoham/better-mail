import { tool } from "langchain";
import { z } from "zod";
import { elasticClient } from "../../../config/elastic";
import { ElasticsearchService } from "../../elastic/elastic.service";
import { getUserEmails } from "../../../../apis/utils/email-helper";
import { gpt4oMiniLLM } from "../../../config/llm";

const searchEmailsSchema = z.object({
  query: z
    .string()
    .describe("Keywords to find in email subject or body (e.g., 'invoice')"),
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

async function expandQuery(query: string): Promise<string[]> {
  try {
    const response = await gpt4oMiniLLM.invoke(
      `You expand email search queries.
Generate **4 short keyword variations** of the query using synonyms, related terms, or alternative phrasing.
Rules:
* 2–5 words each
* Focus on email content (subjects, receipts, notifications, etc.)
* Do NOT repeat the original query
* Return ONLY JSON: {"queries":["...", "...", "...", "..."]}

Query: "${query}"`,
      { response_format: { type: "json_object" } },
    );

    const text =
      typeof response.content === "string"
        ? response.content
        : ((response.content as any[])[0]?.text ?? "");

    const { queries } = JSON.parse(text) as { queries: string[] };

    if (!Array.isArray(queries) || !queries.length) throw new Error();

    return [query, ...queries.slice(0, 5)];
  } catch {
    return [query];
  }
}

export const searchEmailsTool = tool(
  async (input, config) => {
    const userId = config.configurable?.userId;
    if (!userId) return "Error: User identity could not be verified.";

    const elasticService = new ElasticsearchService(elasticClient);

    try {
      const { emails: emailAddresses, error } = await getUserEmails(userId);
      if (error || !emailAddresses.length)
        return "No email accounts connected. Please connect an account first.";

      const expandedQueries = await expandQuery(input.query);

      const result = await elasticService.searchEmails({
        emailAddresses,
        query: expandedQueries,
        size: Math.min(input.limit, 10),
        filters: input.filters || {},
      });

      const emails = result.emails.map((email: any) => {
        const fullBody: string = email.bodyText || "";
        return {
          emailId: email._id,
          threadId: email.threadId,
          subject: email.subject || "(No subject)",
          from: email.from?.email,
          to: email.to?.map((r: any) => r.email).join(", "),
          snippet: email.snippet,
          bodyText:
            fullBody.length > 600
              ? fullBody.slice(0, 600) + "…"
              : fullBody || undefined,
          receivedAt: email.receivedAt,
          isRead: email.isRead,
          isStarred: email.isStarred,
          hasAttachments: email.hasAttachments,
          attachmentNames: email.hasAttachments
            ? (email.attachments || []).map((a: any) => a.name).filter(Boolean)
            : undefined,
          labels: email.labels?.length ? email.labels : undefined,
        };
      });

      return JSON.stringify({
        total: result.total,
        emails,
        summary: `Found ${result.total} emails.`,
      });
    } catch (e: any) {
      return `Error searching emails: ${e.message}`;
    }
  },
  {
    name: "search_emails",
    description:
      "Search through user's emails. Use query for keywords, filters for specific metadata.",
    schema: searchEmailsSchema,
  },
);
