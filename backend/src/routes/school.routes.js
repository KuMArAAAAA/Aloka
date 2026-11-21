// src/routes/school.routes.js
import { Router } from "express";
import * as schoolController from "../controllers/school.controller.js";
import { authenticateToken, requireRole } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { createSchoolRecommendationSchema, registerSchoolSchema } from "../schemas/school.schema.js";

const router = Router();

// GET /api/v1/schools/me/students - Daftar siswa di sekolah saya
router.get(
  "/me/students",
  authenticateToken,
  requireRole("SCHOOL"),
  schoolController.getMyStudents
);

// POST /api/v1/schools/recommendations - Submit rekomendasi digital siswa
router.post(
  "/recommendations",
  authenticateToken,
  requireRole("SCHOOL"),
  validateRequest(createSchoolRecommendationSchema),
  schoolController.submitRecommendation
);

// GET /api/v1/schools/recommendations - Daftar rekomendasi dari sekolah ini
router.get(
  "/recommendations",
  authenticateToken,
  requireRole("SCHOOL"),
  schoolController.getMyRecommendations
);

// GET /api/v1/schools - List semua sekolah (Government)
router.get(
  "/",
  authenticateToken,
  requireRole("GOVERNMENT"),
  schoolController.listSchools
);

// POST /api/v1/schools - Daftarkan sekolah baru (Government)
router.post(
  "/",
  authenticateToken,
  requireRole("GOVERNMENT"),
  validateRequest(registerSchoolSchema),
  schoolController.createSchool
);

export default router;
