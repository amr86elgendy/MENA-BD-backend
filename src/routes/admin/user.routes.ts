import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { hashPassword } from "../../utils/password";
import { generatePasswordSetupToken } from "../../utils/jwt";
import { sendPasswordSetupEmail } from "../../services/email.service";

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// GET /api/users - Get all users with pagination and filtering (Admin only)
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const isVerified = req.query.isVerified
      ? req.query.isVerified === "true"
      : undefined;
    const role = req.query.role as string | undefined;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }
    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }
    if (role) {
      where.role = role;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        // Don't return password
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/:id - Get a single user by ID (Admin only)
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
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
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/users - Create a new user (Admin only)
router.post("/", async (req, res) => {
  try {
    const { email, name, password, role, isVerified } = req.body;

    if (!email || !name || !password) {
      return res
        .status(400)
        .json({ error: "Email, name, and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || "USER",
        isVerified: isVerified ?? false,
      },
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

    res.status(201).json(user);
  } catch (error: any) {
    console.error("Error creating user:", error);
    if (error.code === "P2002") {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Failed to create user" });
    }
  }
});

// PUT /api/users/:id - Update a user (Admin only)
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email, name, password, role, isVerified } = req.body;

    const updateData: any = {};
    if (email !== undefined) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (password !== undefined) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters" });
      }
      updateData.password = await hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    res.json(user);
  } catch (error: any) {
    console.error("Error updating user:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "User not found" });
    } else if (error.code === "P2002") {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Failed to update user" });
    }
  }
});

// DELETE /api/users/:id - Delete a user (Admin only)
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
});

// PUT /api/users/:id/verify - Verify a user and send password setup email (Admin only)
router.put("/:id/verify", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // First, get the user to check if they exist
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate password setup token
    const passwordSetupToken = generatePasswordSetupToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    // Update user with verification status and password setup token
    const user = await prisma.user.update({
      where: { id },
      data: {
        isVerified: true,
        passwordSetupToken,
        passwordSetupTokenExpiresAt: expiresAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
      },
    });

    // Send password setup email
    try {
      await sendPasswordSetupEmail(
        user.email,
        existingUser.name,
        passwordSetupToken
      );
    } catch (emailError: any) {
      console.error("Error sending password setup email:", emailError);
      // Don't fail the verification if email fails, but log it
      // You might want to handle this differently based on your requirements
      return res.status(500).json({
        error: "User verified but failed to send password setup email",
        code: "EMAIL_SEND_FAILED",
        user,
        details: emailError.message,
      });
    }

    res.json({
      message: "User verified successfully. Password setup email sent.",
      user,
    });
  } catch (error: any) {
    console.error("Error verifying user:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(500).json({ error: "Failed to verify user" });
    }
  }
});

export default router;
