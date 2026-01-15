import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface UserToken {
  id: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserToken;
    }
  }
}

const { JWT_SECRET } = process.env;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

export const verifyAccessToken =
  () => (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.headers.authorization?.split(" ")[1] || req.cookies?.auth_token;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Token missing, please login again",
        });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

      if (!decoded || typeof decoded.userId !== "string") {
        return res.status(401).json({
          success: false,
          message: "Invalid token payload",
        });
      }

      req.user = {
        id: decoded.userId,
      };

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
  };
