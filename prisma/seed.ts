import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["info", "warn", "error"]
      : ["error"],
});

async function main() {
  console.log("🌱 Starting seed...");

  // Clear existing data (in reverse order of dependencies)
  console.log("🧹 Cleaning existing data...");
  try {
    await prisma.report.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  try {
    await prisma.company.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  try {
    await prisma.user.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }
  try {
    await prisma.country.deleteMany();
  } catch (e) {
    // Table might not exist yet
  }

  // ============================================================================
  // COUNTRIES (10 countries)
  // ============================================================================
  console.log("📍 Creating 10 countries...");
  const countries = await Promise.all([
    prisma.country.create({
      data: {
        code: "AE",
        nameEn: "United Arab Emirates",
        nameAr: "الإمارات العربية المتحدة",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "SA",
        nameEn: "Saudi Arabia",
        nameAr: "المملكة العربية السعودية",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "QA",
        nameEn: "Qatar",
        nameAr: "قطر",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "KW",
        nameEn: "Kuwait",
        nameAr: "الكويت",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "BH",
        nameEn: "Bahrain",
        nameAr: "البحرين",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "OM",
        nameEn: "Oman",
        nameAr: "عُمان",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "EG",
        nameEn: "Egypt",
        nameAr: "مصر",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "JO",
        nameEn: "Jordan",
        nameAr: "الأردن",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "LB",
        nameEn: "Lebanon",
        nameAr: "لبنان",
        isActive: true,
      },
    }),
    prisma.country.create({
      data: {
        code: "MA",
        nameEn: "Morocco",
        nameAr: "المغرب",
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${countries.length} countries`);

  // ============================================================================
  // COMPANIES (10 companies)
  // ============================================================================
  console.log("🏢 Creating 10 companies...");
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        nameEn: "Emirates Steel Industries",
        nameAr: "صناعات الإمارات للحديد",
        registrationNumber: "CN-1234567",
        legalForm: "PRIVATE_LIMITED_COMPANY",
        industry: "Manufacturing & Steel Production",
        foundedDate: "1998",
        size: "1,500-2,000",
        address: "Musaffah Industrial Area, Abu Dhabi, UAE",
        city: "Abu Dhabi",
        countryCode: "AE",
        phone: "+971 2 123 4567",
        email: "info@emiratessteel.ae",
        website: "www.emiratessteel.ae",
        description:
          "Leading steel manufacturer in the MENA region with state-of-the-art facilities.",
        services: [
          "Steel Manufacturing",
          "Rebar Production",
          "Wire Rod Production",
        ],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Dubai Holdings",
        nameAr: "دبي القابضة",
        registrationNumber: "CN-2345678",
        legalForm: "PUBLIC_LIMITED_COMPANY",
        industry: "Investment & Real Estate",
        foundedDate: "2004",
        size: "5,000+",
        address: "Dubai International Financial Centre, Dubai, UAE",
        city: "Dubai",
        countryCode: "AE",
        phone: "+971 4 234 5678",
        email: "info@dubaiholdings.ae",
        website: "www.dubaiholdings.ae",
        description: "Premier investment and real estate development company.",
        services: [
          "Real Estate Development",
          "Investment Management",
          "Property Management",
        ],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Saudi Aramco Services",
        nameAr: "خدمات أرامكو السعودية",
        registrationNumber: "CR-3456789",
        legalForm: "CORPORATION",
        industry: "Oil & Gas Services",
        foundedDate: "1933",
        size: "10,000+",
        address: "Dhahran, Eastern Province, Saudi Arabia",
        city: "Dhahran",
        countryCode: "SA",
        phone: "+966 13 345 6789",
        email: "info@aramco.com.sa",
        website: "www.aramco.com.sa",
        description: "Leading oil and gas services provider in Saudi Arabia.",
        services: [
          "Oil Exploration",
          "Refining",
          "Petrochemicals",
          "Energy Services",
        ],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Qatar National Bank",
        nameAr: "بنك قطر الوطني",
        registrationNumber: "QR-4567890",
        legalForm: "PUBLIC_LIMITED_COMPANY",
        industry: "Banking & Finance",
        foundedDate: "1964",
        size: "3,000-5,000",
        address: "QNB Tower, West Bay, Doha, Qatar",
        city: "Doha",
        countryCode: "QA",
        phone: "+974 4440 7777",
        email: "info@qnb.com.qa",
        website: "www.qnb.com.qa",
        description:
          "Premier banking and financial services institution in Qatar.",
        services: [
          "Commercial Banking",
          "Investment Banking",
          "Wealth Management",
        ],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Emaar Properties",
        nameAr: "إعمار العقارية",
        registrationNumber: "CN-5678901",
        legalForm: "PUBLIC_LIMITED_COMPANY",
        industry: "Real Estate Development",
        foundedDate: "1997",
        size: "2,500-3,000",
        address: "Emaar Square, Downtown Dubai, UAE",
        city: "Dubai",
        countryCode: "AE",
        phone: "+971 4 367 3333",
        email: "info@emaar.com",
        website: "www.emaar.com",
        description:
          "World-renowned real estate developer creating iconic landmarks.",
        services: [
          "Residential Development",
          "Commercial Development",
          "Hospitality",
        ],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Kuwait Petroleum Corporation",
        nameAr: "مؤسسة البترول الكويتية",
        registrationNumber: "KW-6789012",
        legalForm: "CORPORATION",
        industry: "Oil & Gas",
        foundedDate: "1980",
        size: "8,000+",
        address: "Ahmadi, Kuwait",
        city: "Ahmadi",
        countryCode: "KW",
        phone: "+965 2388 1111",
        email: "info@kpc.com.kw",
        website: "www.kpc.com.kw",
        description: "State-owned oil company of Kuwait.",
        services: ["Oil Production", "Refining", "Petroleum Products"],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Bahrain Telecommunications Company",
        nameAr: "شركة البحرين للاتصالات",
        registrationNumber: "BH-7890123",
        legalForm: "PUBLIC_LIMITED_COMPANY",
        industry: "Telecommunications",
        foundedDate: "1981",
        size: "1,000-1,500",
        address: "Manama, Bahrain",
        city: "Manama",
        countryCode: "BH",
        phone: "+973 17 111 111",
        email: "info@batelco.com.bh",
        website: "www.batelco.com.bh",
        description: "Leading telecommunications provider in Bahrain.",
        services: [
          "Mobile Services",
          "Internet Services",
          "Enterprise Solutions",
        ],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Oman Air",
        nameAr: "الطيران العماني",
        registrationNumber: "OM-8901234",
        legalForm: "CORPORATION",
        industry: "Aviation",
        foundedDate: "1993",
        size: "2,000-2,500",
        address: "Muscat International Airport, Muscat, Oman",
        city: "Muscat",
        countryCode: "OM",
        phone: "+968 24 531 111",
        email: "info@omanair.com",
        website: "www.omanair.com",
        description: "National airline of the Sultanate of Oman.",
        services: ["Passenger Services", "Cargo Services", "Ground Handling"],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Egyptian Steel",
        nameAr: "الحديد والصلب المصرية",
        registrationNumber: "EG-9012345",
        legalForm: "PRIVATE_LIMITED_COMPANY",
        industry: "Steel Manufacturing",
        foundedDate: "2010",
        size: "1,000-1,500",
        address: "Cairo, Egypt",
        city: "Cairo",
        countryCode: "EG",
        phone: "+20 2 2527 0000",
        email: "info@egyptiansteel.com",
        website: "www.egyptiansteel.com",
        description: "Leading steel manufacturer in Egypt.",
        services: ["Steel Production", "Rebar Manufacturing", "Wire Rod"],
      },
    }),
    prisma.company.create({
      data: {
        nameEn: "Royal Jordanian Airlines",
        nameAr: "الملكية الأردنية",
        registrationNumber: "JO-0123456",
        legalForm: "PUBLIC_LIMITED_COMPANY",
        industry: "Aviation",
        foundedDate: "1963",
        size: "2,000-2,500",
        address: "Queen Alia International Airport, Amman, Jordan",
        city: "Amman",
        countryCode: "JO",
        phone: "+962 6 510 0000",
        email: "info@rj.com",
        website: "www.rj.com",
        description: "Flag carrier airline of Jordan.",
        services: ["Passenger Services", "Cargo Services", "Maintenance"],
      },
    }),
  ]);

  console.log(`✅ Created ${companies.length} companies`);

  // ============================================================================
  // USERS (10 users)
  // ============================================================================
  console.log("👥 Creating 10 users...");
  const hashedPassword = await hashPassword("password123");
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "admin@menabusiness.com",
        name: "Admin User",
        password: hashedPassword,
        role: "ADMIN",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "verified@example.com",
        name: "Verified User",
        password: hashedPassword,
        role: "USER",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "user1@example.com",
        name: "John Doe",
        password: hashedPassword,
        role: "USER",
        isVerified: false,
      },
    }),
    prisma.user.create({
      data: {
        email: "user2@example.com",
        name: "Jane Smith",
        password: hashedPassword,
        role: "USER",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "user3@example.com",
        name: "Ahmed Al-Mansouri",
        password: hashedPassword,
        role: "USER",
        isVerified: false,
      },
    }),
    prisma.user.create({
      data: {
        email: "user4@example.com",
        name: "Fatima Hassan",
        password: hashedPassword,
        role: "USER",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "user5@example.com",
        name: "Mohammed Ali",
        password: hashedPassword,
        role: "USER",
        isVerified: false,
      },
    }),
    prisma.user.create({
      data: {
        email: "user6@example.com",
        name: "Sarah Johnson",
        password: hashedPassword,
        role: "USER",
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: "user7@example.com",
        name: "Omar Abdullah",
        password: hashedPassword,
        role: "USER",
        isVerified: false,
      },
    }),
    prisma.user.create({
      data: {
        email: "user8@example.com",
        name: "Layla Ahmed",
        password: hashedPassword,
        role: "USER",
        isVerified: true,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ============================================================================
  // REFRESH TOKENS (10 tokens)
  // ============================================================================
  console.log("🔑 Creating 10 refresh tokens...");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const refreshTokens = await Promise.all(
    users.slice(0, 10).map((user, index) =>
      prisma.refreshToken.create({
        data: {
          token: `refresh_token_${user.id}_${Date.now()}_${index}`,
          userId: user.id,
          expiresAt,
          revoked: index % 3 === 0, // Every 3rd token is revoked
        },
      })
    )
  );

  console.log(`✅ Created ${refreshTokens.length} refresh tokens`);

  // ============================================================================
  // REPORTS (10 reports)
  // ============================================================================
  console.log("📊 Creating 10 reports...");
  const reports = await Promise.all([
    prisma.report.create({
      data: {
        name: "Business Activities Report",
        description:
          "Detailed breakdown of all registered business activities and trade classifications.",
        isActive: true,
        turnaround: "2-3 days",
        price: 25,
        countryCode: "AE",
      },
    }),
    prisma.report.create({
      data: {
        name: "Commercial Address Verification",
        description:
          "Verified commercial address with full details including building and district information.",
        isActive: true,
        turnaround: "1-2 days",
        price: 15,
        countryCode: "AE",
      },
    }),
    prisma.report.create({
      data: {
        name: "Company Capital Structure",
        description:
          "Complete capital structure including authorized and paid-up capital details.",
        isActive: true,
        turnaround: "3-5 days",
        price: 30,
        countryCode: "SA",
      },
    }),
    prisma.report.create({
      data: {
        name: "Partners and Shareholders",
        description:
          "Full list of partners and shareholders with ownership percentages.",
        isActive: true,
        turnaround: "5-7 days",
        price: 45,
        countryCode: "QA",
      },
    }),
    prisma.report.create({
      data: {
        name: "Authorized Signatories",
        description:
          "Verified list of authorized signatories with their powers and limitations.",
        isActive: true,
        turnaround: "4-6 days",
        price: 35,
        countryCode: "KW",
      },
    }),
    prisma.report.create({
      data: {
        name: "Media Report",
        description:
          "Comprehensive media coverage analysis including news articles and press releases.",
        isActive: true,
        turnaround: "7-10 days",
        price: 50,
        countryCode: "BH",
      },
    }),
    prisma.report.create({
      data: {
        name: "Litigation Records",
        description:
          "Complete litigation history including court cases and judgments.",
        isActive: true,
        turnaround: "7-10 days",
        price: 60,
        countryCode: "OM",
      },
    }),
    prisma.report.create({
      data: {
        name: "Credit Rating & Score",
        description:
          "Professional credit assessment with rating, score, and risk analysis.",
        isActive: true,
        turnaround: "5-7 days",
        price: 75,
        countryCode: "EG",
      },
    }),
    prisma.report.create({
      data: {
        name: "Financial Statement Analysis",
        description:
          "Detailed analysis of company financial statements and performance metrics.",
        isActive: true,
        turnaround: "10-14 days",
        price: 100,
        countryCode: "JO",
      },
    }),
    prisma.report.create({
      data: {
        name: "Company Registration Certificate",
        description:
          "Official company registration certificate with all legal details.",
        isActive: true,
        turnaround: "1-2 days",
        price: 20,
        countryCode: "AE",
      },
    }),
  ]);

  console.log(`✅ Created ${reports.length} reports`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log(`   - Countries: ${countries.length}`);
  console.log(`   - Companies: ${companies.length}`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Reports: ${reports.length}`);
  console.log("\n🔑 Test Credentials:");
  console.log("   Admin: admin@menabusiness.com / password123");
  console.log("   Verified User: verified@example.com / password123");
  console.log("   Unverified User: user1@example.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("✅ Disconnected from database");
  });
