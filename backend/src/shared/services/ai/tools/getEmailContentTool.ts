import { tool } from "langchain";
import { z } from "zod";
import { elasticClient } from "../../../config/elastic";
import { gpt4oMiniLLM } from "../../../config/llm";
import { UnifiedEmailDocument } from "../../elastic/interface";

const BODY_CHAR_LIMIT = 3000;

const getEmailContentSchema = z.object({
  emailIds: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("One or more emailIds (from search results) to read in full"),
});

async function summarizeOverflow(overflow: string): Promise<string> {
  const response = await gpt4oMiniLLM.invoke([
    {
      role: "user",
      content: `Summarize the following email content concisely (2-4 sentences), preserving key facts, names, dates, and action items:\n\n${overflow}`,
    },
  ]);
  return typeof response.content === "string"
    ? response.content
    : String(response.content);
}

export const getEmailContentTool = tool(
  async (input, config) => {
    const userId = config.configurable?.userId;
    if (!userId) {
      return "Error: User identity could not be verified.";
    }

    try {
      const mgetResponse = await elasticClient.mget<UnifiedEmailDocument>({
        index: "emails_v1",
        ids: input.emailIds,
      });

      const results = await Promise.all(
        mgetResponse.docs.map(async (doc: any) => {
          if (!doc.found) {
            return { emailId: doc._id, error: "Email not found" };
          }

          const src: UnifiedEmailDocument = doc._source;
          const fullBody = src.bodyText || src.snippet || "";
          const bodyText = fullBody.slice(0, BODY_CHAR_LIMIT);
          const overflow =
            fullBody.length > BODY_CHAR_LIMIT
              ? fullBody.slice(BODY_CHAR_LIMIT)
              : null;

          let overflowSummary: string | undefined;
          if (overflow) {
            overflowSummary = await summarizeOverflow(overflow);
          }

          return {
            emailId: doc._id,
            threadId: src.threadId,
            subject: src.subject || "(No subject)",
            from: {
              name: src.from.name,
              email: src.from.email,
            },
            to: src.to?.map((r) => r.email).join(", "),
            cc: src.cc?.length
              ? src.cc.map((r) => r.email).join(", ")
              : undefined,
            receivedAt: src.receivedAt,
            isRead: src.isRead,
            isStarred: src.isStarred,
            labels: src.labels?.length ? src.labels : undefined,
            hasAttachments: src.hasAttachments,
            attachments: src.hasAttachments
              ? (src.attachments || []).map((a) => ({
                  name: a.name,
                  contentType: a.contentType,
                  size: a.size,
                }))
              : undefined,
            bodyText: bodyText || "(no body)",
            overflowSummary,
          };
        }),
      );

      return JSON.stringify({ emails: results });
    } catch (e: any) {
      return `Error fetching email content: ${e.message}`;
    }
  },
  {
    name: "get_email_content",
    description:
      "Fetch the full content of one or more emails by their emailId. Use this when the user asks what an email says, wants a summary of an email, or needs specific information from an email body. Requires emailIds from prior search results.",
    schema: getEmailContentSchema,
  },
);
