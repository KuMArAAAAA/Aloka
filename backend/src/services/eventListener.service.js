// src/services/eventListener.service.js
import {
  escrowContract,
  provider,
} from "../config/blockchain.js";
import { prisma } from "../config/database.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

const SYNC_CONSUMER_NAME = "aloka_escrow_amoy";

/**
 * Update block checkpoint secara idempotent
 */
export const updateBlockCheckpoint = async (blockNumber) => {
  if (!blockNumber) return;
  try {
    await prisma.eventSyncState.upsert({
      where: { consumerName: SYNC_CONSUMER_NAME },
      create: {
        consumerName: SYNC_CONSUMER_NAME,
        lastProcessedBlock: BigInt(blockNumber),
      },
      update: {
        lastProcessedBlock: BigInt(blockNumber),
      },
    });
  } catch (err) {
    logger.warn(`[EventListener] Failed to persist block checkpoint ${blockNumber}: ${err.message}`);
  }
};

/**
 * Catat audit log secara idempotent (mencegah duplicate audit logs saat replay/duplicate events)
 */
export const createIdempotentAuditLog = async ({
  entityType,
  entityId,
  action,
  actorRole = "SYSTEM",
  txHash,
  metadata = null,
}) => {
  if (txHash) {
    const existing = await prisma.auditLog.findFirst({
      where: {
        action,
        txHash,
      },
    });
    if (existing) {
      return existing;
    }
  }

  return await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      actorRole,
      txHash,
      metadata,
    },
  });
};

/**
 * Event Listener Service
 * Mendengarkan event on-chain dari AlokaEscrow dan menyinkronkan status ke database
 * Berjalan sebagai background process di server.js
 */
