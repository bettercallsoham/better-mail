import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
const { JWT_SECRET } = process.env;
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { SignupMethod, User } from "../../shared/models";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID!);

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

export const googleLogin = asyncHandler(
  async (_req: Request, res: Response) => {
    const redirectUri = encodeURIComponent(process.env.GOOGLE_REDIRECT_URI!);

    const scope = encodeURIComponent("openid email profile");

    const googleAuthUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${process.env.GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=${scope}` +
      `&access_type=offline` +
      `&prompt=consent`;

    res.redirect(googleAuthUrl);
  },
  "googleLogin"
);

export const googleCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const code = req.query.code as string;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Authorization code missing",
      });
    }

    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { id_token } = tokenResponse.data;

    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email_verified) {
      return res.status(401).json({
        success: false,
        message: "Google email not verified",
      });
    }

    let user = await User.findOne({
      where: { googleId: payload.sub },
    });

    if (!user) {
      user = await User.findOne({
        where: { email: payload.email },
      });
    }

    if (!user) {
      user = await User.create({
        email: payload.email!,
        fullName: payload.name!,
        avatar: payload.picture || "",
        signupMethod: SignupMethod.GOOGLE,
        googleId: payload.sub,
      });
    }

    if (user.signupMethod !== SignupMethod.GOOGLE) {
      return res.status(400).json({
        success: false,
        message: "Account exists with email/password login",
      });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET!, {
      expiresIn: "7d",
    });

    res.status(200).json({
      success: true,
      message: "Google login successful",
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
  "googleCallback"
);
