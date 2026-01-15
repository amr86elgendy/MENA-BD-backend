import { Request, Response } from "express";
import {
  searchCompanies,
  getCompanyPublicData,
  getCompanyReports,
} from "../services/company.service";
import { prisma } from "../config/db";

/**
 * Search companies
 * Public endpoint - no auth required
 */
export async function searchCompaniesHandler(req: Request, res: Response) {
  try {
    const { country, q, limit, offset } = req.query;

    const filters: any = {
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    };

    if (country) {
      if (typeof country === "string" && country.length === 2) {
        filters.countryCode = country
      }
    }

    if (q) {
      filters.query = q as string;
    }

    const result = await searchCompanies(filters);

    res.json({
      success: true,
      data: result.companies,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.companies.length < result.total,
      },
    });
  } catch (error: any) {
    console.error("Search companies error:", error);
    res.status(500).json({ error: "Failed to search companies" });
  }
}

/**
 * Get company public data
 * Public endpoint - no auth required
 */
export async function getCompanyHandler(req: Request, res: Response) {
  try {
    const companyId = parseInt(req.params.id);

    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company ID" });
    }

    const company = await getCompanyPublicData(companyId);

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    console.error("Get company error:", error);
    res.status(500).json({ error: "Failed to get company" });
  }
}

/**
 * Get available reports for a company
 * Returns different data based on user verification status
 */
export async function getCompanyReportsHandler(req: Request, res: Response) {
  try {
    const companyId = parseInt(req.params.id);

    if (isNaN(companyId)) {
      return res.status(400).json({ msg: "Invalid company ID" });
    }

    // Get user verification status if authenticated
    let isUserVerified = false;
    if (req.user) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isVerified: true },
      });
      isUserVerified = user?.isVerified || false;
    }

    const reports = await getCompanyReports(companyId, isUserVerified);

    res.json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    console.error("Get company reports error:", error);
    res.status(500).json({ error: error.message || "Failed to get reports" });
  }
}
