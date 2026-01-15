import { Router } from "express";
import {
  searchCompaniesHandler,
  getCompanyHandler,
  getCompanyReportsHandler,
} from "../controllers/company.controller";
import { optionalAuth } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/search", searchCompaniesHandler);
router.get("/:id", optionalAuth, getCompanyHandler);

// Reports - optional auth to see full pricing
router.get(
  "/:id/reports",
  optionalAuth, // Optional - shows different data if authenticated
  getCompanyReportsHandler
);

export default router;
