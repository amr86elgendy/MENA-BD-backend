import { Router } from "express";
import { prisma } from "../config/db.js";

const router = Router();

// GET /api/companies - Get all companies
router.get("/", async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// GET /api/companies/:id - Get a single company by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

// POST /api/companies - Create a new company
router.post("/", async (req, res) => {
  try {
    const {
      nameEn,
      nameAr,
      registrationNumber,
      overview,
      country,
      city,
      address,
      phone,
      email,
      website,
      description,
      content,
    } = req.body;

    const company = await prisma.company.create({
      data: {
        nameEn,
        nameAr,
        registrationNumber,
        overview,
        country,
        city,
        address,
        phone,
        email,
        website,
        description,
        content,
      },
    });

    res.status(201).json(company);
  } catch (error: any) {
    console.error("Error creating company:", error);
    if (error.code === "P2002") {
      res.status(400).json({ error: "Registration number already exists" });
    } else {
      res.status(500).json({ error: "Failed to create company" });
    }
  }
});

// PUT /api/companies/:id - Update a company
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      nameEn,
      nameAr,
      registrationNumber,
      overview,
      country,
      city,
      address,
      phone,
      email,
      website,
      description,
      content,
      published,
    } = req.body;

    const company = await prisma.company.update({
      where: { id },
      data: {
        nameEn,
        nameAr,
        registrationNumber,
        overview,
        country,
        city,
        address,
        phone,
        email,
        website,
        description,
        content,
        published,
      },
    });

    res.json(company);
  } catch (error: any) {
    console.error("Error updating company:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Company not found" });
    } else {
      res.status(500).json({ error: "Failed to update company" });
    }
  }
});

// DELETE /api/companies/:id - Delete a company
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.company.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Error deleting company:", error);
    if (error.code === "P2025") {
      res.status(404).json({ error: "Company not found" });
    } else {
      res.status(500).json({ error: "Failed to delete company" });
    }
  }
});

// GET /api/companies/search?q=query - Search companies
router.get("/search", async (req, res) => {
  try {
    const { q, country, city } = req.query;

    const where: any = {};

    if (q) {
      where.OR = [
        { nameEn: { contains: q as string, mode: "insensitive" } },
        { nameAr: { contains: q as string, mode: "insensitive" } },
        { registrationNumber: { contains: q as string, mode: "insensitive" } },
      ];
    }

    if (country) {
      where.country = country;
    }

    if (city) {
      where.city = city;
    }

    const companies = await prisma.company.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(companies);
  } catch (error) {
    console.error("Error searching companies:", error);
    res.status(500).json({ error: "Failed to search companies" });
  }
});

export default router;
