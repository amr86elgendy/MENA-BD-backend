import { prisma } from "../config/db.js";

export interface ReportPricingInput {
  reportId: number;
  countryCode: string;
}

export interface ReportPricingResult {
  reportId: number;
  name: string;
  price: number;
  turnaround: string;
  isAvailable: boolean;
}

/**
 * Get pricing for a report
 * Simplified pricing service for the new schema
 */
export async function getReportPrice(
  input: ReportPricingInput
): Promise<ReportPricingResult> {
  const report = await prisma.report.findFirst({
    where: {
      id: input.reportId,
      countryCode: input.countryCode,
      isActive: true,
    },
  });

  if (!report) {
    throw new Error("Report not available for this country");
  }

  return {
    reportId: report.id,
    name: report.name,
    price: report.price,
    turnaround: report.turnaround,
    isAvailable: report.isActive,
  };
}

/**
 * Calculate total price for multiple reports
 */
export async function calculateTotalPrice(
  items: Array<{
    reportId: number;
    countryCode: string;
    quantity?: number;
  }>
): Promise<{
  items: Array<{
    reportId: number;
    name: string;
    unitPrice: number;
    totalPrice: number;
    quantity: number;
    turnaround: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
}> {
  const TAX_RATE = 0.05; // 5%

  const calculatedItems = await Promise.all(
    items.map(async (item) => {
      const pricing = await getReportPrice({
        reportId: item.reportId,
        countryCode: item.countryCode,
      });

      const quantity = item.quantity || 1;
      const totalPrice = pricing.price * quantity;

      return {
        reportId: item.reportId,
        name: pricing.name,
        unitPrice: pricing.price,
        totalPrice,
        quantity,
        turnaround: pricing.turnaround,
      };
    })
  );

  const subtotal = calculatedItems.reduce(
    (sum, item) => sum + item.totalPrice,
    0
  );

  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  return {
    items: calculatedItems,
    subtotal,
    tax,
    total,
  };
}
