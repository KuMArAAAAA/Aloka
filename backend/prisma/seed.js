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
  console.log("🌱 Starting Aloka 4-Student Database Seeding...");

  deriveDemoWallets();
  const defaultPasswordHash = await bcrypt.hash("Password123!", 10);
  const ACADEMIC_YEAR = "2025/2026";

  // Bersihkan data lama
  await prisma.auditLog.deleteMany();
  try { await prisma.$executeRawUnsafe('DELETE FROM "claims"'); } catch (_) {}
  await prisma.application.deleteMany();
  await prisma.schoolRecommendation.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

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
      npsn: "20503456",
      name: "SMKN 3 Surabaya",
      address: "Jl. Pemuda No. 88, Surabaya",
      schoolUserEmail: "smkn3sby@sekolah.id",
    },
  ];

  const schools = [];
  for (const s of schoolsData) {
    const school = await prisma.school.upsert({
      where: { npsn: s.npsn },
      update: {},
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
    console.log(`✅ School: ${school.name}`);
  }

  // ============================
  // 3. STUDENTS (4 SISWA: 1 SMA + 3 SMP — Nabila sebagai siswa "terverifikasi NISN, belum mengajukan")
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
      walletBound: false,
    },
    {
      roleKey: "student_rizky_smp",
      nisn: "0089012345",
      fullName: "Rizky Ramadhan",
      dob: "2011-03-12",
      phone: "087812345001",
      grade: "SMP",
      schoolIdx: 2,
      walletBound: false,
    },
    {
      roleKey: "student_agus_smp",
      nisn: "0033345678",
      fullName: "Agus Setiawan",
      dob: "2009-03-18",
      phone: "084567890123",
      grade: "SMP",
      schoolIdx: 2,
      walletBound: false,
    },
    // Siswa ke-4: NISN terdaftar (terverifikasi) di sistem, TANPA application row
    // (belum pernah mengajukan PIP ke sekolah). Inilah profil "verified NISN, belum mengajukan".
    {
      roleKey: "student_nabila_smp",
      nisn: "0071234589",
      fullName: "Nabila Zahra",
      dob: "2012-07-25",
      phone: "087812345002",
      grade: "SMP",
      schoolIdx: 2,
      walletBound: false,
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
      },
      create: {
        nisn: s.nisn,
        fullName: s.fullName,
        dateOfBirth: new Date(s.dob),
        phoneOrEmail: s.phone,
        gradeLevel: s.grade,
        isActive: true,
        schoolId: schools[s.schoolIdx].id,
        walletAddress: walletAddr,
        walletBoundAt: walletAddr ? new Date() : null,
      },
    });
    students.push({ ...student, roleKey: s.roleKey, schoolIdx: s.schoolIdx });
    console.log(`✅ Student: ${student.fullName} (NISN ${student.nisn})`);
  }

  // ============================
  // 4. RECOMMENDATIONS
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

  // ============================
  // 5. APPLICATIONS (3 SISWA — Nabila idx 3 TIDAK punya application row)
  // Budi (idx 0) -> VERIFIED (Siap Klaim di Demo!)
  // Rizky (idx 1) -> VERIFIED (Siap Klaim SMP)
  // Agus (idx 2) -> AWAITING_REVIEW (Menunggu verifikasi sekolah)
  // ============================
  const applicationPipeline = [
    { idx: 0, status: "VERIFIED", amount: PIP_AMOUNTS.SMA },       // Budi (SMA) - Siap Klaim!
    { idx: 1, status: "VERIFIED", amount: PIP_AMOUNTS.SMP },       // Rizky (SMP) - Siap Klaim
    { idx: 2, status: "AWAITING_REVIEW", amount: PIP_AMOUNTS.SMP },// Agus (SMP) - Menunggu Verifikasi
    // idx 3 = Nabila — TIDAK punya application row (terverifikasi NISN, belum mengajukan ke sekolah)
  ];

  const fakeTxHash = (prefix) =>
    "0x" + prefix + Array.from({ length: 64 - prefix.length }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");

  const fakeAppHash = (nisn) =>
    ethers.keccak256(ethers.toUtf8Bytes(`${nisn}-${ACADEMIC_YEAR}-${Date.now()}`));

  for (const item of applicationPipeline) {
    const student = students[item.idx];
    const appHash = fakeAppHash(student.nisn);

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
          ? "NISN tidak terdaftar di DTKS Kemensos"
          : null,
      },
    });
    console.log(`✅ Application #${app.id.slice(0, 8)}: ${student.fullName} → status ${item.status} (${formatIDR(item.amount)})`);
  }

  console.log("🎉 Seeding 4 Siswa Selesai! Budi (SMA) & Rizky (SMP) VERIFIED siap klaim. Agus (SMP) AWAITING_REVIEW. Nabila (SMP) NISN terverifikasi tanpa application — siap demo alur 'submit pertama kali'.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
