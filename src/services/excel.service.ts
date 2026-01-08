import * as XLSX from "xlsx";
import { prisma } from "../config/db.js";

interface ExcelRow {
  nameEn?: string;
  nameAr?: string;
  registrationNumber?: string;
  legalForm?: string;
  industry?: string;
  foundedDate?: string;
  size?: string;
  address?: string;
  city?: string;
  countryCode?: string;
  country?: string; // Country name as fallback
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  services?: string | string[];
  [key: string]: any;
}

interface ProcessResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Parse Excel/CSV file and create companies
 */
export async function parseExcelAndCreateCompanies(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ProcessResult> {
  let workbook: XLSX.WorkBook;
  let rows: ExcelRow[] = [];

  try {
    // Parse the file based on mime type
    if (mimeType === "text/csv") {
      const csvString = fileBuffer.toString("utf-8");
      workbook = XLSX.read(csvString, { type: "string" });
    } else {
      workbook = XLSX.read(fileBuffer, { type: "buffer" });
    }

    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
  } catch (error: any) {
    throw new Error(`Failed to parse file: ${error.message}`);
  }

  if (rows.length === 0) {
    throw new Error("Excel file is empty or has no data");
  }

  const result: ProcessResult = {
    total: rows.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  // Get all countries for lookup
  const countries = await prisma.country.findMany();
  const countryMapByName = new Map(
    countries.map((c) => [c.nameEn.toLowerCase(), c.code])
  );
  const countryMapByCode = new Map(countries.map((c) => [c.code, c.code]));

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because Excel rows start at 1 and we have a header

    try {
      // Validate required fields
      if (
        !row.nameEn ||
        !row.registrationNumber ||
        !row.industry ||
        !row.address ||
        !row.city ||
        !row.phone ||
        !row.email
      ) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          error:
            "Missing required fields: nameEn, registrationNumber, industry, address, city, phone, email",
        });
        continue;
      }

      // Resolve country code
      let countryCode: string | null = null;

      if (row.countryCode) {
        const code = (row.countryCode as string).toUpperCase().trim();
        if (countryMapByCode.has(code)) {
          countryCode = code;
        }
      }

      if (!countryCode && row.country) {
        const countryName = (row.country as string).toLowerCase().trim();
        const code = countryMapByName.get(countryName);
        if (code) {
          countryCode = code;
        }
      }

      if (!countryCode) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          error:
            "Invalid or missing country. Please provide a valid country code (e.g., AE, SA) or country name.",
        });
        continue;
      }

      // Parse services (can be comma-separated string or array)
      let services: string[] = [];
      if (row.services) {
        if (typeof row.services === "string") {
          services = row.services
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (Array.isArray(row.services)) {
          services = row.services.map((s) => String(s).trim()).filter(Boolean);
        }
      }

      // Map legal form
      let legalForm = "PRIVATE_LIMITED_COMPANY";
      if (row.legalForm) {
        const form = (row.legalForm as string)
          .toUpperCase()
          .replace(/\s+/g, "_");
        const validForms = [
          "PRIVATE_LIMITED_COMPANY",
          "PUBLIC_LIMITED_COMPANY",
          "PARTNERSHIP",
          "CORPORATION",
          "OTHER",
        ];
        if (validForms.includes(form)) {
          legalForm = form;
        }
      }

      // Create company
      await prisma.company.create({
        data: {
          nameEn: String(row.nameEn).trim(),
          nameAr: row.nameAr ? String(row.nameAr).trim() : null,
          registrationNumber: String(row.registrationNumber).trim(),
          legalForm: legalForm as any,
          industry: String(row.industry).trim(),
          foundedDate: row.foundedDate ? String(row.foundedDate).trim() : null,
          size: row.size ? String(row.size).trim() : null,
          address: String(row.address).trim(),
          city: String(row.city).trim(),
          countryCode,
          phone: String(row.phone).trim(),
          email: String(row.email).trim(),
          website: row.website ? String(row.website).trim() : null,
          description: row.description ? String(row.description).trim() : null,
          services,
        },
      });

      result.success++;
    } catch (error: any) {
      result.failed++;
      if (error.code === "P2002") {
        result.errors.push({
          row: rowNumber,
          error: `Registration number already exists: ${row.registrationNumber}`,
        });
      } else {
        result.errors.push({
          row: rowNumber,
          error: error.message || "Failed to create company",
        });
      }
    }
  }

  return result;
}
