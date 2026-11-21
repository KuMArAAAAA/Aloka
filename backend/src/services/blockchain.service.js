// src/services/blockchain.service.js
import { ethers } from "ethers";
import {
  provider,
  escrowContract,
  tokenContract,
  getGovernmentSigner,
  getSchoolSigner,
  getEscrowContractWithSigner,
  getTokenContractWithSigner,
} from "../config/blockchain.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";

/**
 * Helper: Parse event dari transaction receipt
 */
const parseEventFromReceipt = (receipt, contract, eventName) => {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === eventName) {
        return parsed;
      }
    } catch (_) {
      // log tidak cocok dengan ABI ini, lewati
    }
  }
  return null;
};

/**
 * FR: fund() — Pemerintah mengisi escrow vault dengan token mIDR
 */
export const fundEscrow = async (amount) => {
  const govSigner = getGovernmentSigner();
  const escrow = getEscrowContractWithSigner(govSigner);
  const token = getTokenContractWithSigner(govSigner);

  logger.info(`[Blockchain] Funding escrow with ${amount} mIDR...`);

  // 1. Approve dulu agar escrow bisa tarik token
  const approveTx = await token.approve(await escrow.getAddress(), BigInt(amount));
  await approveTx.wait();
  logger.info(`[Blockchain] Approved ${amount} mIDR → escrow`);

  // 2. Fund escrow
  const fundTx = await escrow.fund(BigInt(amount));
  const receipt = await fundTx.wait();

  logger.info(`[Blockchain] Escrow funded. TxHash: ${receipt.hash}`);

  // Audit log
  await prisma.auditLog.create({
    data: {
      entityType: "Escrow",
      entityId: await escrow.getAddress(),
      action: "FUNDED",
      actorRole: "GOVERNMENT",
      txHash: receipt.hash,
      metadata: { amount: amount.toString() },
    },
  });

  return { txHash: receipt.hash, amount };
};

/**
 * FR: submitApplication() — Submit pengajuan yang sudah VALID ke blockchain
 */
export const submitApplicationOnChain = async (applicationId) => {
  const govSigner = getGovernmentSigner();
  const escrow = getEscrowContractWithSigner(govSigner);

  // Ambil data application dari DB
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

  if (application.validationStatus !== "VALID") {
    const error = new Error("Application has not passed eligibility validation");
    error.statusCode = 422;
    error.code = "NOT_VALIDATED";
    throw error;
  }

  if (application.onchainStatus !== "UNSUBMITTED") {
    const error = new Error(`Application is already ${application.onchainStatus} on-chain`);
    error.statusCode = 409;
    error.code = "ALREADY_SUBMITTED";
    throw error;
  }

  logger.info(`[Blockchain] Submitting application ${applicationId} on-chain...`);

  const targetBeneficiary = application.student?.walletAddress;
  const tx = targetBeneficiary
    ? await escrow["submitApplication(bytes32,address)"](application.applicationHash, targetBeneficiary)
    : await escrow["submitApplication(bytes32)"](application.applicationHash);
  const receipt = await tx.wait();

  // Parse event ApplicationSubmitted untuk mendapat onchainId
  const event = parseEventFromReceipt(receipt, escrow, "ApplicationSubmitted");
  if (!event) {
    throw new Error("Could not parse ApplicationSubmitted event from receipt");
  }

  const onchainId = event.args.applicationId;

  // Update DB
  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      onchainId: onchainId,
      onchainStatus: "AWAITING_REVIEW",
      txSubmitHash: receipt.hash,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Application",
      entityId: applicationId,
      action: "SUBMITTED_ONCHAIN",
      actorRole: "GOVERNMENT",
      txHash: receipt.hash,
      metadata: { onchainId: onchainId.toString() },
    },
  });

  logger.info(`[Blockchain] Application submitted. OnchainId: ${onchainId}, TxHash: ${receipt.hash}`);

  return {
    applicationId,
    onchainId: onchainId.toString(),
    txHash: receipt.hash,
    onchainStatus: "AWAITING_REVIEW",
  };
};

/**
 * FR: verifyApplication() — Sekolah/server memverifikasi pengajuan on-chain
 */
