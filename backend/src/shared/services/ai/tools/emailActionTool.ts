import { tool } from "langchain";
import { z } from "zod";

const emailActionSchema = z.object({
  actionType: z.enum(["star", "unstar", "delete", "archive", "read", "unread"]),
  messageIds: z.array(z.string()),
  description: z
    .string()
    .describe(
      "Brief description of what is being done, e.g., 'star 5 emails from DigitalOcean'",
    ),
});

export const emailActionsTool = tool(
  async (input) => {
    const { actionType, messageIds, description } = input;

    const SAFE_ACTIONS = ["star", "unstar", "read", "unread"];
    const isDangerous = !SAFE_ACTIONS.includes(actionType);

    if (isDangerous) {
      console.log(
        `[HITL Interruption] Action: ${actionType} requested for IDs:`,
        messageIds,
      );

      return JSON.stringify({
        requiresConfirmation: true,
        actionType,
        messageIds,
        description,
        status: "pending_approval",
      });
    }

    console.log(`[Auto-Executing] ${actionType.toUpperCase()} on:`, messageIds);

    return JSON.stringify({
      requiresConfirmation: false,
      status: "success",
      message: `Successfully performed ${actionType} on ${messageIds.length} emails.`,
    });
  },
  {
    name: "email_actions",
    description:
      "Perform actions like star, unstar, delete, or archive on specific email message IDs. Use this AFTER searching for emails.",
    schema: emailActionSchema,
  },
);
