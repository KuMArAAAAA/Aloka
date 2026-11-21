// backend/prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ethers } from "ethers";

const prisma = new PrismaClient();

// Mnemonic BIP39 valid (dari wordlist standar). Hanya untuk testnet Polygon Amoy.
const DEMO_MNEMONIC = "test test test test test test test test test test test junk";
const demoWallets = {};

function deriveDemoWallets() {
  const mnemonic = ethers.Mnemonic.fromPhrase(DEMO_MNEMONIC);
  const roles = [
    "gov_kpa",
    "school_sman1",
    "school_sman2",
    "school_smpn5",
    "school_sdn03",
    "school_smkn3",
    "student_budi_sma",
    "student_siti_sma",
    "student_agus_smp",
    "student_dewi_smk",
    "student_eko_sd",
    "student_rini_sma",
    "student_andi_smp",
    "student_maya_sd",
  ];
  roles.forEach((role, idx) => {
    const w = ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${idx}`);
    demoWallets[role] = { address: w.address, privateKey: w.privateKey };
  });
}

function formatIDR(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

async function main() {
  console.log("🌱 Starting Aloka comprehensive database seeding...");

  deriveDemoWallets();
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);
  const ACADEMIC_YEAR = "2025/2026";

  // ============================
  // 1. GOVERNMENT (KPA DJPb)
  // ============================
  const govUser = await prisma.user.upsert({
    where: { email: "admin@kemendikbud.go.id" },
    update: {},
    create: {
      email: "admin@kemendikbud.go.id",
      passwordHash: defaultPasswordHash,
      role: "GOVERNMENT",
    },
  });
  console.log(`✅ Government User: ${govUser.email}`);
  console.log(`   KPA Wallet (demo): ${demoWallets.gov_kpa.address}`);

  // ============================
  // 2. SCHOOLS (5 satuan pendidikan)
  // ============================
  const schoolsData = [
    {
      roleKey: "school_sman1",
      npsn: "20301234",
      name: "SMAN 1 Purwokerto",
      address: "Jl. Gatot Subroto No. 73, Purwokerto",
      schoolUserEmail: "sman1pwt@sekolah.id",
    },
    {
      roleKey: "school_sman2",
      npsn: "20304567",
      name: "SMAN 2 Jakarta",
      address: "Jl. Cikini Raya No. 55, Jakarta Pusat",
      schoolUserEmail: "sman2jkt@sekolah.id",
    },
    {
      roleKey: "school_smpn5",
      npsn: "20107890",
      name: "SMPN 5 Bandung",
      address: "Jl. Diponegoro No. 30, Bandung",
      schoolUserEmail: "smpn5bdg@sekolah.id",
    },
    {
      roleKey: "school_sdn03",
      npsn: "10102030",
      name: "SDN 03 Yogyakarta",
      address: "Jl. Malioboro No. 12, Yogyakarta",
      schoolUserEmail: "sdn03yog@sekolah.id",
    },
    {
      roleKey: "school_smkn3",
      npsn: "20308090",
      name: "SMKN 3 Surabaya",
      address: "Jl. Mayjen Sungkono No. 9, Surabaya",
      schoolUserEmail: "smkn3sby@sekolah.id",
    },
  ];

  const schools = [];
  for (const s of schoolsData) {
    const school = await prisma.school.upsert({
      where: { npsn: s.npsn },
      update: { validatorWallet: demoWallets[s.roleKey].address.toLowerCase() },
      create: {
        npsn: s.npsn,
        name: s.name,
        address: s.address,
        validatorWallet: demoWallets[s.roleKey].address.toLowerCase(),
      },
    });
    schools.push({ ...school, roleKey: s.roleKey, schoolUserEmail: s.schoolUserEmail });

    await prisma.user.upsert({
      where: { email: s.schoolUserEmail },
      update: { schoolId: school.id },
      create: {
        email: s.schoolUserEmail,
        passwordHash: defaultPasswordHash,
        role: "SCHOOL",
        schoolId: school.id,
      },
    });
    console.log(`✅ School: ${school.name} (NPSN ${school.npsn}, validator ${demoWallets[s.roleKey].address.slice(0, 10)}...)`);
  }

  // ============================
  // 3. STUDENTS (8 siswa, lintas jenjang)
  // ============================
  const studentsData = [
    {
      roleKey: "student_budi_sma",
      nisn: "0071234567",
      fullName: "Budi Pratama",
      dob: "2007-05-15",
      phone: "081234567890",
      grade: "SMA",
      schoolIdx: 0,
      walletBound: true,
    },
    {
      roleKey: "student_siti_sma",
      nisn: "0079876543",
      fullName: "Siti Aminah",
      dob: "2007-08-22",
      phone: "082345678901",
      grade: "SMA",
      schoolIdx: 0,
      walletBound: true,
    },
    {
      roleKey: "student_rini_sma",
      nisn: "0055512345",
      fullName: "Rini Wulandari",
      dob: "2008-01-10",
      phone: "083456789012",
      grade: "SMA",
      schoolIdx: 1,
      walletBound: true,
    },
    {
      roleKey: "student_agus_smp",
      nisn: "0033345678",
      fullName: "Agus Setiawan",
      dob: "2009-03-18",
      phone: "084567890123",
      grade: "SMP",
      schoolIdx: 2,
      walletBound: true,
    },
    {
      roleKey: "student_andi_smp",
      nisn: "0033398765",
      fullName: "Andi Pratama",
      dob: "2009-07-25",
      phone: "085678901234",
      grade: "SMP",
      schoolIdx: 2,
      walletBound: false,
    },
    {
      roleKey: "student_eko_sd",
      nisn: "0011123456",
      fullName: "Eko Saputra",
      dob: "2014-11-30",
      phone: "086789012345",
      grade: "SD",
      schoolIdx: 3,
      walletBound: true,
    },
    {
      roleKey: "student_maya_sd",
      nisn: "0011198765",
      fullName: "Maya Putri",
      dob: "2015-02-14",
      phone: "087890123456",
      grade: "SD",
      schoolIdx: 3,
      walletBound: false,
    },
    {
      roleKey: "student_dewi_smk",
      nisn: "0066654321",
      fullName: "Dewi Lestari",
      dob: "2006-09-05",
      phone: "088901234567",
      grade: "SMK",
      schoolIdx: 4,
      walletBound: true,
    },
  ];

  const students = [];
  for (const s of studentsData) {
    const walletAddr = s.walletBound
      ? demoWallets[s.roleKey].address.toLowerCase()
      : null;

    const student = await prisma.student.upsert({
      where: { nisn: s.nisn },
      update: {
        fullName: s.fullName,
        dateOfBirth: new Date(s.dob),
        phoneOrEmail: s.phone,
        gradeLevel: s.grade,
        isActive: true,
        schoolId: schools[s.schoolIdx].id,
        ...(walletAddr ? {
          walletAddress: walletAddr,
          walletBoundAt: new Date(),
        } : {}),
      },
      create: {
        nisn: s.nisn,
        fullName: s.fullName,
        dateOfBirth: new Date(s.dob),
        phoneOrEmail: s.phone,
        gradeLevel: s.grade,
        isActive: true,
        schoolId: schools[s.schoolIdx].id,
        ...(walletAddr ? {
          walletAddress: walletAddr,
          walletBoundAt: new Date(),
        } : {}),
      },
    });
    students.push({ ...student, roleKey: s.roleKey, walletBound: s.walletBound, schoolIdx: s.schoolIdx });
    console.log(`✅ Student: ${student.fullName} (NISN ${student.nisn}, ${student.gradeLevel})${walletAddr ? ` - wallet: ${walletAddr.slice(0, 10)}...` : " - no wallet"}`);
  }

  // ============================
  // 4. SCHOOL RECOMMENDATIONS (1 per student)
  // ============================
  const PIP_AMOUNTS = {
    SD: 450_000,
    SMP: 750_000,
    SMA: 1_800_000,
    SMK: 1_800_000,
  };

  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const refNum = `REC-${schools[s.schoolIdx].npsn}/${ACADEMIC_YEAR}/${String(i + 1).padStart(3, "0")}`;
    await prisma.schoolRecommendation.upsert({
      where: { studentId: s.id },
      update: {},
      create: {
        studentId: s.id,
        schoolId: schools[s.schoolIdx].id,
        referenceNumber: refNum,
        isApproved: true,
        approvedAt: new Date(Date.now() - i * 86400_000),
      },
    });
  }
  console.log(`✅ Recommendations created for all ${students.length} students`);

  // ============================
  // 5. APPLICATIONS (lintas status pipeline)
  // ============================
  // Pipeline: UNSUBMITTED → AWAITING_REVIEW → VERIFIED → DISTRIBUTED (or REJECTED)
  // Distribusi: 2 DISTRIBUTED, 2 VERIFIED, 2 AWAITING_REVIEW, 1 UNSUBMITTED, 1 REJECTED
  const applicationPipeline = [
    { idx: 0, status: "DISTRIBUTED", amount: PIP_AMOUNTS.SMA },       // Budi (SMA) - completed
    { idx: 3, status: "DISTRIBUTED", amount: PIP_AMOUNTS.SMP },       // Agus (SMP) - completed
    { idx: 1, status: "VERIFIED",    amount: PIP_AMOUNTS.SMA },       // Siti (SMA) - ready to distribute
    { idx: 6, status: "VERIFIED",    amount: PIP_AMOUNTS.SD },        // Eko (SD) - ready to distribute
    { idx: 2, status: "AWAITING_REVIEW", amount: PIP_AMOUNTS.SMA },   // Rini (SMA) - submitted, awaiting school verify
    { idx: 7, status: "AWAITING_REVIEW", amount: PIP_AMOUNTS.SMK },   // Dewi (SMK) - submitted
    { idx: 4, status: "UNSUBMITTED", amount: PIP_AMOUNTS.SMP },       // Andi (SMP) - recommendation only
    { idx: 5, status: "REJECTED",    amount: PIP_AMOUNTS.SD },        // Maya (SD) - rejected, fraud flag
  ];

  const fakeTxHash = (prefix) =>
    "0x" + prefix + Array.from({ length: 64 - prefix.length }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");

  const fakeAppHash = (nisn) =>
    ethers.keccak256(ethers.toUtf8Bytes(`${nisn}-${ACADEMIC_YEAR}-${Date.now()}`));

  const applications = [];
  for (const item of applicationPipeline) {
    const student = students[item.idx];
    const appHash = fakeAppHash(student.nisn);
    const schoolObj = schools[student.schoolIdx];

    let validationStatus = "VALID";
    if (item.status === "REJECTED") validationStatus = "REJECTED";

    const app = await prisma.application.create({
      data: {
        applicationHash: appHash,
        studentId: student.id,
        academicYear: ACADEMIC_YEAR,
        amount: BigInt(item.amount),
        validationStatus,
        onchainStatus: item.status,
        txSubmitHash: ["AWAITING_REVIEW", "VERIFIED", "DISTRIBUTED", "REJECTED"].includes(item.status)
          ? fakeTxHash("a1")
          : null,
        txVerifyHash: ["VERIFIED", "DISTRIBUTED"].includes(item.status)
          ? fakeTxHash("b2")
          : null,
        txDistributeHash: item.status === "DISTRIBUTED"
          ? fakeTxHash("c3")
          : null,
        fraudFlag: item.status === "REJECTED",
        rejectionReason: item.status === "REJECTED"
          ? "NISN duplikat terdeteksi pada tahun anggaran sebelumnya (Duplicate Beneficiary check gagal)"
          : null,
      },
    });
    applications.push(app);
    console.log(`✅ Application #${app.id.slice(0, 8)}: ${student.fullName} → status ${item.status} (${formatIDR(item.amount)})`);
  }

  // ============================
  // 6. AUDIT LOGS (mock on-chain events)
  // ============================
  const auditActions = [
    { app: applications[0], action: "ApplicationSubmitted", actor: "STUDENT", txField: "txSubmitHash" },
    { app: applications[0], action: "ApplicationVerified",  actor: "SCHOOL",  txField: "txVerifyHash" },
    { app: applications[0], action: "AidDistributed",       actor: "GOVERNMENT", txField: "txDistributeHash" },

    { app: applications[1], action: "ApplicationSubmitted", actor: "STUDENT", txField: "txSubmitHash" },
    { app: applications[1], action: "ApplicationVerified",  actor: "SCHOOL",  txField: "txVerifyHash" },
    { app: applications[1], action: "AidDistributed",       actor: "GOVERNMENT", txField: "txDistributeHash" },

    { app: applications[2], action: "ApplicationSubmitted", actor: "STUDENT", txField: "txSubmitHash" },
    { app: applications[2], action: "ApplicationVerified",  actor: "SCHOOL",  txField: "txVerifyHash" },

    { app: applications[3], action: "ApplicationSubmitted", actor: "STUDENT", txField: "txSubmitHash" },
    { app: applications[3], action: "ApplicationVerified",  actor: "SCHOOL",  txField: "txVerifyHash" },

    { app: applications[4], action: "ApplicationSubmitted", actor: "STUDENT", txField: "txSubmitHash" },
    { app: applications[5], action: "ApplicationSubmitted", actor: "STUDENT", txField: "txSubmitHash" },

    { app: applications[7], action: "ApplicationRejected",  actor: "SCHOOL",  txField: "txSubmitHash" },
  ];

  for (const log of auditActions) {
    await prisma.auditLog.create({
      data: {
        entityType: "Application",
        entityId: log.app.id,
        action: log.action,
        actorRole: log.actor,
        txHash: log.app[log.txField],
        metadata: {
          studentId: log.app.studentId,
          academicYear: log.app.academicYear,
          amount: log.app.amount?.toString(),
        },
      },
    });
  }
  console.log(`✅ Audit logs created: ${auditActions.length} on-chain event records`);

  // ============================
  // 7. EventSyncState (baseline block)
  // ============================
  await prisma.eventSyncState.upsert({
    where: { consumerName: "eventListener" },
    update: {},
    create: {
      consumerName: "eventListener",
      lastProcessedBlock: BigInt(0),
    },
  });
  console.log(`✅ EventSyncState baseline created`);

  // ============================
  // 8. Summary Print
  // ============================
  console.log("\n" + "=".repeat(60));
  console.log("📊 SEEDING SUMMARY");
  console.log("=".repeat(60));
  console.log(`Government (KPA) Wallet : ${demoWallets.gov_kpa.address}`);
  console.log(`School Validators        : ${schools.length} schools`);
  console.log(`Students                 : ${students.length} siswa`);
  console.log(`Applications             : ${applications.length} pipeline`);
  console.log(`  - DISTRIBUTED          : ${applications.filter(a => a.onchainStatus === "DISTRIBUTED").length}`);
  console.log(`  - VERIFIED             : ${applications.filter(a => a.onchainStatus === "VERIFIED").length}`);
  console.log(`  - AWAITING_REVIEW      : ${applications.filter(a => a.onchainStatus === "AWAITING_REVIEW").length}`);
  console.log(`  - UNSUBMITTED          : ${applications.filter(a => a.onchainStatus === "UNSUBMITTED").length}`);
  console.log(`  - REJECTED             : ${applications.filter(a => a.onchainStatus === "REJECTED").length}`);
  console.log("\n🔑 TEST LOGIN CREDENTIALS");
  console.log("=".repeat(60));
  console.log("[Siswa via Dapodik]");
  studentsData.forEach(s => {
    console.log(`  NISN: ${s.nisn} | DOB: ${s.dob} | ${s.fullName} (${s.gradeLevel})`);
  });
  console.log("\n[Admin/School via Email]");
  console.log("  admin@kemendikbud.go.id / Password123!  (GOVERNMENT)");
  schoolsData.forEach(s => {
    console.log(`  ${s.schoolUserEmail} / Password123!  (SCHOOL: ${s.name})`);
  });
  console.log("\n[Web3 Wallet Addresses for MetaMask Import]");
  Object.entries(demoWallets).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(20)} : ${v.address}`);
  });
  console.log("=".repeat(60));
  console.log("🎉 Comprehensive seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });