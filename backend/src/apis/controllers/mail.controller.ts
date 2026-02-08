import { EmailAccount } from "../../shared/models";
import { asyncHandler } from "../utils/asyncHandler";
import { Request, Response } from "express";

export const getConnectedMailboxes = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const EmailAccounts = await EmailAccount.findAll({
      where: {
        user_id: userId,
      },
      attributes: ["id", "email", "created_at"],
    });

    res.json({
      success: true,
      data: EmailAccounts,
    });
  },
  "getConnectedMailboxes",
);