export const verifyApplicationOnChain = async (applicationId, amount, requestingSchoolId = null) => {
  const schoolSigner = getSchoolSigner();
  const escrow = getEscrowContractWithSigner(schoolSigner);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: true,
    },
  });

  if (!application || application.onchainId === null) {
    const error = new Error("Application not found or not yet submitted on-chain");
    error.statusCode = 404;
    error.code = "APPLICATION_NOT_FOUND";
    throw error;
  }

  // Verifikasi isolasi sekolah
  if (requestingSchoolId && application.student.schoolId !== requestingSchoolId) {
    const error = new Error("Forbidden: You can only verify applications belonging to your own school");
    error.statusCode = 403;
    error.code = "FORBIDDEN_SCHOOL_APPLICATION";
    throw error;
  }

  if (application.onchainStatus !== "AWAITING_REVIEW") {
    const error = new Error(`Application status is ${application.onchainStatus}, expected AWAITING_REVIEW`);
    error.statusCode = 409;
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }

  logger.info(`[Blockchain] Verifying application onchainId: ${application.onchainId}...`);

  const tx = await escrow.verifyApplication(application.onchainId, BigInt(amount));
  const receipt = await tx.wait();

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      onchainStatus: "VERIFIED",
      amount: BigInt(amount),
      txVerifyHash: receipt.hash,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Application",
      entityId: applicationId,
      action: "VERIFIED_ONCHAIN",
      actorRole: "SCHOOL",
      txHash: receipt.hash,
      metadata: { amount: amount.toString(), onchainId: application.onchainId.toString() },
    },
  });

  logger.info(`[Blockchain] Application verified. TxHash: ${receipt.hash}`);

  return {
    applicationId,
    onchainId: application.onchainId.toString(),
    txHash: receipt.hash,
    onchainStatus: "VERIFIED",
  };
};

/**
 * FR: rejectApplication() — Sekolah/server menolak pengajuan on-chain
 */
export const rejectApplicationOnChain = async (applicationId, requestingSchoolId = null) => {
  const schoolSigner = getSchoolSigner();
  const escrow = getEscrowContractWithSigner(schoolSigner);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: true,
    },
  });

  if (!application || application.onchainId === null) {
    const error = new Error("Application not found or not yet submitted on-chain");
    error.statusCode = 404;
    error.code = "APPLICATION_NOT_FOUND";
    throw error;
  }

  // Verifikasi isolasi sekolah
  if (requestingSchoolId && application.student.schoolId !== requestingSchoolId) {
    const error = new Error("Forbidden: You can only reject applications belonging to your own school");
    error.statusCode = 403;
    error.code = "FORBIDDEN_SCHOOL_APPLICATION";
    throw error;
  }

  if (application.onchainStatus !== "AWAITING_REVIEW") {
    const error = new Error(`Application status is ${application.onchainStatus}, expected AWAITING_REVIEW`);
    error.statusCode = 409;
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }

  logger.info(`[Blockchain] Rejecting application onchainId: ${application.onchainId}...`);

  const tx = await escrow.rejectApplication(application.onchainId);
  const receipt = await tx.wait();

  await prisma.application.update({
    where: { id: applicationId },
    data: { onchainStatus: "REJECTED" },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Application",
      entityId: applicationId,
      action: "REJECTED_ONCHAIN",
      actorRole: "SCHOOL",
      txHash: receipt.hash,
      metadata: { onchainId: application.onchainId.toString() },
    },
  });

  logger.info(`[Blockchain] Application rejected. TxHash: ${receipt.hash}`);

  return {
    applicationId,
    txHash: receipt.hash,
    onchainStatus: "REJECTED",
  };
};

/**
 * FR: distributeAid() — Pemerintah mencairkan dana langsung ke wallet siswa
 */