export const startEventListener = async () => {
  if (!env.ESCROW_CONTRACT_ADDRESS) {
    logger.warn("[EventListener] ESCROW_CONTRACT_ADDRESS not configured. Event listener skipped.");
    return;
  }

  logger.info("[EventListener] Starting AlokaEscrow event listener on Polygon Amoy...");

  // --- Event: ApplicationSubmitted ---
  escrowContract.on(
    "ApplicationSubmitted",
    async (applicationId, student, applicationHash, event) => {
      try {
        const txHash = event?.log?.transactionHash;
        const blockNumber = event?.log?.blockNumber;
        logger.info(`[EventListener] ApplicationSubmitted: onchainId=${applicationId}, student=${student}`);

        await prisma.application.updateMany({
          where: { applicationHash: applicationHash },
          data: {
            onchainId: applicationId,
            onchainStatus: "AWAITING_REVIEW",
            txSubmitHash: txHash,
          },
        });

        await createIdempotentAuditLog({
          entityType: "Application",
          entityId: applicationHash,
          action: "ONCHAIN_SUBMITTED_EVENT",
          actorRole: "SYSTEM",
          txHash,
          metadata: { onchainId: applicationId.toString(), student },
        });

        await updateBlockCheckpoint(blockNumber);
      } catch (err) {
        logger.error(`[EventListener] Error handling ApplicationSubmitted: ${err.message}`);
      }
    }
  );

  // --- Event: ApplicationVerified ---
  escrowContract.on(
    "ApplicationVerified",
    async (applicationId, validator, event) => {
      try {
        const txHash = event?.log?.transactionHash;
        const blockNumber = event?.log?.blockNumber;
        logger.info(`[EventListener] ApplicationVerified: onchainId=${applicationId}`);

        await prisma.application.updateMany({
          where: { onchainId: applicationId },
          data: {
            onchainStatus: "VERIFIED",
            txVerifyHash: txHash,
          },
        });

        await createIdempotentAuditLog({
          entityType: "Application",
          entityId: applicationId.toString(),
          action: "ONCHAIN_VERIFIED_EVENT",
          actorRole: "SYSTEM",
          txHash,
          metadata: { onchainId: applicationId.toString(), validator },
        });

        await updateBlockCheckpoint(blockNumber);
      } catch (err) {
        logger.error(`[EventListener] Error handling ApplicationVerified: ${err.message}`);
      }
    }
  );

  // --- Event: ApplicationRejected ---
  escrowContract.on(
    "ApplicationRejected",
    async (applicationId, validator, event) => {
      try {
        const txHash = event?.log?.transactionHash;
        const blockNumber = event?.log?.blockNumber;
        logger.info(`[EventListener] ApplicationRejected: onchainId=${applicationId}`);

        await prisma.application.updateMany({
          where: { onchainId: applicationId },
          data: { onchainStatus: "REJECTED" },
        });

        await createIdempotentAuditLog({
          entityType: "Application",
          entityId: applicationId.toString(),
          action: "ONCHAIN_REJECTED_EVENT",
          actorRole: "SYSTEM",
          txHash,
          metadata: { onchainId: applicationId.toString(), validator },
        });

        await updateBlockCheckpoint(blockNumber);
      } catch (err) {
        logger.error(`[EventListener] Error handling ApplicationRejected: ${err.message}`);
      }
    }
  );

  // --- Event: AidDistributed ---
  escrowContract.on(
    "AidDistributed",
    async (applicationId, student, amount, event) => {
      try {
        const txHash = event?.log?.transactionHash;
        const blockNumber = event?.log?.blockNumber;
        logger.info(`[EventListener] AidDistributed: onchainId=${applicationId}, student=${student}, amount=${amount}`);

        await prisma.application.updateMany({
          where: { onchainId: applicationId },
          data: {
            onchainStatus: "DISTRIBUTED",
            txDistributeHash: txHash,
          },
        });

        await createIdempotentAuditLog({
          entityType: "Application",
          entityId: applicationId.toString(),
          action: "ONCHAIN_DISTRIBUTED_EVENT",
          actorRole: "SYSTEM",
          txHash,
          metadata: {
            onchainId: applicationId.toString(),
            recipientWallet: student,
            amount: amount.toString(),
          },
        });

        await updateBlockCheckpoint(blockNumber);
      } catch (err) {
        logger.error(`[EventListener] Error handling AidDistributed: ${err.message}`);
      }
    }
  );

  // --- Event: Funded ---
  escrowContract.on("Funded", async (funder, amount, event) => {
    try {
      const txHash = event?.log?.transactionHash;
      const blockNumber = event?.log?.blockNumber;
      logger.info(`[EventListener] Funded: funder=${funder}, amount=${amount}`);

      await createIdempotentAuditLog({
        entityType: "Escrow",
        entityId: funder,
        action: "ONCHAIN_FUNDED_EVENT",
        actorRole: "SYSTEM",
        txHash,
        metadata: { funder, amount: amount.toString() },
      });

      await updateBlockCheckpoint(blockNumber);
    } catch (err) {
      logger.error(`[EventListener] Error handling Funded: ${err.message}`);
    }
  });

  // --- Event: ValidatorUpdated ---
  escrowContract.on("ValidatorUpdated", async (validator, allowed, event) => {
    try {
      const txHash = event?.log?.transactionHash;
      const blockNumber = event?.log?.blockNumber;
      logger.info(`[EventListener] ValidatorUpdated: validator=${validator}, allowed=${allowed}`);

      await createIdempotentAuditLog({
        entityType: "School",
        entityId: validator,
        action: allowed ? "ONCHAIN_VALIDATOR_GRANTED_EVENT" : "ONCHAIN_VALIDATOR_REVOKED_EVENT",
        actorRole: "SYSTEM",
        txHash,
        metadata: { validator, allowed },
      });

      await updateBlockCheckpoint(blockNumber);
    } catch (err) {
      logger.error(`[EventListener] Error handling ValidatorUpdated: ${err.message}`);
    }
  });

  // Error handler provider
  provider.on("error", (err) => {
    logger.error(`[EventListener] Provider error: ${err.message}`);
  });

  logger.info("[EventListener] ✅ Listening to: ApplicationSubmitted, ApplicationVerified, ApplicationRejected, AidDistributed, Funded, ValidatorUpdated");
};

export const stopEventListener = () => {
  escrowContract.removeAllListeners();
  logger.info("[EventListener] All event listeners removed.");
};
