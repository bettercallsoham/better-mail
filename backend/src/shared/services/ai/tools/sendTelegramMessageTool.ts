import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { TelegramService } from "../../../../modules/telegram/telegram.service";

const sendTelegramSchema = z.object({
  message: z
    .string()
    .describe(
      "The message to send. Use HTML tags for formatting: <b>bold</b>, <i>italic</i>, and <a href='url'>links</a>. " +
        "Do NOT use Markdown. Standard characters like ( ) . ! - are safe and do NOT need escaping. use emojis and proper distinguish for better UX ",
    ),
});

export const sendTelegramMessageTool = tool(
  async (input, config) => {
    const userId = config.configurable?.userId;

    if (!userId) {
      console.error("❌ No userId found in tool config!");
      return "Error: User identity missing. Message not sent.";
    }

    const telegramService = new TelegramService();

    try {
      await telegramService.sendMessage(userId, input.message);

      return JSON.stringify({
        success: true,
        summary: "Notification sent to user's Telegram successfully.",
      });
    } catch (e: any) {
      console.error("❌ Failed to send Telegram message:", e.message);
      return `Failed to send Telegram message: ${e.message}`;
    }
  },
  {
    name: "send_telegram_message",
    description:
      "Send a direct HTML-formatted notification or alert to the user's connected Telegram account.",
    schema: sendTelegramSchema,
  },
);
