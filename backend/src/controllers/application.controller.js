// src/controllers/application.controller.js
import * as applicationService from "../services/application.service.js";
import { successResponse } from "../utils/response.js";

export const createApplication = async (req, res, next) => {
  try {
    // Siswa hanya boleh membuat aplikasi untuk akun miliknya sendiri
    if (req.user.role === "STUDENT") {
      const authenticatedStudentId = req.user.studentId || req.user.sub;
      if (req.body.studentId && req.body.studentId !== authenticatedStudentId) {
        return res.status(403).json({
          success: false,
          data: null,
          message: "Forbidden: You cannot submit an application on behalf of another student",
          error: { code: "FORBIDDEN_STUDENT_ID" },
        });
      }
      req.body.studentId = authenticatedStudentId;
    }

    const result = await applicationService.createApplication(req.body);
    return successResponse(res, result, "Aid application successfully validated and created", 201);
  } catch (error) {
    next(error);
  }
};

export const listApplications = async (req, res, next) => {
  try {
    const filters = { ...req.query };

    // Isolasi tenant untuk sekolah
    if (req.user.role === "SCHOOL") {
      filters.schoolId = req.user.schoolId;
    }

    const result = await applicationService.listApplications(filters);
    return successResponse(res, result, "Applications list retrieved");
  } catch (error) {
    next(error);
  }
};

export const getMyApplication = async (req, res, next) => {
  try {
    const studentId = req.user.studentId || req.user.sub;
    const result = await applicationService.getMyApplication(studentId);
    return successResponse(res, result, "Student application status retrieved");
  } catch (error) {
    next(error);
  }
};

export const getApplicationById = async (req, res, next) => {
  try {
    const result = await applicationService.getApplicationById(req.params.id);

    // Verifikasi kepemilikan resource (IDOR protection)
    if (req.user.role === "STUDENT") {
      const studentId = req.user.studentId || req.user.sub;
      if (result.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          data: null,
          message: "Forbidden: You are not authorized to view this application",
          error: { code: "FORBIDDEN_APPLICATION_ACCESS" },
        });
      }
    } else if (req.user.role === "SCHOOL") {
      if (result.student?.schoolId !== req.user.schoolId) {
        return res.status(403).json({
          success: false,
          data: null,
          message: "Forbidden: Application belongs to a different school",
          error: { code: "FORBIDDEN_SCHOOL_ACCESS" },
        });
      }
    }

    return successResponse(res, result, "Application details retrieved");
  } catch (error) {
    next(error);
  }
};
