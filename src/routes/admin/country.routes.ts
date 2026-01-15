import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/countries - Get all countries with pagination
router.get("/", async (req, res) => {
  try {
    const { page = "1", limit = "50", search, isActive } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search as string, mode: "insensitive" } },
        { nameEn: { contains: search as string, mode: "insensitive" } },
        { nameAr: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    const [countries, total] = await Promise.all([
      prisma.country.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.country.count({ where }),
    ]);

    res.json({
      success: true,
      data: countries,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ msg: "Failed to fetch countries" });
  }
});

// GET /api/admin/countries/:id - Get a single country
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const country = await prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }

    res.json({ success: true, data: country });
  } catch (error: any) {
    console.error("Error fetching country:", error);
    res.status(500).json({ msg: "Failed to fetch country" });
  }
});

// POST /api/admin/countries - Create a new country
router.post("/", async (req, res) => {
  try {
    const { code, nameEn, nameAr, isActive } = req.body;

    // Validation
    if (!code || !nameEn || !nameAr) {
      return res.status(400).json({
        msg: "Missing required fields: code, nameEn, nameAr",
      });
    }

    // Validate code format (ISO 3166-1 alpha-2: exactly 2 uppercase letters)
    if (typeof code !== "string" || code.length !== 2) {
      return res.status(400).json({
        error: "Country code must be exactly 2 characters (ISO 3166-1 alpha-2)",
      });
    }

    const country = await prisma.country.create({
      data: {
        code: code.toUpperCase(),
        nameEn,
        nameAr,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({ success: true, data: country });
  } catch (error: any) {
    console.error("Error creating country:", error);
    if (error.code === "P2002") {
      res.status(400).json({ msg: "Country code already exists" });
    } else {
      res.status(500).json({ msg: "Failed to create country" });
    }
  }
});

// PUT /api/admin/countries/:id - Update a country
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { code, nameEn, nameAr, isActive } = req.body;

    const updateData: any = {};

    if (code !== undefined) {
      // Validate code format if provided
      if (typeof code !== "string" || code.length !== 2) {
        return res.status(400).json({
          msg:
            "Country code must be exactly 2 characters (ISO 3166-1 alpha-2)",
        });
      }
      updateData.code = code.toUpperCase();
    }
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (isActive !== undefined) updateData.isActive = isActive;

    const country = await prisma.country.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: country });
  } catch (error: any) {
    console.error("Error updating country:", error);
    if (error.code === "P2025") {
      res.status(404).json({ msg: "Country not found" });
    } else if (error.code === "P2002") {
      res.status(400).json({ msg: "Country code already exists" });
    } else {
      res.status(500).json({ msg: "Failed to update country" });
    }
  }
});

// DELETE /api/admin/countries/:id - Delete a country
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // First, check if country exists and get its code
    const country = await prisma.country.findUnique({
      where: { id },
    });

    if (!country) {
      return res.status(404).json({ msg: "Country not found" });
    }

    // Check if country is being used by any companies
    const companiesCount = await prisma.company.count({
      where: { countryCode: country.code },
    });

    if (companiesCount > 0) {
      return res.status(400).json({
        msg: `Cannot delete country: ${companiesCount} company(ies) are using this country`,
      });
    }

    await prisma.country.delete({
      where: { id },
    });

    res.json({ success: true, message: "Country deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting country:", error);
    if (error.code === "P2025") {
      res.status(404).json({ msg: "Country not found" });
    } else {
      res.status(500).json({ msg: "Failed to delete country" });
    }
  }
});

export default router;
