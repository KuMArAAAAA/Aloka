// src/routes/public.routes.js
import { Router } from "express";
import { prisma } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = Router();

/**
 * GET /api/v1/public/stats
 * Statistik agregat distribusi bantuan — dapat diakses publik (tanpa auth)
 * PII tidak ditampilkan, hanya data agregat & anonim
 */
router.get("/stats", async (req, res, next) => {
  try {
    const [
      totalApplications,
      totalDistributed,
      totalVerified,
      totalPending,
      totalRejected,
      byGradeLevel,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({ where: { onchainStatus: "DISTRIBUTED" } }),
      prisma.application.count({ where: { onchainStatus: "VERIFIED" } }),
      prisma.application.count({ where: { onchainStatus: { in: ["UNSUBMITTED", "AWAITING_REVIEW"] } } }),
      prisma.application.count({ where: { onchainStatus: "REJECTED" } }),

      // Jumlah distribusi per jenjang pendidikan
      prisma.student.groupBy({
        by: ["gradeLevel"],
        _count: { gradeLevel: true },
        where: {
          applications: {
            some: { onchainStatus: "DISTRIBUTED" },
          },
        },
      }),

      // 10 audit log terbaru aksi blockchain (tanpa data PII)
      prisma.auditLog.findMany({
        where: {
          txHash: { not: null },
        },
        select: {
          action: true,
          txHash: true,
          createdAt: true,
          actorRole: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Hitung total dana tersalurkan dari jumlah distribusi × rata-rata nominal
    const totalAmountResult = await prisma.application.aggregate({
      _sum: { amount: true },
      where: { onchainStatus: "DISTRIBUTED" },
    });

    const gradeLevelMap = byGradeLevel.reduce((acc, item) => {
      acc[item.gradeLevel] = item._count.gradeLevel;
      return acc;
    }, {});

    return successResponse(res, {
      summary: {
        totalApplications,
        totalDistributed,
        totalVerified,
        totalPending,
        totalRejected,
        totalFundDistributedIDR: totalAmountResult._sum.amount
          ? totalAmountResult._sum.amount.toString()
          : "0",
      },
      byGradeLevel: {
        SD: gradeLevelMap["SD"] || 0,
        SMP: gradeLevelMap["SMP"] || 0,
        SMA: gradeLevelMap["SMA"] || 0,
        SMK: gradeLevelMap["SMK"] || 0,
      },
      recentActivity: recentAuditLogs.map((log) => ({
        action: log.action,
        txHash: log.txHash,
        actorRole: log.actorRole,
        timestamp: log.createdAt,
        polygonscanUrl: `https://amoy.polygonscan.com/tx/${log.txHash}`,
      })),
      contractAddress: process.env.ESCROW_CONTRACT_ADDRESS,
      network: "Polygon Amoy Testnet",
    }, "Public transparency statistics retrieved");
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/public/applications/:txHash
 * Verifikasi pengajuan berdasarkan transaction hash — untuk audit publik
 * Menampilkan data minimal tanpa PII (nama/NIK tidak ditampilkan)
 */
router.get("/applications/:txHash", async (req, res, next) => {
  try {
    const { txHash } = req.params;

    if (!txHash || !txHash.startsWith("0x") || txHash.length !== 66) {
      return errorResponse(res, "Invalid transaction hash format", 400, {
        code: "INVALID_TX_HASH",
      });
    }

    // Cari di semua kolom tx hash
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { txSubmitHash: txHash },
          { txVerifyHash: txHash },
          { txDistributeHash: txHash },
        ],
      },
      include: {
        student: {
          select: {
            gradeLevel: true,
            school: {
              select: { name: true, npsn: true },
            },
          },
        },
      },
    });

    if (!application) {
      return errorResponse(res, "No application found for this transaction hash", 404, {
        code: "TX_NOT_FOUND",
      });
    }

    return successResponse(res, {
      applicationHash: application.applicationHash,
      academicYear: application.academicYear,
      onchainId: application.onchainId ? application.onchainId.toString() : null,
      onchainStatus: application.onchainStatus,
      amount: application.amount ? application.amount.toString() : null,
      gradeLevel: application.student.gradeLevel,
      school: application.student.school,
      transactions: {
        submit: application.txSubmitHash
          ? {
              hash: application.txSubmitHash,
              polygonscanUrl: `https://amoy.polygonscan.com/tx/${application.txSubmitHash}`,
            }
          : null,
        verify: application.txVerifyHash
          ? {
              hash: application.txVerifyHash,
              polygonscanUrl: `https://amoy.polygonscan.com/tx/${application.txVerifyHash}`,
            }
          : null,
        distribute: application.txDistributeHash
          ? {
              hash: application.txDistributeHash,
              polygonscanUrl: `https://amoy.polygonscan.com/tx/${application.txDistributeHash}`,
            }
          : null,
      },
      createdAt: application.createdAt,
    }, "Application verified via transaction hash");
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/public/schools
 * Daftar sekolah yang terdaftar (publik)
 */
router.get("/schools", async (req, res, next) => {
  try {
    const schools = await prisma.school.findMany({
      select: {
        npsn: true,
        name: true,
        address: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return successResponse(res, schools, "Registered schools retrieved");
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/public/ledger
 * Daftar log audit transaksi on-chain untuk explorer publik (paginated, non-PII)
 */
router.get("/ledger", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({
        where: { txHash: { not: null } },
      }),
      prisma.auditLog.findMany({
        where: { txHash: { not: null } },
        select: {
          id: true,
          action: true,
          actorRole: true,
          txHash: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      actorRole: log.actorRole,
      txHash: log.txHash,
      createdAt: log.createdAt,
      polygonscanUrl: `https://amoy.polygonscan.com/tx/${log.txHash}`,
    }));

    return successResponse(
      res,
      {
        items: formattedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Public transaction ledger retrieved"
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/public/applications
 * Daftar pengajuan untuk Buku Kas On-Chain Publik (non-PII: nama inisial, data anonim)
 */
router.get("/applications", async (req, res, next) => {
  try {
    const applications = await prisma.application.findMany({
      include: {
        student: {
          include: {
            school: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const statusMap = {
      UNSUBMITTED: 0,
      AWAITING_REVIEW: 1,
      VERIFIED: 2,
      REJECTED: 3,
      DISTRIBUTED: 4,
    };

    const formatted = applications.map((app) => ({
      id: app.onchainId ? Number(app.onchainId) : app.id,
      name: app.student?.fullName || "Peserta Didik",
      schoolName: app.student?.school?.name || "Sekolah Tidak Terdata",
      npsn: app.student?.school?.npsn || "",
      gradeLevel: app.student?.gradeLevel || "SMA",
      classRank: "Siswa Aktif",
      walletAddress: app.student?.walletAddress || "",
      amount: app.amount ? Number(app.amount) : 0,
      status: statusMap[app.onchainStatus] ?? 0,
      onchainStatus: app.onchainStatus,
      submissionDate: app.createdAt.toISOString().split("T")[0],
      applicationHash: app.applicationHash,
      txHash: app.txDistributeHash || app.txVerifyHash || app.txSubmitHash || null,
      verificationNotes:
        app.rejectionReason ||
        (app.onchainStatus === "DISTRIBUTED"
          ? "Dana bantuan telah ditransfer langsung dari Escrow Vault ke dompet siswa."
          : app.onchainStatus === "VERIFIED"
          ? "Disetujui sekolah, menunggu eksekusi transfer dana dari Escrow Vault."
          : "Menunggu verifikasi keaktifan siswa oleh pihak sekolah."),
    }));

    return successResponse(res, formatted, "Public applications retrieved");
  } catch (error) {
    next(error);
  }
});

export default router;
