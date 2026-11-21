// src/controllers/school.controller.js
import * as schoolService from "../services/school.service.js";
import { successResponse } from "../utils/response.js";

export const submitRecommendation = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await schoolService.submitSchoolRecommendation(schoolId, req.body);
    return successResponse(res, result, "School recommendation submitted successfully");
  } catch (error) {
    next(error);
  }
};

export const getMyStudents = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await schoolService.getMySchoolStudents(schoolId);
    return successResponse(res, result, "School students retrieved");
  } catch (error) {
    next(error);
  }
};

export const getMyRecommendations = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const result = await schoolService.getMySchoolRecommendations(schoolId);
    return successResponse(res, result, "School recommendations retrieved");
  } catch (error) {
    next(error);
  }
};

export const createSchool = async (req, res, next) => {
  try {
    const result = await schoolService.createSchool(req.body);
    return successResponse(res, result, "School registered successfully", 201);
  } catch (error) {
    next(error);
  }
};

export const listSchools = async (req, res, next) => {
  try {
    const result = await schoolService.listSchools();
    return successResponse(res, result, "Schools list retrieved");
  } catch (error) {
    next(error);
  }
};
