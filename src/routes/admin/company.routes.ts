import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate, requireAdmin } from "../../middleware/auth";

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/companies - Get all companies with pagination
router.get("/", async (req, res) => {
  try {
    const { page = "1", limit = "10", search, countryCode } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { nameEn: { contains: search as string, mode: "insensitive" } },
        { nameAr: { contains: search as string, mode: "insensitive" } },
        {
          registrationNumber: {
            contains: search as string,
            mode: "insensitive",
          },
        },
        { email: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (countryCode) {
      // Handle both single string and comma-separated string (array)
      const countryCodes =
        typeof countryCode === "string"
          ? countryCode.split(",").map((code) => code.trim().toUpperCase())
          : Array.isArray(countryCode)
          ? countryCode.map((code) => String(code).toUpperCase())
          : [String(countryCode).toUpperCase()];

      if (countryCodes.length === 1) {
        where.countryCode = countryCodes[0];
      } else {
        where.countryCode = { in: countryCodes };
      }
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        include: {
          country: true,
          reports: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.company.count({ where }),
    ]);

    res.json({
      success: true,
      data: companies,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// GET /api/admin/companies/:id - Get a single company
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        country: true,
        reports: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({ success: true, data: company });
  } catch (error: any) {
    console.error("Error fetching company:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

// POST /api/admin/companies - Create a new company
router.post("/", async (req, res) => {
  try {
    const {
      nameEn,
      nameAr,
      registrationNumber,
      legalForm,
      industry,
      foundedDate,
      size,
      address,
      city,
      countryCode,
      phone,
      email,
      website,
      description,
      services,
      reportIds,
    } = req.body;

    // Validation
    if (
      !nameEn ||
      !registrationNumber ||
      !industry ||
      !address ||
      !city ||
      !countryCode ||
      !phone ||
      !email
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: nameEn, registrationNumber, industry, address, city, countryCode, phone, email",
      });
    }

    // Verify country exists
    const country = await prisma.country.findUnique({
      where: { code: countryCode.toUpperCase() },
    });

    if (!country) {
      return res.status(400).json({ error: "Invalid country code" });
    }

    const company = await prisma.company.create({
      data: {
        nameEn,
        nameAr: nameAr || null,
        registrationNumber,
        legalForm: legalForm || "PRIVATE_LIMITED_COMPANY",
        industry,
        foundedDate: foundedDate || null,
        size: size || null,
        address,
        city,
        countryCode: countryCode.toUpperCase(),
        phone,
        email,
        website: website || null,
        description: description || null,
        services: services || [],
        reports:
          reportIds && reportIds.length > 0
            ? {
                connect: reportIds.map((id: number) => ({ id })),
              }
            : undefined,
      },
      include: {
        country: true,
        reports: true,
      },
    });

    res.status(201).json({ success: true, data: company });
  } catch (error: any) {
    console.error("Error creating company:", error);
    if (error.code === "P2002") {
      res.status(400).json({ error: "Registration number already exists" });
    } else {
      res.status(500).json({ error: "Failed to create company" });
    }
  }
});

// PUT /api/admin/companies/:id - Update a company
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      nameEn,
      nameAr,
      registrationNumber,
      legalForm,
      industry,
      foundedDate,
      size,
      address,
      city,
      countryCode,
      phone,
      email,
      website,
      description,
      services,
      reportIds,
    } = req.body;

    const updateData: any = {};
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (registrationNumber !== undefined)
      updateData.registrationNumber = registrationNumber;
    if (legalForm !== undefined) updateData.legalForm = legalForm;
    if (industry !== undefined) updateData.industry = industry;
    if (foundedDate !== undefined) updateData.foundedDate = foundedDate;
    if (size !== undefined) updateData.size = size;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (countryCode !== undefined) {
      // Verify country exists
      const country = await prisma.country.findUnique({
        where: { code: countryCode.toUpperCase() },
      });
      if (!country) {
        return res.status(400).json({ error: "Invalid country code" });
      }
      updateData.countryCode = countryCode.toUpperCase();
    }
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (description !== undefined) updateData.description = description;
    if (services !== undefined) updateData.services = services;

    // Handle reports relationship
    if (reportIds !== undefined) {
      // First, disconnect all existing reports
      await prisma.company.update({
        where: { id },
        data: {
          reports: {
            set: [],
          },
        },
      });

      // Then connect the new reports if any
      if (reportIds.length > 0) {
        updateData.reports = {
          connect: reportIds.map((id: number) => ({ id })),
        };
      }
    }

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        country: true,
        reports: true,
      },
    });

    res.json({ success: true, data: company });
  } catch (error: any) {
    console.error("Error updating company:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Company not found" });
    } else if (error.code === "P2002") {
      res.status(400).json({ error: "Registration number already exists" });
    } else {
      res.status(500).json({ error: "Failed to update company" });
    }
  }
});

// DELETE /api/admin/companies/:id - Delete a company
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.company.delete({
      where: { id },
    });

    res.json({ success: true, message: "Company deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting company:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Company not found" });
    } else {
      res.status(500).json({ error: "Failed to delete company" });
    }
  }
});

export default router;
