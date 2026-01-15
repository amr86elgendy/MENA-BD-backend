import { Router, Request, Response } from "express";
import { prisma } from "../config/db";
import { hashPassword, comparePassword } from "../utils/password";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
  type RefreshTokenPayload,
} from "../utils/jwt";
import { authenticate } from "../middleware/auth";
import {
  validatePassword,
  validateEmail,
  sanitizeEmail,
  getClientIp,
  getUserAgent,
} from "../utils/security";
import { sendPasswordResetEmail } from "../services/email.service";
import { generatePasswordSetupToken } from "../utils/jwt";
import {
  loginRateLimit,
  refreshRateLimit,
  registerRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
} from "../middleware/rate-limit";

const router = Router();

// Cookie options for production
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: (process.env.NODE_ENV === "production" ? "strict" : "lax") as
    | "strict"
    | "lax"
    | "none",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
  domain: process.env.COOKIE_DOMAIN || undefined,
});

/**
 * POST /api/auth/register
 * Register a new user (email only, waiting for admin verification)
 */
router.post(
  "/register",
  registerRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;

      // Validation
      if (!email || !name) {
        return res.status(400).json({
          error: "Email and name are required",
          code: "MISSING_FIELDS",
        });
      }

      // Validate email format
      const sanitizedEmail = sanitizeEmail(email);
      if (!validateEmail(sanitizedEmail)) {
        return res.status(400).json({
          error: "Invalid email format",
          code: "INVALID_EMAIL",
        });
      }

      // Validate name
      if (name.trim().length < 2) {
        return res.status(400).json({
          error: "Name must be at least 2 characters long",
          code: "INVALID_NAME",
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "Email already registered",
          code: "EMAIL_EXISTS",
        });
      }

      // Create user without password (will be set after admin verification)
      const user = await prisma.user.create({
        data: {
          email: sanitizedEmail,
          name: name.trim(),
          password: null, // Password will be set after admin verification
          isVerified: false, // Waiting for admin verification
        },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        message: "Registration successful. Please wait for admin verification.",
        user,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Failed to register user",
        code: "REGISTRATION_ERROR",
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login user and return access + refresh tokens
 */
router.post("/login", loginRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS",
      });
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
    });

    // Use generic error message to prevent user enumeration
    if (!user) {
      // Add small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 100));
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      // Add small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 100));
      return res.status(403).json({
        error: "Account not verified. Please wait for admin verification.",
        code: "ACCOUNT_NOT_VERIFIED",
      });
    }

    // Check if user has set up their password
    if (!user.password) {
      // Add small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 100));
      return res.status(403).json({
        error:
          "Password not set. Please check your email for password setup instructions.",
        code: "PASSWORD_NOT_SET",
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      // Add small delay to prevent timing attacks
      await new Promise((resolve) => setTimeout(resolve, 100));
      return res.status(401).json({
        error: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);

    // Create refresh token record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    // Create refresh token record
    const refreshTokenRecord = await prisma.refreshToken.create({
      data: {
        token: "temp", // Temporary, will be updated
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    const refreshTokenPayload: RefreshTokenPayload = {
      userId: user.id,
      email: user.email,
      tokenId: refreshTokenRecord.id,
    };

    const refreshToken = generateRefreshToken(refreshTokenPayload);

    // Update with the actual JWT token
    await prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { token: refreshToken },
    });

    const cookieOptions = getCookieOptions();

    // Set cookies
    // res.cookie("accessToken", accessToken, {
    //   ...cookieOptions,
    //   maxAge: 15 * 60 * 1000, // 15 minutes
    // });
    res.cookie("refreshToken", refreshToken, cookieOptions);

    // Return tokens (also in response body for clients that don't use cookies)
    res.json({
      message: "Login successful",
      accessToken,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Failed to login",
      code: "LOGIN_ERROR",
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Implements token rotation for better security
 */
router.post(
  "/refresh",
  refreshRateLimit,
  async (req: Request, res: Response) => {
    try {
      // Get refresh token from body, cookie, or header
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: "Refresh token required",
          code: "NO_REFRESH_TOKEN",
        });
      }

      // Verify refresh token
      let payload: RefreshTokenPayload;
      try {
        payload = verifyRefreshToken(refreshToken as string);
      } catch (error: any) {
        return res.status(401).json({
          error: "Invalid or expired refresh token",
          code: "INVALID_REFRESH_TOKEN",
        });
      }

      // Check if refresh token exists in database and is not revoked
      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { id: payload.tokenId },
        include: { user: true },
      });

      if (!tokenRecord) {
        return res.status(401).json({
          error: "Refresh token not found",
          code: "TOKEN_NOT_FOUND",
        });
      }

      if (tokenRecord.revoked) {
        // Revoke all tokens for this user as a security measure
        await prisma.refreshToken.updateMany({
          where: {
            userId: payload.userId,
            revoked: false,
          },
          data: {
            revoked: true,
            revokedAt: new Date(),
          },
        });

        return res.status(401).json({
          error: "Refresh token has been revoked",
          code: "TOKEN_REVOKED",
        });
      }

      if (tokenRecord.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.refreshToken.delete({
          where: { id: payload.tokenId },
        });

        return res.status(401).json({
          error: "Refresh token has expired",
          code: "TOKEN_EXPIRED",
        });
      }

      // Verify user still exists
      if (!tokenRecord.user) {
        await prisma.refreshToken.delete({
          where: { id: payload.tokenId },
        });
        return res.status(401).json({
          error: "User not found",
          code: "USER_NOT_FOUND",
        });
      }

      // Generate new access token
      const tokenPayload: TokenPayload = {
        userId: payload.userId,
        email: payload.email,
      };

      const newAccessToken = generateAccessToken(tokenPayload);

      // Token rotation: Delete old refresh token and create new one
      await prisma.refreshToken.delete({
        where: { id: payload.tokenId },
      });

      // Create new refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const ipAddress = getClientIp(req);
      const userAgent = getUserAgent(req);

      const newRefreshTokenRecord = await prisma.refreshToken.create({
        data: {
          token: "temp",
          userId: payload.userId,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      const newRefreshTokenPayload: RefreshTokenPayload = {
        userId: payload.userId,
        email: payload.email,
        tokenId: newRefreshTokenRecord.id,
      };

      const newRefreshToken = generateRefreshToken(newRefreshTokenPayload);

      await prisma.refreshToken.update({
        where: { id: newRefreshTokenRecord.id },
        data: { token: newRefreshToken },
      });

      const cookieOptions = getCookieOptions();

      res.cookie("refreshToken", newRefreshToken, cookieOptions);

      res.json({
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
      });
    } catch (error: any) {
      console.error("Refresh token error:", error);
      res.status(500).json({
        error: "Failed to refresh token",
        code: "REFRESH_ERROR",
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout user and revoke refresh token
 */
router.post("/logout", authenticate, async (req: Request, res: Response) => {
  try {
    const refreshToken =
      req.body.refreshToken ||
      req.cookies?.refreshToken ||
      req.headers["x-refresh-token"];

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken as string);
        // Revoke specific refresh token
        await prisma.refreshToken.update({
          where: { id: payload.tokenId },
          data: {
            revoked: true,
            revokedAt: new Date(),
          },
        });
      } catch (error) {
        // Token might be invalid, but we still want to clear cookies
        console.debug("Invalid refresh token during logout:", error);
      }
    }

    // Clear cookies
    res.clearCookie("accessToken", {
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    res.clearCookie("refreshToken", {
      path: "/",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    res.json({ message: "Logged out successfully" });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: "Failed to logout",
      code: "LOGOUT_ERROR",
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    res.json({ user });
  } catch (error: any) {
    console.error("Get user error:", error);
    res.status(500).json({
      error: "Failed to get user",
      code: "GET_USER_ERROR",
    });
  }
});

/**
 * POST /api/auth/logout-all
 * Logout from all devices (revoke all refresh tokens)
 */
router.post(
  "/logout-all",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      await prisma.refreshToken.updateMany({
        where: {
          userId: req.user!.id,
          revoked: false,
        },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });

      res.clearCookie("accessToken", {
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      res.clearCookie("refreshToken", {
        path: "/",
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      res.json({ message: "Logged out from all devices successfully" });
    } catch (error: any) {
      console.error("Logout all error:", error);
      res.status(500).json({
        error: "Failed to logout from all devices",
        code: "LOGOUT_ALL_ERROR",
      });
    }
  }
);

/**
 * POST /api/auth/setup-password
 * Set up password using password setup token
 */
router.post("/setup-password", async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    // Validation
    if (!token || !password) {
      return res.status(400).json({
        error: "Token and password are required",
        code: "MISSING_FIELDS",
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: "Password does not meet requirements",
        code: "WEAK_PASSWORD",
        details: passwordValidation.errors,
      });
    }

    // Find user by password setup token
    const user = await prisma.user.findUnique({
      where: { passwordSetupToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        passwordSetupToken: true,
        passwordSetupTokenExpiresAt: true,
        isVerified: true,
      },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }

    // Check if token has expired
    if (
      !user.passwordSetupTokenExpiresAt ||
      user.passwordSetupTokenExpiresAt < new Date()
    ) {
      // Clear expired token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordSetupToken: null,
          passwordSetupTokenExpiresAt: null,
        },
      });

      return res.status(400).json({
        error: "Token has expired. Please contact an administrator.",
        code: "TOKEN_EXPIRED",
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({
        error: "User account is not verified",
        code: "USER_NOT_VERIFIED",
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Update user with password and clear token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordSetupToken: null,
        passwordSetupTokenExpiresAt: null,
      },
    });

    res.json({
      message: "Password set up successfully. You can now login.",
    });
  } catch (error: any) {
    console.error("Password setup error:", error);
    res.status(500).json({
      error: "Failed to set up password",
      code: "PASSWORD_SETUP_ERROR",
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset (sends email with reset token)
 */
router.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      // Validation
      if (!email) {
        return res.status(400).json({
          error: "Email is required",
          code: "MISSING_EMAIL",
        });
      }

      // Validate email format
      const sanitizedEmail = sanitizeEmail(email);
      if (!validateEmail(sanitizedEmail)) {
        // Return success even if email is invalid to prevent user enumeration
        return res.json({
          message:
            "If an account exists with this email, a password reset link has been sent.",
        });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
          password: true,
        },
      });

      // Return success even if user doesn't exist to prevent user enumeration
      if (!user) {
        return res.json({
          message:
            "If an account exists with this email, a password reset link has been sent.",
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.json({
          message:
            "If an account exists with this email, a password reset link has been sent.",
        });
      }

      // Check if user has a password set
      if (!user.password) {
        return res.json({
          message:
            "If an account exists with this email, a password reset link has been sent.",
        });
      }

      // Generate password reset token
      const passwordResetToken = generatePasswordSetupToken(); // Reuse the same function
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken,
          passwordResetTokenExpiresAt: expiresAt,
        },
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail(user.email, user.name, passwordResetToken);
      } catch (emailError: any) {
        console.error("Error sending password reset email:", emailError);
        // Clear the token if email fails
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: null,
            passwordResetTokenExpiresAt: null,
          },
        });
        throw emailError;
      }

      // Always return success message to prevent user enumeration
      res.json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      // Still return success to prevent user enumeration
      res.json({
        message:
          "If an account exists with this email, a password reset link has been sent.",
      });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 */
router.post(
  "/reset-password",
  resetPasswordRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      // Validation
      if (!token || !password) {
        return res.status(400).json({
          error: "Token and password are required",
          code: "MISSING_FIELDS",
        });
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          error: "Password does not meet requirements",
          code: "WEAK_PASSWORD",
          details: passwordValidation.errors,
        });
      }

      // Find user by password reset token
      const user = await prisma.user.findUnique({
        where: { passwordResetToken: token },
        select: {
          id: true,
          email: true,
          name: true,
          passwordResetToken: true,
          passwordResetTokenExpiresAt: true,
          isVerified: true,
        },
      });

      if (!user) {
        return res.status(400).json({
          error: "Invalid or expired token",
          code: "INVALID_TOKEN",
        });
      }

      // Check if token has expired
      if (
        !user.passwordResetTokenExpiresAt ||
        user.passwordResetTokenExpiresAt < new Date()
      ) {
        // Clear expired token
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: null,
            passwordResetTokenExpiresAt: null,
          },
        });

        return res.status(400).json({
          error: "Token has expired. Please request a new password reset.",
          code: "TOKEN_EXPIRED",
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        return res.status(400).json({
          error: "User account is not verified",
          code: "USER_NOT_VERIFIED",
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update user with new password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetTokenExpiresAt: null,
        },
      });

      // Revoke all refresh tokens for security (force re-login)
      await prisma.refreshToken.updateMany({
        where: {
          userId: user.id,
          revoked: false,
        },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });

      res.json({
        message:
          "Password reset successfully. Please login with your new password.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({
        error: "Failed to reset password",
        code: "PASSWORD_RESET_ERROR",
      });
    }
  }
);

export default router;
