// src/services/school.service.js
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

/**
 * Pihak sekolah mengajukan atau memperbarui rekomendasi kelayakan digital siswa
 */
export const submitSchoolRecommendation = async (schoolId, { studentId, referenceNumber, isApproved }) => {
  // Pastikan siswa terdaftar pada sekolah yang login
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  if (student.schoolId !== schoolId) {
    const error = new Error("Student does not belong to your school");
    error.statusCode = 403;
    error.code = "FORBIDDEN_STUDENT_ACCESS";
    throw error;
  }

  // Upsert rekomendasi sekolah
  const recommendation = await prisma.schoolRecommendation.upsert({
    where: { studentId },
    create: {
      studentId,
      schoolId,
      referenceNumber,
      isApproved,
      approvedAt: isApproved ? new Date() : null,
    },
    update: {
      referenceNumber,
      isApproved,
      approvedAt: isApproved ? new Date() : null,
    },
    include: {
      student: true,
    },
  });

  logger.info(`Recommendation submitted for student ${student.nisn} by school ${schoolId}: approved=${isApproved}`);

  return recommendation;
};

/**
 * Mengambil daftar siswa dan status bantuan untuk sekolah yang login
 */
export const getMySchoolStudents = async (schoolId) => {
  const students = await prisma.student.findMany({
    where: { schoolId },
    include: {
      recommendation: true,
      applications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { fullName: "asc" },
  });

  return students.map((s) => ({
    ...s,
    applications: s.applications.map((app) => ({
      ...app,
      amount: app.amount ? app.amount.toString() : null,
      onchainId: app.onchainId ? app.onchainId.toString() : null,
    })),
  }));
};

/**
 * Mengambil riwayat rekomendasi dari sekolah ini
 */
export const getMySchoolRecommendations = async (schoolId) => {
  return await prisma.schoolRecommendation.findMany({
    where: { schoolId },
    include: {
      student: true,
    },
    orderBy: { submittedAt: "desc" },
  });
};

/**
 * Registrasi sekolah baru (Government)
 */
export const createSchool = async (data) => {
  return await prisma.school.create({
    data,
  });
};

/**
 * List semua sekolah (Government)
 */
export const listSchools = async () => {
  return await prisma.school.findMany({
    include: {
      _count: {
        select: { students: true, recommendations: true },
      },
    },
    orderBy: { name: "asc" },
  });
};
