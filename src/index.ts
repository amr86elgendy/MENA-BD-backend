import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { connectDb, disconnectDb } from "./config/db";
import companyRoutes from "./routes/company.routes";
import countryRoutes from "./routes/country.routes";
import cartRoutes from "./routes/cart.routes";
import userRoutes from "./routes/admin/user.routes";
import authRoutes from "./routes/auth";
import adminCompanyRoutes from "./routes/admin/company.routes";
import adminCountryRoutes from "./routes/admin/country.routes";
import adminReportRoutes from "./routes/admin/report.routes";
import { uploadExcelRoute } from "./routes/admin/upload.routes";
import { securityHeaders } from "./middleware/security-headers";

connectDb();

const app = express();

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3001", // In case Next.js uses a different port
  "http://localhost:5173", // Vite dev server (admin panel)
  process.env.ADMIN_URL || "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all origins in development
      }
    },
    credentials: true,
  })
);

// Security headers
app.use(securityHeaders);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/countries", countryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/admin/users", userRoutes);
app.use("/api/admin/companies", adminCompanyRoutes);
app.use("/api/admin/countries", adminCountryRoutes);
app.use("/api/admin/reports", adminReportRoutes);
app.use("/api/admin", uploadExcelRoute);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () =>
  console.log(`
🚀 Server ready at: http://localhost:${PORT}`)
);
// Handle unhandled promise rejections
process.on("unhandledRejection", async (error) => {
  console.error("❌ Unhandled rejection", error);
  server.close(async () => {
    await disconnectDb();
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("❌ Uncaught exception", error);
  await disconnectDb();
  process.exit(1);
});

process.on("SIGTERM", async () => {
  console.log("❌ SIGTERM signal received");
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
});
