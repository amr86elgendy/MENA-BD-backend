import { Router } from "express";
import multer from "multer";
import { authenticate, requireAdmin } from "../../middleware/auth.js";
import { parseExcelAndCreateCompanies } from "../../services/excel.service.js";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv", // .csv
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed."
        )
      );
    }
  },
});

// POST /api/admin/upload/companies - Upload Excel file to seed companies
router.post(
  "/upload/companies",
  authenticate,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const result = await parseExcelAndCreateCompanies(
        req.file.buffer,
        req.file.mimetype
      );

      res.json({
        success: true,
        message: `Successfully processed ${result.success} companies`,
        data: {
          total: result.total,
          success: result.success,
          failed: result.failed,
          errors: result.errors,
        },
      });
    } catch (error: any) {
      console.error("Error uploading companies:", error);
      res.status(500).json({
        error: error.message || "Failed to process Excel file",
      });
    }
  }
);

export { router as uploadExcelRoute };
