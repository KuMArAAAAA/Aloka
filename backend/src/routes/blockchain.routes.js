// src/routes/blockchain.routes.js
import { Router } from "express";
import * as blockchainController from "../controllers/blockchain.controller.js";
import { authenticateToken, requireRole } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import {
  fundEscrowSchema,
  verifyApplicationSchema,
  setValidatorSchema,
} from "../schemas/blockchain.schema.js";

const router = Router();

// ─── READ-ONLY (Publik) ──────────────────────────────────────────────────────

// GET /api/v1/blockchain/escrow/stats - Statistik langsung dari chain
router.get("/escrow/stats", blockchainController.getEscrowStats);

// ─── GOVERNMENT ONLY ─────────────────────────────────────────────────────────

// POST /api/v1/blockchain/fund - Pemerintah mengisi escrow vault mIDR
router.post(
  "/fund",
  authenticateToken,
  requireRole("GOVERNMENT"),
  validateRequest(fundEscrowSchema),
  blockchainController.fundEscrow
);

// POST /api/v1/blockchain/applications/:id/submit - Submit pengajuan ke chain
router.post(
  "/applications/:id/submit",
  authenticateToken,
  requireRole("GOVERNMENT"),
  blockchainController.submitApplication
);

// POST /api/v1/blockchain/applications/:id/distribute - Cairkan dana ke wallet siswa
router.post(
  "/applications/:id/distribute",
  authenticateToken,
  requireRole("GOVERNMENT", "STUDENT"),
  blockchainController.distributeAid
);

// POST /api/v1/blockchain/validators/set - Set/cabut validator sekolah
router.post(
  "/validators/set",
  authenticateToken,
  requireRole("GOVERNMENT"),
  validateRequest(setValidatorSchema),
  blockchainController.setValidator
);

// ─── SCHOOL ONLY ─────────────────────────────────────────────────────────────

// POST /api/v1/blockchain/applications/:id/verify - Sekolah verifikasi pengajuan
router.post(
  "/applications/:id/verify",
  authenticateToken,
  requireRole("SCHOOL"),
  validateRequest(verifyApplicationSchema),
  blockchainController.verifyApplication
);

// POST /api/v1/blockchain/applications/:id/reject - Sekolah tolak pengajuan
router.post(
  "/applications/:id/reject",
  authenticateToken,
  requireRole("SCHOOL"),
  blockchainController.rejectApplication
);

export default router;
