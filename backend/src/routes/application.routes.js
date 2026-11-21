// src/routes/application.routes.js
import { Router } from "express";
import * as appController from "../controllers/application.controller.js";
import { authenticateToken, requireRole } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { createApplicationSchema, listApplicationsQuerySchema, verifyApplicationManualSchema } from "../schemas/application.schema.js";

const router = Router();

// GET /api/v1/applications/me - Siswa cek status alokasinya
router.get(
  "/me",
  authenticateToken,
  requireRole("STUDENT"),
  appController.getMyApplication
);

// POST /api/v1/applications - Buat pengajuan baru (Government atau Student)
router.post(
  "/",
  authenticateToken,
  requireRole("GOVERNMENT", "STUDENT"),
  validateRequest(createApplicationSchema),
  appController.createApplication
);

// GET /api/v1/applications - List semua alokasi (Government & School)
router.get(
  "/",
  authenticateToken,
  requireRole("GOVERNMENT", "SCHOOL"),
  validateRequest(listApplicationsQuerySchema),
  appController.listApplications
);

// GET /api/v1/applications/:id - Detail alokasi
router.get(
  "/:id",
  authenticateToken,
  requireRole("GOVERNMENT", "SCHOOL", "STUDENT"),
  appController.getApplicationById
);

// POST /api/v1/applications/:id/verify-manual - Sekolah verifikasi pengajuan tanpa smart contract call
router.post(
  "/:id/verify-manual",
  authenticateToken,
  requireRole("SCHOOL", "GOVERNMENT"),
  validateRequest(verifyApplicationManualSchema),
  appController.verifyApplicationManual
);

export default router;
