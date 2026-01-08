import { prisma } from "../config/db.js";

export interface CompanySearchFilters {
  countryCode?: string;
  query?: string; // Search in company names or registration number
  limit?: number;
  offset?: number;
}

export interface CompanyPublicData {
  id: number;
  nameEn: string;
  nameAr: string | null;
  registrationNumber: string;
  legalForm: string;
  industry: string;
  foundedDate: string | null;
  size: string | null;
  address: string;
  city: string;
  country: {
    code: string;
    nameEn: string;
    nameAr: string;
  };
  phone: string;
  email: string;
  website: string | null;
  description: string | null;
  services: string[];
  createdAt: Date;
}

/**
 * Search companies
 */
export async function searchCompanies(filters: CompanySearchFilters) {
  const where: any = {};

  if (filters.countryCode) {
    where.countryCode = filters.countryCode.toUpperCase();
  }

  // Search in company names or registration number
  if (filters.query) {
    where.OR = [
      {
        nameEn: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
      {
        nameAr: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
      {
        registrationNumber: {
          contains: filters.query,
          mode: "insensitive",
        },
      },
    ];
  }

  const companies = await prisma.company.findMany({
    where,
    include: {
      reports: {},
      // country: true,
    },
    take: filters.limit || 50,
    skip: filters.offset || 0,
    orderBy: { createdAt: "desc" },
  });

  const total = await prisma.company.count({ where });

  return {
    companies,
    total,
    limit: filters.limit || 50,
    offset: filters.offset || 0,
  };
}

/**
 * Get company public data
 * Guest users can access this
 */
export async function getCompanyPublicData(
  companyId: number
): Promise<CompanyPublicData | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      country: true,
    },
  });

  if (!company) {
    return null;
  }

  return {
    id: company.id,
    nameEn: company.nameEn,
    nameAr: company.nameAr,
    registrationNumber: company.registrationNumber,
    legalForm: company.legalForm,
    industry: company.industry,
    foundedDate: company.foundedDate,
    size: company.size,
    address: company.address,
    city: company.city,
    country: {
      code: company.country.code,
      nameEn: company.country.nameEn,
      nameAr: company.country.nameAr,
    },
    phone: company.phone,
    email: company.email,
    website: company.website,
    description: company.description,
    services: company.services,
    createdAt: company.createdAt,
  };
}

/**
 * Get available reports for a company
 * Returns reports available for the company's country
 */
export async function getCompanyReports(
  companyId: number,
  isUserVerified: boolean = false
) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { country: true },
  });

  if (!company) {
    throw new Error("Company not found");
  }

  // Get all available reports for this country
  const reports = await prisma.report.findMany({
    where: {
      countryCode: company.countryCode,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // For unverified users, return metadata only (no pricing details)
  if (!isUserVerified) {
    return reports.map((report) => ({
      id: report.id,
      name: report.name,
      description: report.description,
      turnaround: report.turnaround,
      // Don't include price for unverified users
      canPurchase: false,
    }));
  }

  // For verified users, return full details including price
  return reports.map((report) => ({
    id: report.id,
    name: report.name,
    description: report.description,
    turnaround: report.turnaround,
    price: report.price,
    canPurchase: true,
  }));
}
