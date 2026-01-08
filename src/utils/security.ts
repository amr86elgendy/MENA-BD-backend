import crypto from "crypto";

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
  LOGIN_ATTEMPTS: 5, // Max login attempts per window
  LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutes
  REFRESH_ATTEMPTS: 10, // Max refresh attempts per window
  REFRESH_WINDOW: 60 * 1000, // 1 minute
};

/**
 * Password validation rules
 */
export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false, // Set to true for stronger passwords
};

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_RULES.MIN_LENGTH) {
    errors.push(
      `Password must be at least ${PASSWORD_RULES.MIN_LENGTH} characters long`
    );
  }

  if (PASSWORD_RULES.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (PASSWORD_RULES.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (PASSWORD_RULES.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (
    PASSWORD_RULES.REQUIRE_SPECIAL &&
    !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
  ) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: any): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Get user agent from request
 */
export function getUserAgent(req: any): string {
  return req.headers["user-agent"] || "unknown";
}

/**
 * Generate secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Hash a value (for rate limiting keys, etc.)
 */
export function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

