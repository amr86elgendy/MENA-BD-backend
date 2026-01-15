import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/reports - Get all reports with pagination
router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "50",
      search,
      isActive,
      countryCode,
    } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (countryCode) {
      where.countryCode = countryCode as string;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          country: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ msg: "Failed to fetch reports" });
  }
});

// GET /api/admin/reports/:id - Get a single report
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        country: true,
      },
    });

    if (!report) {
      return res.status(404).json({ msg: "Report not found" });
    }

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error("Error fetching report:", error);
    res.status(500).json({ msg: "Failed to fetch report" });
  }
});

// POST /api/admin/reports - Create a new report
router.post("/", async (req, res) => {
  try {
    const { name, description, isActive, turnaround, price, countryCode } =
      req.body;

    // Validation
    if (
      !name ||
      !description ||
      !turnaround ||
      price === undefined ||
      !countryCode
    ) {
      return res.status(400).json({
        msg: "Missing required fields: name, description, turnaround, price, countryCode",
      });
    }

    // Validate country exists
    const country = await prisma.country.findUnique({
      where: { code: countryCode },
    });

    if (!country) {
      return res.status(400).json({ msg: "Invalid country code" });
    }

    // Validate price is a positive number
    if (typeof price !== "number" || price < 0) {
      return res.status(400).json({ msg: "Price must be a positive number" });
    }

    const report = await prisma.report.create({
      data: {
        name,
        description,
        turnaround,
        price,
        countryCode,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        country: true,
      },
    });

    res.status(201).json({ success: true, data: report });
  } catch (error: any) {
    console.error("Error creating report:", error);
    res.status(500).json({ msg: "Failed to create report" });
  }
});

// PUT /api/admin/reports/:id - Update a report
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, isActive, turnaround, price, countryCode } =
      req.body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (turnaround !== undefined) updateData.turnaround = turnaround;
    if (price !== undefined) {
      if (typeof price !== "number" || price < 0) {
        return res.status(400).json({ msg: "Price must be a positive number" });
      }
      updateData.price = price;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (countryCode !== undefined) {
      // Validate country exists
      const country = await prisma.country.findUnique({
        where: { code: countryCode },
      });

      if (!country) {
        return res.status(400).json({ msg: "Invalid country code" });
      }
      updateData.countryCode = countryCode;
    }

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
      include: {
        country: true,
      },
    });

    res.json({ success: true, data: report });
  } catch (error: any) {
    console.error("Error updating report:", error);
    if (error.code === "P2025") {
      res.status(404).json({ msg: "Report not found" });
    } else {
      res.status(500).json({ msg: "Failed to update report" });
    }
  }
});

// DELETE /api/admin/reports/:id - Delete a report
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Check if report exists
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({ msg: "Report not found" });
    }

    // Check if report is being used by any cart items
    const cartItemsCount = await prisma.cartItem.count({
      where: { reportId: id },
    });

    if (cartItemsCount > 0) {
      return res.status(400).json({
        msg: `Cannot delete report: ${cartItemsCount} cart item(s) are using this report`,
      });
    }

    await prisma.report.delete({
      where: { id },
    });

    res.json({ success: true, message: "Report deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting report:", error);
    if (error.code === "P2025") {
      res.status(404).json({ msg: "Report not found" });
    } else {
      res.status(500).json({ msg: "Failed to delete report" });
    }
  }
});

export default router;
