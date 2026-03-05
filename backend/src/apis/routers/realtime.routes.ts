import { Request, Response, Router } from "express";
import { ConversationService } from "../../shared/services/elastic/conversation.service";
import { elasticClient } from "../../shared/config/elastic";
import { verifyAccessToken } from "../middleware/auth";
import { pusher } from "../../shared/config/pusher";
import { validateRealtimeAuth } from "../validators/auth.validator";

const router = Router();
const conversationService = new ConversationService(elasticClient);

router.post(
  "/auth",
  verifyAccessToken(),
  validateRealtimeAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { socket_id, channel_name } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      if (!socket_id || !channel_name) {
        return res.status(400).json({
          success: false,
          message: "Invalid socket or channel",
        });
      }


      const expectedNotificationChannel = `private-user-${userId}-notifications`;

      if (channel_name === expectedNotificationChannel) {
        const authResponse = pusher.authorizeChannel(socket_id, channel_name);
        return res.send(authResponse);
      }

      const conversationMatch = channel_name.match(
        /^private-user-(.+)-conversation-(.+)$/,
      );

      if (conversationMatch) {
        const channelUserId = conversationMatch[1];
        const conversationId = conversationMatch[2];

        if (channelUserId !== userId) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized channel access",
          });
        }

        const hasAccess = await conversationService.userOwnsConversation(
          userId,
          conversationId,
        );

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized conversation access",
          });
        }

        const authResponse = pusher.authorizeChannel(socket_id, channel_name);

        return res.send(authResponse);
      }

      // Simple private-{conversationId} pattern (used by AIEmitter + useConversationRealtime)
      const simpleConversationMatch = channel_name.match(
        /^private-([a-zA-Z0-9_-]+)$/,
      );

      if (simpleConversationMatch) {
        const conversationId = simpleConversationMatch[1];

        const hasAccess = await conversationService.userOwnsConversation(
          userId,
          conversationId,
        );

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized conversation access",
          });
        }

        const authResponse = pusher.authorizeChannel(socket_id, channel_name);
        return res.send(authResponse);
      }

      return res.status(403).json({
        success: false,
        message: "Channel not allowed",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Realtime auth failed",
      });
    }
  },
);

export default router;
