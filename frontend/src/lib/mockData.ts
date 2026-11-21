import { EscrowStatus } from "./utils";

export interface StudentRecord {
  id: number;
  nisn: string;
  name: string;
  schoolName: string;
  npsn: string;
  gradeLevel: "SD" | "SMP" | "SMA" | "SMK";
  classRank: string;
  walletAddress: string;
  amount: number;
  status: EscrowStatus;
  submissionDate: string;
  applicationHash: string;
  applicationDbId?: string;
  txHash?: string;
  verificationNotes?: string;
}

export interface SchoolValidator {
  name: string;
  address: string;
  active: boolean;
}

// 5 Siswa Resmi Terdaftar di Sistem Aloka PIP (Tahun Anggaran 2025/2026)
export const INITIAL_STUDENTS: StudentRecord[] = [
  {
    id: 1,
    nisn: "0079876543",
    name: "Siti Aminah",
    schoolName: "SMAN 1 Purwokerto",
    npsn: "20301234",
    gradeLevel: "SMA",
    classRank: "Siswa Aktif",
    walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    amount: 1800000,
    status: EscrowStatus.Tersalurkan,
    submissionDate: "2026-11-20",
    applicationHash: "0x8a9cf21e330ad18529341498b9f0293751a029471629471a9e8b7c6d5e4f3a21",
    txHash: "0x6cf9accae1faef5f3c7e8705b7f56f6ec62c2c8c173dc2efcb406142e246120f",
    verificationNotes: "Dana bantuan telah ditransfer langsung dari Escrow Vault ke dompet siswa on-chain.",
  },
  {
    id: 2,
    nisn: "0071234567",
    name: "Budi Pratama",
    schoolName: "SMAN 1 Purwokerto",
    npsn: "20301234",
    gradeLevel: "SMA",
    classRank: "Siswa Aktif",
    walletAddress: "",
    amount: 1800000,
    status: EscrowStatus.Terverifikasi,
    submissionDate: "2026-11-20",
    applicationHash: "0xb28b4ce4b7337cb019ad759b85c2c5101284a60b94371fa7a419516077a99",
    txHash: "0x9c3b11aa8dccb3fa360098b982d6e59866ee36f87e29cc874d95353f8ce5b832",
    verificationNotes: "Diverifikasi resmi oleh SMAN 1 Purwokerto. Menunggu pencairan (klaim) ke dompet Web3 siswa.",
  },
  {
    id: 3,
    nisn: "0033345678",
    name: "Agus Setiawan",
    schoolName: "SMPN 5 Bandung",
    npsn: "20107890",
    gradeLevel: "SMP",
    classRank: "Siswa Aktif",
    walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    amount: 750000,
    status: EscrowStatus.MenungguVerifikasi,
    submissionDate: "2026-11-19",
    applicationHash: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
    txHash: "0xa15b3dd188033a3e729b67777f7b1b053638689b0cffab2b0d8985da3462ed80",
    verificationNotes: "Pengajuan telah masuk di blockchain. Menunggu verifikasi keaktifan oleh satuan pendidikan.",
  },
  {
    id: 4,
    nisn: "0066654321",
    name: "Dewi Lestari",
    schoolName: "SMKN 3 Surabaya",
    npsn: "20308090",
    gradeLevel: "SMK",
    classRank: "Siswa Aktif",
    walletAddress: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    amount: 1800000,
    status: EscrowStatus.Ditolak,
    submissionDate: "2026-11-21",
    applicationHash: "0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
    txHash: "0xb55582942fff1600ca3ed81f3ccd660c50fe4bbe818688c5695fcb2695ef8c04",
    verificationNotes: "Ditolak verifikator: Tidak memenuhi syarat kuota PIP tahun berjalan.",
  },
  {
    id: 5,
    nisn: "0011123456",
    name: "Eko Saputra",
    schoolName: "SDN 03 Yogyakarta",
    npsn: "10102030",
    gradeLevel: "SD",
    classRank: "Siswa Aktif",
    walletAddress: "",
    amount: 450000,
    status: EscrowStatus.BelumAda,
    submissionDate: "2026-11-20",
    applicationHash: "",
    txHash: undefined,
    verificationNotes: "Data tersinkronisasi Dapodik. Berkas pengajuan belum diajukan ke dinas pendidikan.",
  },
];

export const PIP_AID_CRITERIA = [
  { grade: "SD / SDLB / Paket A", amount: 450000, code: "SD", period: "Per Tahun Ajaran" },
  { grade: "SMP / SMPLB / Paket B", amount: 750000, code: "SMP", period: "Per Tahun Ajaran" },
  { grade: "SMA / SMALB / Paket C", amount: 1800000, code: "SMA", period: "Per Tahun Ajaran" },
  { grade: "SMK (Kejuruan)", amount: 1800000, code: "SMK", period: "Per Tahun Ajaran" },
];

export const INITIAL_SCHOOL_VALIDATORS: SchoolValidator[] = [
  { name: "SMAN 1 Purwokerto", address: "0xD44Bb804dC0e144FF4103834f56aE1272DB18144", active: true },
  { name: "SMPN 5 Bandung", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", active: true },
  { name: "SMKN 3 Surabaya", address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", active: true },
];
