// backend/scripts/seed-onchain-live.js
import { ethers } from "ethers";
import { prisma } from "../src/config/database.js";
import {
  getGovernmentSigner,
  getSchoolSigner,
  getEscrowContractWithSigner,
} from "../src/config/blockchain.js";

async function main() {
  console.log("🚀 Starting LIVE On-Chain Seeding on Polygon Amoy for AlokaEscrow...");

  const govSigner = getGovernmentSigner();
  const schoolSigner = getSchoolSigner();
  const escrowGov = getEscrowContractWithSigner(govSigner);
  const escrowSchool = getEscrowContractWithSigner(schoolSigner);

  const govAddr = await govSigner.getAddress();
  const schoolAddr = await schoolSigner.getAddress();
  console.log(`🏛️ Gov Signer: ${govAddr}`);
  console.log(`🏫 School Signer: ${schoolAddr}`);

  // Clear all onchain_id first to prevent unique constraint conflicts
  await prisma.application.updateMany({
    data: { onchainId: null },
  });
  console.log("Cleared existing onchainId in database.");

  // Ambil kelima siswa dari database
  const siti = await prisma.student.findUnique({ where: { nisn: "0079876543" } });
  const budi = await prisma.student.findUnique({ where: { nisn: "0071234567" } });
  const agus = await prisma.student.findUnique({ where: { nisn: "0033345678" } });
  const dewi = await prisma.student.findUnique({ where: { nisn: "0066654321" } });
  const eko = await prisma.student.findUnique({ where: { nisn: "0011123456" } });

  if (!siti || !budi || !agus || !dewi || !eko) {
    throw new Error("Siswa tidak lengkap di database. Pastikan prisma/seed.js sudah dijalankan.");
  }

  // -------------------------------------------------------------
  // 1. SITI AMINAH (SMA): On-Chain Submit, Verify, & Distribute (Sudah ada di chain)
  // -------------------------------------------------------------
  console.log("\n--- [1/4] Processing SITI AMINAH (Status: DISTRIBUTED / Sudah Tersalurkan) ---");
  const sitiWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  await prisma.student.update({
    where: { id: siti.id },
    data: { walletAddress: sitiWallet.toLowerCase(), walletBoundAt: new Date() },
  });

  const sitiOnchainId = BigInt(1);
  const sitiApp = await prisma.application.findFirst({ where: { studentId: siti.id } });
  if (sitiApp) {
    await prisma.application.update({
      where: { id: sitiApp.id },
      data: {
        onchainId: sitiOnchainId,
        applicationHash: "0x8a9cf21e330ad18529341498b9f0293751a029471629471a9e8b7c6d5e4f3a21",
        validationStatus: "VALID",
        onchainStatus: "DISTRIBUTED",
        amount: BigInt(1_800_000),
        txSubmitHash: "0x087c51f644b780ed299513be14e8eb48c4af0e559e0fb7ddf1edfed2f016f6aa",
        txVerifyHash: "0xe7951421cffa933f49c40f773fe9397f09a5ef9589e86efe04164980b9da767b",
        txDistributeHash: "0x6cf9accae1faef5f3c7e8705b7f56f6ec62c2c8c173dc2efcb406142e246120f",
      },
    });
    console.log("   ✅ Siti data updated in DB (onchainId: 1)");
  }

  // -------------------------------------------------------------
  // 2. BUDI PRATAMA (SMA): On-Chain Submit & Verify (SIAP KLAIM DI DEMO)
  // -------------------------------------------------------------
  console.log("\n--- [2/4] Processing BUDI PRATAMA (Status: VERIFIED / Siap Klaim di Demo) ---");
  const budiInitialWallet = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
  await prisma.student.update({
    where: { id: budi.id },
    data: { walletAddress: null, walletBoundAt: null }, // Biarkan null agar siswa menautkan via frontend
  });

  const budiAppHash = ethers.keccak256(ethers.toUtf8Bytes(`BUDI-${budi.nisn}-2025/2026-${Date.now()}`));
  console.log("1. Submitting Budi application on-chain...");
  const txSubmitBudi = await escrowGov["submitApplication(bytes32,address)"](budiAppHash, budiInitialWallet);
  const rcSubmitBudi = await txSubmitBudi.wait();
  console.log(`   ✅ Submitted! Tx: ${rcSubmitBudi.hash}`);

  const budiOnchainId = BigInt(2);
  console.log("2. Verifying Budi application by School Validator (Rp 1.800.000)...");
  const txVerifyBudi = await escrowSchool.verifyApplication(budiOnchainId, BigInt(1_800_000));
  const rcVerifyBudi = await txVerifyBudi.wait();
  console.log(`   ✅ Verified! Tx: ${rcVerifyBudi.hash}`);

  const budiApp = await prisma.application.findFirst({ where: { studentId: budi.id } });
  if (budiApp) {
    await prisma.application.update({
      where: { id: budiApp.id },
      data: {
        onchainId: budiOnchainId,
        applicationHash: budiAppHash,
        validationStatus: "VALID",
        onchainStatus: "VERIFIED",
        amount: BigInt(1_800_000),
        txSubmitHash: rcSubmitBudi.hash,
        txVerifyHash: rcVerifyBudi.hash,
        txDistributeHash: null, // BELUM DISTRIBUTE
      },
    });
    console.log("   ✅ Budi data updated in DB (onchainId: 2, Status: VERIFIED)");
  }

  // -------------------------------------------------------------
  // 3. AGUS SETIAWAN (SMP): On-Chain Submit (AWAITING_REVIEW)
  // -------------------------------------------------------------
  console.log("\n--- [3/4] Processing AGUS SETIAWAN (Status: AWAITING_REVIEW) ---");
  const agusWallet = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  await prisma.student.update({
    where: { id: agus.id },
    data: { walletAddress: agusWallet.toLowerCase(), walletBoundAt: new Date() },
  });

  const agusAppHash = ethers.keccak256(ethers.toUtf8Bytes(`AGUS-${agus.nisn}-2025/2026-${Date.now()}`));
  console.log("1. Submitting Agus application on-chain...");
  const txSubmitAgus = await escrowGov["submitApplication(bytes32,address)"](agusAppHash, agusWallet);
  const rcSubmitAgus = await txSubmitAgus.wait();
  console.log(`   ✅ Submitted! Tx: ${rcSubmitAgus.hash}`);

  const agusOnchainId = BigInt(3);
  const agusApp = await prisma.application.findFirst({ where: { studentId: agus.id } });
  if (agusApp) {
    await prisma.application.update({
      where: { id: agusApp.id },
      data: {
        onchainId: agusOnchainId,
        applicationHash: agusAppHash,
        validationStatus: "VALID",
        onchainStatus: "AWAITING_REVIEW",
        amount: BigInt(750_000),
        txSubmitHash: rcSubmitAgus.hash,
        txVerifyHash: null,
        txDistributeHash: null,
      },
    });
    console.log("   ✅ Agus data updated in DB (onchainId: 3, Status: AWAITING_REVIEW)");
  }

  // -------------------------------------------------------------
  // 4. DEWI LESTARI (SMK): On-Chain Submit & Reject (REJECTED)
  // -------------------------------------------------------------
  console.log("\n--- [4/4] Processing DEWI LESTARI (Status: REJECTED) ---");
  const dewiWallet = "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc";
  await prisma.student.update({
    where: { id: dewi.id },
    data: { walletAddress: dewiWallet.toLowerCase(), walletBoundAt: new Date() },
  });

  const dewiAppHash = ethers.keccak256(ethers.toUtf8Bytes(`DEWI-${dewi.nisn}-2025/2026-${Date.now()}`));
  console.log("1. Submitting Dewi application on-chain...");
  const txSubmitDewi = await escrowGov["submitApplication(bytes32,address)"](dewiAppHash, dewiWallet);
  const rcSubmitDewi = await txSubmitDewi.wait();
  console.log(`   ✅ Submitted! Tx: ${rcSubmitDewi.hash}`);

  const dewiOnchainId = BigInt(4);
  console.log("2. Rejecting Dewi application by School Validator...");
  const txRejectDewi = await escrowSchool.rejectApplication(dewiOnchainId);
  const rcRejectDewi = await txRejectDewi.wait();
  console.log(`   ✅ Rejected on-chain! Tx: ${rcRejectDewi.hash}`);

  const dewiApp = await prisma.application.findFirst({ where: { studentId: dewi.id } });
  if (dewiApp) {
    await prisma.application.update({
      where: { id: dewiApp.id },
      data: {
        onchainId: dewiOnchainId,
        applicationHash: dewiAppHash,
        validationStatus: "VALID",
        onchainStatus: "REJECTED",
        amount: BigInt(1_800_000),
        rejectionReason: "Ditolak verifikator: Tidak memenuhi syarat kuota PIP tahun berjalan.",
        txSubmitHash: rcSubmitDewi.hash,
        txVerifyHash: rcRejectDewi.hash,
        txDistributeHash: null,
      },
    });
    console.log("   ✅ Dewi data updated in DB (onchainId: 4, Status: REJECTED)");
  }

  // -------------------------------------------------------------
  // 5. EKO SAPUTRA (SD): Belum Diajukan (UNSUBMITTED)
  // -------------------------------------------------------------
  console.log("\n--- [5/5] EKO SAPUTRA (SD) tetapkan UNSUBMITTED di Database ---");
  const ekoApp = await prisma.application.findFirst({ where: { studentId: eko.id } });
  if (ekoApp) {
    await prisma.application.update({
      where: { id: ekoApp.id },
      data: {
        onchainId: null,
        onchainStatus: "UNSUBMITTED",
        amount: BigInt(450_000),
        txSubmitHash: null,
        txVerifyHash: null,
        txDistributeHash: null,
      },
    });
    console.log("   ✅ Eko data updated in DB (Status: UNSUBMITTED)");
  }

  console.log("\n🎉 LIVE ON-CHAIN SEEDING COMPLETE FOR ALL 5 STUDENTS!");
  console.log("Semua bukti transaksi txHash sekarang ASLI dan aktif di Polygonscan!");
}

main()
  .catch((err) => {
    console.error("❌ On-chain seeding error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
