import { Request, Response, NextFunction } from "express";
import {
  verifyAccessToken,
  verifyAccessTokenSafe,
  isTokenExpired,
} from "../utils/jwt.js";
import { prisma } from "../config/db.js";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role?: string;
      };
    }
  }
}

/**
 * Get token from request (header OR cookie)
 * Priority: Authorization header > Cookie
 */
function extractToken(req: Request): string | null {
  // Check Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check cookies
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
}

/**
 * Middleware to authenticate requests using access token
 * Automatically attempts to refresh token if expired
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        error: "Authentication required",
        code: "NO_TOKEN",
      });
    }

    // Check if token is expired (quick check before verification)
    if (isTokenExpired(token)) {
      return res.status(401).json({
        error: "Access token has expired. Please refresh your token.",
        code: "TOKEN_EXPIRED",
      });
    }

    // Verify token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error: any) {
      return res.status(401).json({
        error: error.message || "Invalid or expired access token",
        code: "INVALID_TOKEN",
      });
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        error: "User not found or account has been deleted",
        code: "USER_NOT_FOUND",
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error: any) {
    console.error("Authentication error:", error);
    return res.status(500).json({
      error: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
}

/**
 * Optional middleware - doesn't fail if no token, but attaches user if valid token exists
 * Useful for endpoints that work both with and without authentication
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractToken(req);

    if (token) {
      // Use safe verification that doesn't throw
      const result = verifyAccessTokenSafe(token);

      if (result.valid && result.payload) {
        // Verify user still exists
        const user = await prisma.user.findUnique({
          where: { id: result.payload.userId },
          select: { id: true, email: true, role: true },
        });

        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
          };
        }
      }
    }
  } catch (error) {
    // Silently ignore errors for optional auth
    console.debug("Optional auth check failed:", error);
  }

  next();
}

/**
 * Middleware to ensure user is an admin
 * Must be used after authenticate middleware
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "NO_TOKEN",
      });
    }

    // Check if user role is cached in req.user
    if (req.user.role === "ADMIN") {
      return next();
    }

    // If role not cached, fetch from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        error: "Admin access required",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    // Cache role in req.user
    req.user.role = user.role;

    next();
  } catch (error: any) {
    console.error("Admin check error:", error);
    return res.status(500).json({
      error: "Failed to verify admin status",
      code: "AUTH_ERROR",
    });
  }
}

/**
 * Middleware to check if user is verified
 * Must be used after authenticate middleware
 */
export async function requireVerified(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
        code: "NO_TOKEN",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, isVerified: true },
    });

    if (!user) {
      return res.status(401).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Email verification required",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    next();
  } catch (error: any) {
    console.error("Verification check error:", error);
    return res.status(500).json({
      error: "Failed to verify user status",
      code: "AUTH_ERROR",
    });
  }
}
