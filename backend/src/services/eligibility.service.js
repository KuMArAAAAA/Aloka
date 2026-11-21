// src/services/eligibility.service.js
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

/**
 * Core Engine: Automatic Eligibility Validation (PIP Criteria)
 * Memeriksa 6 parameter wajib sebelum alokasi dapat masuk on-chain
 */
export const checkEligibility = async (studentId, academicYear) => {
  logger.info(`Running Eligibility Check for studentId: ${studentId}, academicYear: ${academicYear}`);

  // CHECK 1: Siswa terdaftar dan berstatus aktif
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      school: true,
      recommendation: true,
    },
  });

  if (!student) {
    return {
      eligible: false,
      reason: "STUDENT_NOT_FOUND",
      message: "Data siswa tidak ditemukan di database Dapodik/Aloka",
    };
  }

  if (!student.isActive) {
    return {
      eligible: false,
      reason: "STUDENT_INACTIVE",
      message: "Siswa berstatus tidak aktif atau telah lulus/pindah sekolah",
    };
  }

  // CHECK 2: Sekolah terdaftar dan valid
  if (!student.school) {
    return {
      eligible: false,
      reason: "SCHOOL_NOT_FOUND",
      message: "Satuan pendidikan siswa tidak terdaftar dalam sistem",
    };
  }

  // CHECK 3: Rekomendasi sekolah sudah disetujui
  if (!student.recommendation || !student.recommendation.isApproved) {
    return {
      eligible: false,
      reason: "RECOMMENDATION_NOT_APPROVED",
      message: "Surat rekomendasi digital dari sekolah belum diverifikasi atau ditolak",
    };
  }

  // CHECK 4: Tidak ada duplikasi alokasi di tahun ajaran yang sama
  const existingActiveApplication = await prisma.application.findFirst({
    where: {
      studentId: student.id,
      academicYear: academicYear,
      onchainStatus: {
        in: ["UNSUBMITTED", "AWAITING_REVIEW", "VERIFIED", "DISTRIBUTED"],
      },
    },
  });

  if (existingActiveApplication) {
    return {
      eligible: false,
      reason: "DUPLICATE_APPLICATION",
      message: `Siswa telah memiliki pengajuan aktif untuk tahun ajaran ${academicYear}`,
    };
  }

  // CHECK 5: Tidak ada indikasi kecurangan / fraud flag aktif
  const fraudRecord = await prisma.application.findFirst({
    where: {
      studentId: student.id,
      fraudFlag: true,
    },
  });

  if (fraudRecord) {
    return {
      eligible: false,
      reason: "FRAUD_FLAGGED",
      message: "Profil siswa ditandai memiliki catatan investigasi/fraud aktif",
    };
  }

  // CHECK 6: Wallet address sudah terikat (diperlukan untuk klaim direct-to-beneficiary)
  if (!student.walletAddress) {
    return {
      eligible: false,
      reason: "WALLET_NOT_BOUND",
      message: "Siswa belum mengikat Web3 Wallet terverifikasi ke profil",
    };
  }

  // Lolos semua kriteria
  return {
    eligible: true,
    student,
    message: "Siswa memenuhi seluruh kriteria kelayakan Program Indonesia Pintar",
  };
};
