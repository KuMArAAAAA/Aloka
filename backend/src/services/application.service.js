// src/services/application.service.js
import { prisma } from "../config/database.js";
import { checkEligibility } from "./eligibility.service.js";
import { generateApplicationHash } from "../utils/hash.js";
import { logger } from "../utils/logger.js";

// Besaran bantuan default PIP berdasarkan jenjang pendidikan
const PIP_AMOUNTS = {
  SD: 450000,
  SMP: 750000,
  SMA: 1800000,
  SMK: 1800000,
};

/**
 * Buat pengajuan bantuan baru dengan validasi otomatis kelayakan
 */
export const createApplication = async ({ studentId, academicYear, amount }) => {
  // 1. Jalankan Automatic Eligibility Validation
  const eligibility = await checkEligibility(studentId, academicYear);

  if (!eligibility.eligible) {
    const error = new Error(eligibility.message);
    error.statusCode = 422;
    error.code = "ELIGIBILITY_FAILED";
    error.reason = eligibility.reason;
    throw error;
  }

  const { student } = eligibility;

  // 2. Tentukan nominal bantuan (custom atau default jenjang)
  const finalAmount = amount || PIP_AMOUNTS[student.gradeLevel] || 1000000;

  // 3. Generate keccak256 hash off-chain yang akan diverifikasi oleh smart contract
  const applicationHash = generateApplicationHash(
    student.nisn,
    student.schoolId,
    academicYear
  );

  // 4. Buat record Application di database
  const application = await prisma.application.create({
    data: {
      studentId: student.id,
      academicYear,
      amount: BigInt(finalAmount),
      applicationHash,
      validationStatus: "VALID",
      onchainStatus: "UNSUBMITTED",
    },
    include: {
      student: {
        include: {
          school: true,
        },
      },
    },
  });

  // 5. Catat ke Audit Log
  await prisma.auditLog.create({
    data: {
      entityType: "Application",
      entityId: application.id,
      action: "CREATED_AND_VALIDATED",
      actorRole: "SYSTEM",
      metadata: {
        academicYear,
        amount: finalAmount,
        applicationHash,
      },
    },
  });

  logger.info(`Application created: ${application.id} for student ${student.nisn}`);

  // Ubah BigInt ke String untuk serialisasi JSON yang aman
  return {
    ...application,
    amount: application.amount.toString(),
  };
};

/**
 * Mengambil daftar pengajuan untuk Dashboard Pemerintah
 */
export const listApplications = async (filters = {}) => {
  const where = {};

  if (filters.academicYear) {
    where.academicYear = filters.academicYear;
  }

  if (filters.onchainStatus) {
    where.onchainStatus = filters.onchainStatus;
  }

  if (filters.schoolId) {
    where.student = {
      schoolId: filters.schoolId,
    };
  }

  const applications = await prisma.application.findMany({
    where,
    include: {
      student: {
        include: {
          school: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return applications.map((app) => ({
    ...app,
    amount: app.amount ? app.amount.toString() : null,
    onchainId: app.onchainId ? app.onchainId.toString() : null,
  }));
};

/**
 * Mengambil pengajuan milik siswa yang login
 */
export const getMyApplication = async (studentId) => {
  const application = await prisma.application.findFirst({
    where: { studentId },
    include: {
      student: {
        include: {
          school: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!application) {
    return null;
  }

  return {
    ...application,
    amount: application.amount ? application.amount.toString() : null,
    onchainId: application.onchainId ? application.onchainId.toString() : null,
  };
};

/**
 * Mengambil detail pengajuan berdasarkan ID
 */
export const getApplicationById = async (id) => {
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          school: true,
          recommendation: true,
        },
      },
    },
  });

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    error.code = "APPLICATION_NOT_FOUND";
    throw error;
  }

  return {
    ...application,
    amount: application.amount ? application.amount.toString() : null,
    onchainId: application.onchainId ? application.onchainId.toString() : null,
  };
};

/**
 * Verifikasi manual application oleh sekolah (TANPA smart contract call).
 * Memungkinkan demo alur verifikasi walau wallet sekolah tidak terdaftar
 * sebagai validator on-chain atau onchainId belum tersedia.
 *
 * Status transition: UNSUBMITTED | AWAITING_REVIEW → VERIFIED
 */
export const verifyApplicationManual = async ({ applicationId, requestingSchoolId, amount, notes }) => {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { student: true },
  });

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    error.code = "APPLICATION_NOT_FOUND";
    throw error;
  }

  // Tenant isolation: sekolah hanya boleh verify application milik sekolahnya
  if (requestingSchoolId && application.student.schoolId !== requestingSchoolId) {
    const error = new Error("Forbidden: Application belongs to a different school");
    error.statusCode = 403;
    error.code = "FORBIDDEN_SCHOOL_APPLICATION";
    throw error;
  }

  const allowedStatuses = ["UNSUBMITTED", "AWAITING_REVIEW", "VERIFIED"];
  if (!allowedStatuses.includes(application.onchainStatus)) {
    const error = new Error(
      `Application status is ${application.onchainStatus}, expected UNSUBMITTED, AWAITING_REVIEW, or VERIFIED`
    );
    error.statusCode = 409;
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }

  // Idempotent: if already verified, return current state without duplicate writes
  if (application.onchainStatus === "VERIFIED") {
    logger.info(`[Application] Manual verify no-op: ${applicationId} already VERIFIED`);
    return {
      ...application,
      amount: application.amount ? application.amount.toString() : null,
      onchainId: application.onchainId ? application.onchainId.toString() : null,
    };
  }

  const finalAmount = amount || (application.amount ? Number(application.amount.toString()) : null);
  if (!finalAmount || finalAmount <= 0) {
    const error = new Error("Amount is required for verification");
    error.statusCode = 422;
    error.code = "AMOUNT_REQUIRED";
    throw error;
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      onchainStatus: "VERIFIED",
      validationStatus: "VALID",
      amount: BigInt(finalAmount),
      txVerifyHash: application.txVerifyHash || `manual-verify-${Date.now()}`,
    },
    include: {
      student: { include: { school: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Application",
      entityId: applicationId,
      action: "VERIFIED_MANUAL",
      actorRole: "SCHOOL",
      metadata: {
        amount: finalAmount,
        method: "manual",
        notes: notes || "Verified via manual approve flow (no on-chain call)",
      },
    },
  });

  logger.info(`[Application] Manual verify: ${applicationId} → VERIFIED`);

  return {
    ...updated,
    amount: updated.amount.toString(),
    onchainId: updated.onchainId ? updated.onchainId.toString() : null,
  };
};
