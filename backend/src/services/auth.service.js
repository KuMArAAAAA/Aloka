// src/services/auth.service.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Hash refresh token untuk disimpan di database
 */
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Simpan refresh token di DB
 */
export const persistRefreshToken = async (userId, refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  // Default TTL 7 hari
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
};

/**
 * Generate Access Token & Refresh Token
 */
export const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
  });

  return { accessToken, refreshToken };
};

/**
 * Login untuk Administrator Pemerintah dan Sekolah
 */
export const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { school: true },
  });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const tokenPayload = {
    sub: user.id,
    role: user.role,
    schoolId: user.schoolId || null,
  };

  const { accessToken, refreshToken } = generateTokens(tokenPayload);

  try {
    await persistRefreshToken(user.id, refreshToken);
  } catch (err) {
    logger.warn(`[Auth] Could not persist refresh token: ${err.message}`);
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      school: user.school ? { id: user.school.id, name: user.school.name, npsn: user.school.npsn } : null,
    },
  };
};

/**
 * Login Siswa via NISN dan Tanggal Lahir (Dapodik Match)
 */
export const loginStudent = async ({ nisn, dateOfBirth }) => {
  const student = await prisma.student.findUnique({
    where: { nisn },
    include: { school: true },
  });

  if (!student) {
    const error = new Error("Student not found");
    error.statusCode = 404;
    error.code = "STUDENT_NOT_FOUND";
    throw error;
  }

  const studentDob = student.dateOfBirth.toISOString().split("T")[0];
  if (studentDob !== dateOfBirth) {
    const error = new Error("Date of birth does not match student records");
    error.statusCode = 400;
    error.code = "DOB_MISMATCH";
    throw error;
  }

  if (!student.isActive) {
    const error = new Error("Student status is inactive");
    error.statusCode = 403;
    error.code = "STUDENT_INACTIVE";
    throw error;
  }

  const tokenPayload = {
    sub: student.id,
    role: "STUDENT",
    studentId: student.id,
    schoolId: student.schoolId,
    nisn: student.nisn,
  };

  const { accessToken, refreshToken } = generateTokens(tokenPayload);

  try {
    await persistRefreshToken(student.id, refreshToken);
  } catch (err) {
    logger.warn(`[Auth] Could not persist student refresh token: ${err.message}`);
  }

  return {
    accessToken,
    refreshToken,
    student: {
      id: student.id,
      nisn: student.nisn,
      fullName: student.fullName,
      gradeLevel: student.gradeLevel,
      walletAddress: student.walletAddress,
      school: {
        id: student.school.id,
        name: student.school.name,
      },
    },
  };
};

/**
 * Buat Nonce SIWE untuk wallet signature
 */
export const generateSiweNonce = async () => {
  const nonce = uuidv4().replace(/-/g, "").substring(0, 16);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 menit

  await prisma.siweNonce.create({
    data: {
      nonce,
      expiresAt,
    },
  });

  return { nonce, expiresAt };
};

/**
 * Ekstrak nonce dari EIP-4361 message
 */
export const extractNonceFromSiweMessage = (message) => {
  const nonceMatch = message.match(/^Nonce:\s*([a-zA-Z0-9]+)$/m);
  return nonceMatch ? nonceMatch[1] : null;
};

/**
 * Verifikasi Signature SIWE dan Ikat (Bind) Wallet Address ke Akun Siswa
 */
export const bindStudentWallet = async (studentId, { walletAddress, message, signature }) => {
  // 1. Ekstrak nonce dari message dan validasi state nonce
  const nonce = extractNonceFromSiweMessage(message);
  if (!nonce) {
    const error = new Error("SIWE message does not contain a valid Nonce field");
    error.statusCode = 400;
    error.code = "SIWE_NONCE_MISSING";
    throw error;
  }

  const nonceRecord = await prisma.siweNonce.findUnique({
    where: { nonce },
  });

  if (!nonceRecord) {
    const error = new Error("Invalid or unknown SIWE nonce");
    error.statusCode = 400;
    error.code = "SIWE_NONCE_INVALID";
    throw error;
  }

  if (nonceRecord.consumedAt) {
    const error = new Error("SIWE nonce has already been used");
    error.statusCode = 409;
    error.code = "SIWE_NONCE_ALREADY_USED";
    throw error;
  }

  if (new Date() > new Date(nonceRecord.expiresAt)) {
    const error = new Error("SIWE nonce has expired");
    error.statusCode = 400;
    error.code = "SIWE_NONCE_EXPIRED";
    throw error;
  }

  // 2. Recover signer address dari message dan signature
  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature);
  } catch (err) {
    const error = new Error("Failed to verify signature");
    error.statusCode = 400;
    error.code = "SIGNATURE_VERIFICATION_FAILED";
    throw error;
  }

  // 3. Pastikan alamat wallet yang didapat cocok (case-insensitive)
  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    const error = new Error("Recovered address does not match provided wallet address");
    error.statusCode = 400;
    error.code = "WALLET_ADDRESS_MISMATCH";
    throw error;
  }

  // 4. Pastikan wallet belum terikat ke siswa lain
  const existingBinding = await prisma.student.findFirst({
    where: {
      walletAddress: {
        equals: walletAddress,
        mode: "insensitive",
      },
      NOT: {
        id: studentId,
      },
    },
  });

  if (existingBinding) {
    const error = new Error("This wallet address is already bound to another student");
    error.statusCode = 409;
    error.code = "WALLET_ALREADY_BOUND";
    throw error;
  }

  // 5. Konsumsi nonce & update data wallet siswa dalam 1 atomic transaction
  const [updatedStudent] = await prisma.$transaction([
    prisma.student.update({
      where: { id: studentId },
      data: {
        walletAddress: walletAddress.toLowerCase(),
        walletBoundAt: new Date(),
      },
    }),
    prisma.siweNonce.update({
      where: { nonce },
      data: {
        consumedAt: new Date(),
        usedBy: studentId,
      },
    }),
  ]);

  logger.info(`Student ${studentId} bound wallet ${walletAddress}`);

  return {
    studentId: updatedStudent.id,
    nisn: updatedStudent.nisn,
    walletAddress: updatedStudent.walletAddress,
    walletBoundAt: updatedStudent.walletBoundAt,
  };
};

/**
 * Refresh Access Token menggunakan Refresh Token dengan Database Validation
 */
export const refreshAccessToken = async (token) => {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const tokenHash = hashToken(token);

    // Cek di DB apakah token masih valid (belum direvoke)
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (tokenRecord) {
      if (tokenRecord.revokedAt || new Date() > new Date(tokenRecord.expiresAt)) {
        const err = new Error("Refresh token has been revoked or expired");
        err.statusCode = 401;
        err.code = "REVOKED_REFRESH_TOKEN";
        throw err;
      }
    }

    const newAccessToken = jwt.sign(
      {
        sub: payload.sub,
        role: payload.role,
        schoolId: payload.schoolId || null,
        studentId: payload.studentId || null,
        nisn: payload.nisn || null,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY }
    );

    return { accessToken: newAccessToken };
  } catch (error) {
    if (error.code === "REVOKED_REFRESH_TOKEN") throw error;
    const err = new Error("Invalid or expired refresh token");
    err.statusCode = 401;
    err.code = "INVALID_REFRESH_TOKEN";
    throw err;
  }
};

/**
 * Revoke refresh token saat logout
 */
export const revokeRefreshToken = async (token) => {
  if (!token) return;
  try {
    const tokenHash = hashToken(token);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    logger.warn(`[Auth] Failed to revoke refresh token: ${err.message}`);
  }
};
