// src/routes/student.routes.js
import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { authenticateToken, requireRole } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { walletBindSchema } from "../schemas/auth.schema.js";
import { prisma } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = Router();

// GET /api/v1/students/me - Profil siswa yang sedang login
router.get("/me", authenticateToken, requireRole("STUDENT"), async (req, res, next) => {
  try {
    const studentId = req.user.studentId || req.user.sub;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: true,
        recommendation: true,
        applications: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!student) {
      return errorResponse(res, "Student profile not found", 404, { code: "STUDENT_NOT_FOUND" });
    }

    return successResponse(res, student, "Student profile retrieved");
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/students/wallet/bind - Binding Web3 Wallet dengan SIWE
router.post(
  "/wallet/bind",
  authenticateToken,
  requireRole("STUDENT"),
  validateRequest(walletBindSchema),
  authController.bindWallet
);

// POST /api/v1/students/wallet/connect - Hubungkan wallet MetaMask aktif langsung ke akun siswa
router.post(
  "/wallet/connect",
  authenticateToken,
  requireRole("STUDENT"),
  async (req, res, next) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress)) {
        return errorResponse(res, "Alamat wallet MetaMask tidak valid", 400);
      }
      const studentId = req.user.studentId || req.user.sub;
      const updated = await prisma.student.update({
        where: { id: studentId },
        data: {
          walletAddress,
          walletBoundAt: new Date(),
        },
      });
      return successResponse(
        res,
        { walletAddress: updated.walletAddress },
        "Dompet MetaMask berhasil ditautkan ke akun siswa"
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
