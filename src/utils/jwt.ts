import jwt from "jsonwebtoken";
import crypto from "crypto";

let ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
let REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// Token expiration times (configurable via env)
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "15m"; // Default: 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d"; // Default: 7 days

// JWT signing options
const JWT_ISSUER = process.env.JWT_ISSUER || "find-a-company-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "find-a-company-client";

const ACCESS_TOKEN_OPTIONS = {
  expiresIn: ACCESS_TOKEN_EXPIRY,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
} as jwt.SignOptions;

const REFRESH_TOKEN_OPTIONS = {
  expiresIn: REFRESH_TOKEN_EXPIRY,
  issuer: JWT_ISSUER,
  audience: JWT_AUDIENCE,
} as jwt.SignOptions;

export interface TokenPayload {
  userId: number;
  email: string;
  iat?: number; // Issued at
  exp?: number; // Expiration
  iss?: string; // Issuer
  aud?: string; // Audience
}

export interface RefreshTokenPayload extends TokenPayload {
  tokenId: number;
  jti?: string; // JWT ID for token tracking
}

export interface TokenVerificationResult {
  valid: boolean;
  payload?: TokenPayload | RefreshTokenPayload;
  error?: string;
  expired?: boolean;
}

/**
 * Generate a cryptographically secure random string for token IDs
 */
export function generateTokenId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate access token (short-lived)
 * @param payload - Token payload containing userId and email
 * @returns JWT access token string
 */
export function generateAccessToken(payload: TokenPayload): string {
  // JWT_SECRET is guaranteed to be set at this point (either from env or default)
  const tokenPayload: TokenPayload = {
    userId: payload.userId,
    email: payload.email,
  };

  return jwt.sign(tokenPayload, ACCESS_TOKEN_SECRET!, ACCESS_TOKEN_OPTIONS);
}

/**
 * Generate refresh token (long-lived)
 * @param payload - Refresh token payload containing userId, email, and tokenId
 * @returns JWT refresh token string
 */
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  // JWT_REFRESH_SECRET is guaranteed to be set at this point (either from env or default)
  const tokenPayload: RefreshTokenPayload = {
    userId: payload.userId,
    email: payload.email,
    tokenId: payload.tokenId,
    jti: generateTokenId(), // Add unique token ID for tracking
  };

  return jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET!, REFRESH_TOKEN_OPTIONS);
}

/**
 * Verify access token with detailed error handling
 * @param token - JWT access token string
 * @returns Token payload if valid
 * @throws Error with specific message if invalid
 */
export function verifyAccessToken(token: string): TokenPayload {
  // JWT_SECRET is guaranteed to be set at this point
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET!, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as unknown as TokenPayload;

    // Validate required fields
    if (!decoded.userId || !decoded.email) {
      throw new Error("Invalid token payload: missing required fields");
    }

    return decoded;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Access token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid access token");
    } else if (error.name === "NotBeforeError") {
      throw new Error("Token not active yet");
    } else {
      throw new Error(error.message || "Token verification failed");
    }
  }
}

/**
 * Verify refresh token with detailed error handling
 * @param token - JWT refresh token string
 * @returns Refresh token payload if valid
 * @throws Error with specific message if invalid
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  // JWT_REFRESH_SECRET is guaranteed to be set at this point
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET!, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as unknown as RefreshTokenPayload;

    // Validate required fields
    if (!decoded.userId || !decoded.email || !decoded.tokenId) {
      throw new Error("Invalid refresh token payload: missing required fields");
    }

    return decoded;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Refresh token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid refresh token");
    } else if (error.name === "NotBeforeError") {
      throw new Error("Token not active yet");
    } else {
      throw new Error(error.message || "Token verification failed");
    }
  }
}

/**
 * Verify token without throwing (returns result object)
 * Useful for optional authentication scenarios
 */
export function verifyAccessTokenSafe(token: string): TokenVerificationResult {
  try {
    const payload = verifyAccessToken(token);
    return { valid: true, payload };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message,
      expired: error.message?.includes("expired"),
    };
  }
}

/**
 * Decode token without verification (for debugging/logging only)
 * WARNING: Do not use for authentication - this does not verify the signature
 */
export function decodeToken(token: string): any {
  return jwt.decode(token, { complete: true });
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired (without verification)
 */
export function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  return expiration < new Date();
}

/**
 * Generate a secure random token for password setup
 * @returns A cryptographically secure random token string
 */
export function generatePasswordSetupToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
