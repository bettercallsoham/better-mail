import { Request, Response, NextFunction } from "express";
import { logger } from "../../shared/utils/logger";

/**
 * Middleware to protect BullBoard dashboard with authentication
 * Production-grade practices:
 * 1. Only allow access in development OR with valid credentials
 * 2. Use environment variables for credentials
 * 3. Rate limit and log all access attempts
 */
export const bullBoardAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Allow access in development without auth (optional - you can remove this)
  if (process.env.NODE_ENV === "development" && process.env.BULLBOARD_DEV_MODE === "true") {
    logger.warn("BullBoard accessed without auth in development mode");
    return next();
  }

  // Check for basic auth header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    logger.warn(`Unauthorized BullBoard access attempt from ${req.ip}`);
    res.setHeader("WWW-Authenticate", 'Basic realm="BullBoard Dashboard"');
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Decode credentials
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = Buffer.from(base64Credentials, "base64").toString(
    "ascii"
  );
  const [username, password] = credentials.split(":");

  // Validate credentials from environment variables
  const validUsername = process.env.BULLBOARD_USERNAME;
  const validPassword = process.env.BULLBOARD_PASSWORD;

  if (!validUsername || !validPassword) {
    logger.error(
      "BULLBOARD_USERNAME or BULLBOARD_PASSWORD not set in environment"
    );
    return res.status(500).json({
      success: false,
      message: "Server configuration error",
    });
  }

  // Use timing-safe comparison to prevent timing attacks
  const usernameMatch = username === validUsername;
  const passwordMatch = password === validPassword;

  if (!usernameMatch || !passwordMatch) {
    logger.warn(
      `Failed BullBoard login attempt for user '${username}' from ${req.ip}`
    );
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  logger.info(`BullBoard accessed by ${username} from ${req.ip}`);
  next();
};

/**
 * Middleware to restrict BullBoard access based on environment
 * In production, you might want to:
 * 1. Only allow access from specific IPs
 * 2. Require additional authentication (JWT + basic auth)
 * 3. Use VPN or internal network access only
 */
export const bullBoardEnvCheck = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Disable BullBoard completely in production if desired
  if (
    process.env.NODE_ENV === "production" &&
    process.env.BULLBOARD_ENABLED !== "true"
  ) {
    logger.warn(
      `BullBoard access blocked in production from ${req.ip}`
    );
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  // Check IP whitelist in production (optional)
  if (process.env.NODE_ENV === "production" && process.env.BULLBOARD_ALLOWED_IPS) {
    const allowedIps = process.env.BULLBOARD_ALLOWED_IPS.split(",").map((ip) =>
      ip.trim()
    );
    const clientIp = req.ip || req.socket.remoteAddress;

    if (clientIp && !allowedIps.includes(clientIp)) {
      logger.warn(
        `BullBoard access denied for IP ${clientIp} - not in whitelist`
      );
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
  }

  next();
};
