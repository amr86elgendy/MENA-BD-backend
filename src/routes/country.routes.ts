import { Router } from "express";
import { prisma } from "../config/db.js";

const router = Router();

/**
 * Get all active countries
 * Public endpoint - no auth required
 */
router.get("/", async (req, res) => {
  try {
    const countries = await prisma.country.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameAr: true,
      },
      orderBy: {
        nameEn: "asc",
      },
    });

    res.json({
      success: true,
      data: countries,
    });
  } catch (error: any) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});

export default router;
