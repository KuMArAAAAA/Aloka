// src/controllers/auth.controller.js
import * as authService from "../services/auth.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

// Refresh cookie is session-only (no maxAge) — auto-cleared when browser closes.
// Still works for token refresh during the active browsing session.
export const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, user } = await authService.loginUser(req.body);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return successResponse(res, { accessToken, user }, "Login successful");
  } catch (error) {
    next(error);
  }
};

export const loginStudent = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, student } = await authService.loginStudent(req.body);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return successResponse(res, { accessToken, student }, "Student login successful");
  } catch (error) {
    next(error);
  }
};

export const getSiweNonce = async (req, res, next) => {
  try {
    const result = await authService.generateSiweNonce();
    return successResponse(res, result, "SIWE nonce generated");
  } catch (error) {
    next(error);
  }
};

export const bindWallet = async (req, res, next) => {
  try {
    const studentId = req.user.studentId || req.user.sub;
    const result = await authService.bindStudentWallet(studentId, req.body);
    return successResponse(res, result, "Wallet successfully bound to student profile");
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return errorResponse(res, "Refresh token required", 401, {
        code: "REFRESH_TOKEN_REQUIRED",
      });
    }

    const result = await authService.refreshAccessToken(token);
    return successResponse(res, result, "Token refreshed successfully");
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (token) {
      await authService.revokeRefreshToken(token);
    }
    res.clearCookie("refreshToken");
    return successResponse(res, null, "Logged out successfully");
  } catch (error) {
    next(error);
  }
};
