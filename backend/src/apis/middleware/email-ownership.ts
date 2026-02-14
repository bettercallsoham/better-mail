import { Request, Response, NextFunction } from "express";
import { getUserEmails } from "../utils/email-helper";
import { logger } from "../../shared/utils/logger";

/**
 * Middleware to verify that the user owns the email account they're trying to access
 * Expects emailAddress in req.body
 */
export const verifyEmailOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user?.id;
    const emailAddress = req.body.emailAddress;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!emailAddress) {
      return res.status(400).json({
        success: false,
        message: "emailAddress is required",
      });
    }

    // Verify user owns this email account
    const { emails, error } = await getUserEmails(userId, emailAddress);

    if (error || emails.length === 0) {
      logger.warn(
        `User ${userId} attempted to access email ${emailAddress} without permission`,
      );
      return res.status(403).json({
        success: false,
        message: error || "You don't have access to this email account",
      });
    }

    // Email ownership verified, continue to controller
    next();
  } catch (error: any) {
    logger.error("Email ownership verification error:", {
      error: error.message,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to verify email ownership",
    });
  }
};
