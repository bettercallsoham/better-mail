import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
const { JWT_SECRET } = process.env;
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { User } from "../../shared/models";
import { GoogleOAuthService } from "../services/oauth/google-oauth.service";
import { OutlookOAuthService } from "../services/oauth/outlook-oauth.service";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export const connectGmail = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User doesn't exists",
      });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User doesn't exists",
      });
    }

    const url = GoogleOAuthService.buildAuthUrl("EMAIL");
    res.redirect(url);
  },
  "connectGmail"
);

export const connectOutlook = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User doesn't exists",
      });
    }

    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User doesn't exists",
      });
    }

    const url = OutlookOAuthService.buildAuthUrl("EMAIL");
    res.redirect(url.url);
  },
  "connectGmail"
);
