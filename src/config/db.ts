import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

const connectDb = async () => {
  try {
    await prisma.$connect();
    console.log("✅ Connected to database");
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("❌ Error connecting to database", error.message);
    } else {
      console.error("❌ Error connecting to database", error);
    }
    process.exit(1);
  }
};

const disconnectDb = async () => {
  await prisma.$disconnect();
  console.log("✅ Disconnected from database");
};

export { prisma, connectDb, disconnectDb };
