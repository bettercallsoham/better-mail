import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
const { JWT_SECRET } = process.env;
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { EmailAccount, SignupMethod, User } from "../../shared/models";
import axios from "axios";
import { GoogleOAuthService } from "../services/oauth/google-oauth.service";
import { OutlookOAuthService } from "../services/oauth/outlook-oauth.service";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export const signUpWithEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password, fullName, avatar } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const SALT_ROUNDS = 10;
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser: User = await User.create({
      email,
      password: passwordHash,
      fullName,
      signupMethod: SignupMethod.EMAIL,
      avatar,
    });

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      message: "User created successfully",
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        signupMethod: newUser.signupMethod,
        avatar: newUser.avatar,
      },
    });
  },
  "createUser"
);

export const loginWithEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password!);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        signupMethod: user.signupMethod,
        avatar: user.avatar,
      },
    });
  },
  "loginWithEmail"
);

export const updateProfileWithEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { fullName, email, currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    if (newPassword) {
      const isCurrentPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password!
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      const SALT_ROUNDS = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      user.password = newPasswordHash;
    }

    if (fullName) user.fullName = fullName;
    if (email) user.email = email;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        signupMethod: user.signupMethod,
        avatar: user.avatar,
      },
    });
  },
  "updateProfileWithEmail"
);

export const getUserDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User details retrieved successfully",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        signupMethod: user.signupMethod,
        avatar: user.avatar,
      },
    });
  },
  "getUserDetails"
);

export const googleLogin = asyncHandler(async (_req, res) => {
  const url = GoogleOAuthService.buildAuthUrl("AUTH");
  res.redirect(url);
}, "googleLogin");

export const googleCallback = asyncHandler(async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    return res
      .status(400)
      .json({ success: false, message: "Authorization code missing" });
  }

  const tokens = await GoogleOAuthService.exchangeCode(code);
  const identity = await GoogleOAuthService.verifyIdToken(tokens.id_token);

  let user = await User.findOne({ where: { googleId: identity.googleId } });

  if (!user) {
    user = await User.findOne({ where: { email: identity.email } });
  }

  if (!user) {
    user = await User.create({
      email: identity.email,
      fullName: identity.fullName,
      avatar: identity.avatar,
      signupMethod: SignupMethod.GOOGLE,
      googleId: identity.googleId,
    });
  }

  if (user.signupMethod !== SignupMethod.GOOGLE) {
    return res.status(400).json({
      success: false,
      message: "Account exists with email/password login",
    });
  }

  if (tokens.refresh_token) {
    await EmailAccount.upsert({
      user_id: user.id,
      provider: "google",
      email: identity.email,
      refresh_token: tokens.access_token,
    });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET!, { expiresIn: "7d" });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      signupMethod: user.signupMethod,
      avatar: user.avatar,
    },
  });
}, "googleCallback");

export const outlookLogin = asyncHandler(async (_req, res) => {
  const url = OutlookOAuthService.buildAuthUrl("AUTH");
  res.redirect(url);
}, "outlookLogin");

export const outlookCallback = asyncHandler(async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Authorization code missing",
    });
  }

  const tokens = await OutlookOAuthService.exchangeCode(code);
  const identity = OutlookOAuthService.parseIdToken(tokens.id_token);

  let user = await User.findOne({
    where: { microsoftId: identity.outlookId },
  });

  if (!user) {
    user = await User.findOne({
      where: { email: identity.email },
    });
  }

  if (!user) {
    user = await User.create({
      email: identity.email,
      fullName: identity.fullName,
      avatar: "",
      signupMethod: SignupMethod.MICROSOFT,
      microsoftId: identity.outlookId,
      refreshToken:tokens.refresh_token
    });

  }

  if (user.signupMethod !== SignupMethod.MICROSOFT) {
    return res.status(400).json({
      success: false,
      message: "Account exists with different signup method",
    });
  }

  await EmailAccount.upsert({
    user_id: user.id,
    provider: "MICROSOFT",
    email: identity.email,
    refresh_token: tokens.refresh_token,
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET!, {
    expiresIn: "7d",
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      signupMethod: user.signupMethod,
      avatar: user.avatar,
    },
  });
}, "outlookCallback");
