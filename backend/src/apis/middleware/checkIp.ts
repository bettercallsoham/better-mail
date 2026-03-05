import { Request, Response, NextFunction } from "express";

const ALLOWED_IP = process.env.ALLOWED_IP;

if (!ALLOWED_IP) {
  throw new Error("ALLOWED IP's not enabled");
}

function normalizeIP(ip: string | undefined | null): string {
  if (!ip) return "";
  // Strip IPv4-mapped IPv6 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function getClientIP(req: Request): string {
  // 1. Cloudflare real IP (most trusted when behind CF)
  const cf = req.headers["cf-connecting-ip"];
  if (cf) return normalizeIP(Array.isArray(cf) ? cf[0] : cf);

  // 2. X-Real-IP set by nginx
  const realIp = req.headers["x-real-ip"];
  if (realIp) return normalizeIP(Array.isArray(realIp) ? realIp[0] : realIp);

  // 3. X-Forwarded-For — take the leftmost (original client) entry
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      .split(",")[0]
      .trim();
    return normalizeIP(first);
  }

  // 4. req.ip (Express-resolved, respects trust proxy setting)
  return normalizeIP(req.ip || req.socket.remoteAddress);
}

export function allowOnlyMyIP(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  console.log("ip", ip);

  if (ip !== ALLOWED_IP) {
    console.warn(`[SECURITY] Blocked IP ${ip} → ${req.originalUrl}`);

    return res.status(403).json({
      error: "Forbidden",
    });
  }

  next();
}