export const distributeAidOnChain = async (applicationId) => {
  const govSigner = getGovernmentSigner();
  const escrow = getEscrowContractWithSigner(govSigner);

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { student: true },
  });

  if (!application || application.onchainId === null) {
    const error = new Error("Application not found or not yet submitted on-chain");
    error.statusCode = 404;
    error.code = "APPLICATION_NOT_FOUND";
    throw error;
  }

  if (application.onchainStatus !== "VERIFIED") {
    const error = new Error(`Application status is ${application.onchainStatus}, expected VERIFIED`);
    error.statusCode = 409;
    error.code = "INVALID_STATUS_TRANSITION";
    throw error;
  }

  if (!application.student.walletAddress) {
    const error = new Error("Student has not bound a Web3 wallet yet");
    error.statusCode = 422;
    error.code = "WALLET_NOT_BOUND";
    throw error;
  }

  logger.info(`[Blockchain] Distributing aid for onchainId: ${application.onchainId} → ${application.student.walletAddress}...`);

  // Sinkronisasi beneficiary on-chain jika berbeda dengan wallet aktif siswa di DB
  try {
    const onchainApp = await escrow.applications(application.onchainId);
    if (onchainApp.beneficiary && onchainApp.beneficiary.toLowerCase() !== application.student.walletAddress.toLowerCase()) {
      logger.info(`[Blockchain] Updating beneficiary on-chain from ${onchainApp.beneficiary} to ${application.student.walletAddress}...`);
      const updateTx = await escrow.updateBeneficiary(application.onchainId, application.student.walletAddress);
      await updateTx.wait();
    }
  } catch (syncErr) {
    logger.warn(`[Blockchain] Could not sync beneficiary on-chain: ${syncErr.message}`);
  }

  const tx = await escrow.distributeAid(application.onchainId);
  const receipt = await tx.wait();

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      onchainStatus: "DISTRIBUTED",
      txDistributeHash: receipt.hash,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Application",
      entityId: applicationId,
      action: "AID_DISTRIBUTED",
      actorRole: "GOVERNMENT",
      txHash: receipt.hash,
      metadata: {
        onchainId: application.onchainId.toString(),
        recipientWallet: application.student.walletAddress,
        amount: application.amount ? application.amount.toString() : "0",
      },
    },
  });

  logger.info(`[Blockchain] Aid distributed. TxHash: ${receipt.hash}`);

  return {
    applicationId,
    txHash: receipt.hash,
    onchainStatus: "DISTRIBUTED",
    recipientWallet: application.student.walletAddress,
  };
};

/**
 * FR: setSchoolValidator() — Daftarkan/cabut wallet validator sekolah
 */
export const setSchoolValidatorOnChain = async (validatorWallet, allowed) => {
  const govSigner = getGovernmentSigner();
  const escrow = getEscrowContractWithSigner(govSigner);

  logger.info(`[Blockchain] Setting school validator: ${validatorWallet} → allowed=${allowed}`);

  const tx = await escrow.setSchoolValidator(validatorWallet, allowed);
  const receipt = await tx.wait();

  // Jika mendaftarkan, update school record di DB
  if (allowed) {
    await prisma.school.updateMany({
      where: { validatorWallet: { equals: validatorWallet, mode: "insensitive" } },
      data: { validatorWallet: validatorWallet.toLowerCase() },
    });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "School",
      entityId: validatorWallet,
      action: allowed ? "VALIDATOR_GRANTED" : "VALIDATOR_REVOKED",
      actorRole: "GOVERNMENT",
      txHash: receipt.hash,
      metadata: { validatorWallet, allowed },
    },
  });

  logger.info(`[Blockchain] Validator updated. TxHash: ${receipt.hash}`);

  return { txHash: receipt.hash, validatorWallet, allowed };
};

/**
 * Read-only: Ambil statistik escrow langsung dari blockchain
 */
export const getEscrowStats = async () => {
  const [totalFunded, totalDistributed, escrowBalance, escrowAddress, tokenAddress] = await Promise.all([
    escrowContract.totalFunded(),
    escrowContract.totalDistributed(),
    tokenContract.balanceOf(await escrowContract.getAddress()),
    escrowContract.getAddress(),
    tokenContract.getAddress(),
  ]);

  return {
    totalFunded: totalFunded.toString(),
    totalDistributed: totalDistributed.toString(),
    escrowBalance: escrowBalance.toString(),
    contractAddress: escrowAddress,
    tokenAddress: tokenAddress,
  };
};
