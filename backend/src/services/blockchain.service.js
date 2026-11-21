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

  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    error.code = "APPLICATION_NOT_FOUND";
    throw error;
  }

  // Jika onchainId null, lakukan auto-register on-chain:
  //   1) submitApplication — 1-arg variant (deployed contract support, beneficiary = gov signer)
  //      Fallback ke 2-arg variant (untu deployment baru dengan overload) agar student wallet jadi beneficiary
  //   2) verifyApplication via school signer
  //   3) distributeAid via gov signer
  //   4) Off-chain ERC20 transfer gov -> student wallet bila beneficiary on-chain != student wallet
  // TIDAK ADA fake-hash fallback — error dilempar apa adanya supaya audit trail bersih.
  if (application.onchainId === null) {
    logger.info(`[Blockchain] onchainId is null for application ${applicationId}. Auto-registering on-chain...`);

    let subReceipt;
    let beneficiaryOnChain = govSigner.address;
    let submitStrategyUsed;
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    try {
      // 1-arg variant — gov signer = beneficiary (works on currently deployed Polygon Amoy contract)
      const subTx = await escrow["submitApplication(bytes32)"](application.applicationHash, {
        gasLimit: 300_000, gasPrice,
      });
      subReceipt = await subTx.wait();
      if (subReceipt.status !== 1) throw new Error(`submitApplication(bytes32) tx status ${subReceipt.status}`);
      submitStrategyUsed = "1-arg (gov signer = beneficiary)";
    } catch (err1) {
      logger.warn(`[Blockchain] 1-arg submitApplication failed: ${err1.shortMessage || err1.message}. Trying 2-arg variant...`);
      try {
        const subTx2 = await escrow["submitApplication(bytes32,address)"](
          application.applicationHash,
          application.student.walletAddress,
          { gasLimit: 300_000, gasPrice }
        );
        subReceipt = await subTx2.wait();
        if (subReceipt.status !== 1) throw new Error(`submitApplication(bytes32,address) tx status ${subReceipt.status}`);
        beneficiaryOnChain = application.student.walletAddress;
        submitStrategyUsed = "2-arg (student wallet = beneficiary)";
      } catch (err2) {
        const error = new Error(`On-chain submitApplication failed (both 1-arg & 2-arg variants reverted). Last error: ${err2.shortMessage || err2.message}`);
        error.statusCode = 502;
        error.code = "ONCHAIN_SUBMIT_FAILED";
        throw error;
      }
    }

    // Extract onchainId directly from receipt logs (topics[1] is indexed applicationId
    // in BOTH deployed bytecode (ApplicationSubmitted(uint256,address,bytes32), topic0
    // 0x3cb64c06...) AND latest source (ApplicationSubmitted(uint256,address,address,bytes32),
    // topic0 0x132923a7...). parseEventFromReceipt fails because the ABI tracks the latest
    // source signature, not the deployed contract — so parse it manually.
    const APP_SUB_TOPICS = [
      ethers.id("ApplicationSubmitted(uint256,address,bytes32)"), // deployed bytecode (Polygon Amoy)
      ethers.id("ApplicationSubmitted(uint256,address,address,bytes32)"), // current source
    ];
    const log = subReceipt.logs.find((l) =>
      l.topics?.[0] && APP_SUB_TOPICS.includes(l.topics[0].toLowerCase())
    );
    if (!log || !log.topics[1]) {
      const error = new Error("ApplicationSubmitted event not emitted from submit tx");
      error.statusCode = 502;
      error.code = "ONCHAIN_EVENT_MISSING";
      throw error;
    }
    application.onchainId = BigInt(log.topics[1]);
    logger.info(`[Blockchain] Submitted. onchainId=${application.onchainId.toString()} | strategy=${submitStrategyUsed} | beneficiary=${beneficiaryOnChain} | topic0=${log.topics[0].slice(0, 18)}...`);

    // Auto-verify via school signer
    const schoolSigner = getSchoolSigner();
    const schoolEscrow = getEscrowContractWithSigner(schoolSigner);
    const verTx = await schoolEscrow.verifyApplication(
      application.onchainId,
      application.amount || 750000,
      { gasLimit: 200_000, gasPrice: await provider.getFeeData().then(f => f.gasPrice) }
    );
    const verReceipt = await verTx.wait();
    if (verReceipt.status !== 1) {
      const error = new Error(`verifyApplication tx reverted (status ${verReceipt.status})`);
      error.statusCode = 502;
      error.code = "ONCHAIN_VERIFY_FAILED";
      throw error;
    }

    application.onchainStatus = "VERIFIED";
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        onchainId: application.onchainId,
        onchainStatus: "VERIFIED",
        txSubmitHash: subReceipt.hash,
        txVerifyHash: verReceipt.hash,
      },
    });
    await prisma.auditLog.create({
      data: {
        entityType: "Application",
        entityId: applicationId,
        action: "ONCHAIN_SUBMIT_AND_VERIFY",
        actorRole: "GOVERNMENT",
        txHash: subReceipt.hash,
        metadata: {
          onchainId: application.onchainId.toString(),
          verifyTxHash: verReceipt.hash,
          beneficiaryOnChain,
          submitStrategy: submitStrategyUsed,
        },
      },
    });
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

  logger.info(`[Blockchain] Distributing aid for onchainId: ${application.onchainId.toString()} → ${application.student.walletAddress}...`);

  // Catatan: deployed Polygon Amoy escrow TIDAK punya updateBeneficiary — calling
  // it would leak a nonce from NonceManager (estimateGas reverts, internal counter
  // still increments → next tx skips an on-chain nonce → stuck in mempool forever).
  // Untuk kontrak yang sudah didistribusikan, beneficiary on-chain = gov signer
  // (via 1-arg submitApplication variant), dan di-balance dengan off-chain ERC20
  // transfer gov → student wallet POST-distribute (lihat bawah). Blok sink
  // updateBeneficiary di-skip sepenuhnya untuk kontrak ini.

  // Hardcoded gas price for Polygon Amoy (public RPC's getFeeData() sometimes
  // returns null gasPrice which makes the gas-aware call silently hang).
  // 80 gwei keeps tx competitive with typical Amoy conditions (~60 gwei).
  const GAS_PRICE_FIXED = ethers.parseUnits("80", "gwei");

  logger.info(`[Blockchain] Sending distributeAid onchainId=${application.onchainId.toString()} (gasPrice 80 gwei fixed)...`);
  const tx = await escrow.distributeAid(application.onchainId, {
    gasLimit: 300_000, gasPrice: GAS_PRICE_FIXED,
  });
  logger.info(`[Blockchain] distributeAid tx broadcast: ${tx.hash} nonce=${tx.nonce}. Waiting for receipt...`);
  const receipt = await tx.wait();
  logger.info(`[Blockchain] distributeAid receipt: block=${receipt.blockNumber} status=${receipt.status} gas=${receipt.gasUsed.toString()} logs=${receipt.logs.length}`);
  if (receipt.status !== 1) {
    const error = new Error(`distributeAid tx reverted (status ${receipt.status})`);
    error.statusCode = 502;
    error.code = "DISTRIBUTE_TX_REVERTED";
    throw error;
  }

  // Bila beneficiary on-chain != student wallet (kasus 1-arg variant), lakukan
  // off-chain ERC20 transfer mIDR dari gov signer (yang nerima distribute) -> student wallet,
  // supaya siswa benar-benar menerima dana bantuan.
  const onchainAppAfter = await escrow.applications(application.onchainId);
  const distAmount = application.amount || 750000;
  let transferTxHash = null;
  if (onchainAppAfter.beneficiary.toLowerCase() !== application.student.walletAddress.toLowerCase()) {
    logger.info(`[Blockchain] On-chain beneficiary is ${onchainAppAfter.beneficiary}. Off-chain transferring ${distAmount.toString()} mIDR → student wallet ${application.student.walletAddress}...`);
    const token = getTokenContractWithSigner(govSigner);
    const transferTx = await token.transfer(application.student.walletAddress, distAmount, {
      gasLimit: 100_000, gasPrice: GAS_PRICE_FIXED,
    });
    logger.info(`[Blockchain] Off-chain transfer tx broadcast: ${transferTx.hash}. Waiting for receipt...`);
    const transferReceipt = await transferTx.wait();
    logger.info(`[Blockchain] Off-chain transfer receipt: status=${transferReceipt.status} gas=${transferReceipt.gasUsed.toString()}`);
    if (transferReceipt.status !== 1) {
      const error = new Error(`Off-chain transfer to student wallet reverted (status ${transferReceipt.status})`);
      error.statusCode = 502;
      error.code = "TRANSFER_TX_REVERTED";
      throw error;
    }
    transferTxHash = transferReceipt.hash;
    logger.info(`[Blockchain] Off-chain transfer complete. TxHash: ${transferTxHash}`);
  }

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
      action: "ONCHAIN_DISTRIBUTE",
      actorRole: "GOVERNMENT",
      txHash: receipt.hash,
      metadata: {
        onchainId: application.onchainId.toString(),
        beneficiaryOnChain: onchainAppAfter.beneficiary,
        recipientWallet: application.student.walletAddress,
        amount: application.amount ? application.amount.toString() : "0",
        transferTxHash,
      },
    },
  });
  if (transferTxHash) {
    await prisma.auditLog.create({
      data: {
        entityType: "Application",
        entityId: applicationId,
        action: "OFFCHAIN_TRANSFER_TO_STUDENT",
        actorRole: "GOVERNMENT",
        txHash: transferTxHash,
        metadata: {
          from: govSigner.address,
          to: application.student.walletAddress,
          amount: application.amount ? application.amount.toString() : "0",
        },
      },
    });
  }

  logger.info(`[Blockchain] Aid distributed. distributeTx=${receipt.hash}${transferTxHash ? ` transferTx=${transferTxHash}` : ""}`);

  return {
    applicationId,
    txHash: receipt.hash,
    onchainStatus: "DISTRIBUTED",
    recipientWallet: application.student.walletAddress,
    amount: application.amount ? application.amount.toString() : "0",
    transferTxHash,
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
