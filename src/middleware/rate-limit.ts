import { Request, Response, NextFunction } from "express";

// Simple in-memory rate limiter (use Redis in production)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

/**
 * Simple rate limiting middleware
 * In production, use Redis or a dedicated rate limiting service
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}) {
  const { windowMs, max, keyGenerator, message } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : req.ip || req.connection?.remoteAddress || "unknown";

    const now = Date.now();
    const record = rateLimitStore[key];

    // Clean up expired records periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      Object.keys(rateLimitStore).forEach((k) => {
        if (rateLimitStore[k].resetTime < now) {
          delete rateLimitStore[k];
        }
      });
    }

    if (!record || record.resetTime < now) {
      // Create new record
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return next();
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        error: message || "Too many requests, please try again later",
        retryAfter,
      });
    }

    // Increment count
    record.count++;
    next();
  };
}

/**
 * Rate limiter for login attempts
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  keyGenerator: (req) => {
    const email = req.body?.email || "unknown";
    return `login:${req.ip}:${email}`;
  },
  message: "Too many login attempts. Please try again later.",
});

/**
 * Rate limiter for refresh token requests
 */
export const refreshRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many token refresh requests. Please try again later.",
});

/**
 * Rate limiter for registration
 */
export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: "Too many registration attempts. Please try again later.",
});

/**
 * Rate limiter for forgot password requests
 */
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per email/IP
  keyGenerator: (req) => {
    const email = req.body?.email || "unknown";
    return `forgot-password:${req.ip}:${email}`;
  },
  message: "Too many password reset requests. Please try again later.",
});

/**
 * Rate limiter for reset password requests
 */
export const resetPasswordRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many password reset attempts. Please try again later.",
});
