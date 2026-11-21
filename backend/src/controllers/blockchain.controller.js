// src/controllers/blockchain.controller.js
import * as blockchainService from "../services/blockchain.service.js";
import { successResponse } from "../utils/response.js";

export const fundEscrow = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const result = await blockchainService.fundEscrow(amount);
    return successResponse(res, result, "Escrow funded successfully");
  } catch (error) {
    next(error);
  }
};

export const submitApplication = async (req, res, next) => {
  try {
    const result = await blockchainService.submitApplicationOnChain(req.params.id);
    return successResponse(res, result, "Application submitted on-chain successfully");
  } catch (error) {
    next(error);
  }
};

export const verifyApplication = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const requestingSchoolId = req.user?.role === "SCHOOL" ? req.user.schoolId : null;
    const result = await blockchainService.verifyApplicationOnChain(req.params.id, amount, requestingSchoolId);
    return successResponse(res, result, "Application verified on-chain successfully");
  } catch (error) {
    next(error);
  }
};

export const rejectApplication = async (req, res, next) => {
  try {
    const requestingSchoolId = req.user?.role === "SCHOOL" ? req.user.schoolId : null;
    const result = await blockchainService.rejectApplicationOnChain(req.params.id, requestingSchoolId);
    return successResponse(res, result, "Application rejected on-chain");
  } catch (error) {
    next(error);
  }
};

export const distributeAid = async (req, res, next) => {
  try {
    const result = await blockchainService.distributeAidOnChain(req.params.id);
    return successResponse(res, result, "Aid distributed directly to student wallet");
  } catch (error) {
    next(error);
  }
};

export const setValidator = async (req, res, next) => {
  try {
    const { validatorWallet, allowed } = req.body;
    const result = await blockchainService.setSchoolValidatorOnChain(validatorWallet, allowed);
    return successResponse(res, result, `School validator ${allowed ? "granted" : "revoked"} successfully`);
  } catch (error) {
    next(error);
  }
};

export const getEscrowStats = async (req, res, next) => {
  try {
    const result = await blockchainService.getEscrowStats();
    return successResponse(res, result, "Escrow stats retrieved from blockchain");
  } catch (error) {
    next(error);
  }
};
