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
  txHash?: string;
  verificationNotes?: string;
}

export interface SchoolValidator {
  name: string;
  address: string;
  active: boolean;
}

// Data simulasi resmi sesuai TEST_DATA.md Aloka PIP
export const INITIAL_STUDENTS: StudentRecord[] = [
  {
    id: 1,
    nisn: "0071234567",
    name: "Budi Pratama",
    schoolName: "SMAN 1 Purwokerto",
    npsn: "20301234",
    gradeLevel: "SMA",
    classRank: "Siswa Aktif",
    walletAddress: "",
    amount: 1800000,
    status: EscrowStatus.Tersalurkan,
    submissionDate: "2026-11-20",
    applicationHash: "0xb28b4ce4b7337cb019ad759b85c2c5101284a60b94371fa7a419516077a99",
    txHash: "0xb28b4ce4b7337cb019ad759b85c2c5101284a60b94371fa7a419516077a99",
    verificationNotes: "Dana bantuan telah ditransfer langsung dari Escrow Vault ke dompet siswa.",
  },
  {
    id: 2,
    nisn: "0079876543",
    name: "Siti Aminah",
    schoolName: "SMAN 1 Purwokerto",
    npsn: "20301234",
    gradeLevel: "SMA",
    classRank: "Siswa Aktif",
    walletAddress: "",
    amount: 1800000,
    status: EscrowStatus.Terverifikasi,
    submissionDate: "2026-11-20",
    applicationHash: "0x8a9cf21e330ad18529341498b9f0293751a029471629471a9e8b7c6d5e4f3a21",
    txHash: "0x8a9cf21e330ad18529341498b9f0293751a029471629471a9e8b7c6d5e4f3a21",
    verificationNotes: "Diverifikasi resmi oleh SMAN 1 Purwokerto. Menunggu eksekusi transfer dari Escrow Vault.",
  },
  {
    id: 3,
    nisn: "0055512345",
    name: "Rini Wulandari",
    schoolName: "SMAN 1 Purwokerto",
    npsn: "20301234",
    gradeLevel: "SMA",
    classRank: "Siswa Aktif",
    walletAddress: "",
    amount: 1800000,
    status: EscrowStatus.MenungguVerifikasi,
    submissionDate: "2026-11-21",
    applicationHash: "0x7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
    verificationNotes: "Menunggu verifikasi keaktifan siswa oleh pihak sekolah.",
  },
  {
    id: 4,
    nisn: "0033345678",
    name: "Agus Setiawan",
    schoolName: "SMPN 5 Bandung",
    npsn: "20107890",
    gradeLevel: "SMP",
    classRank: "Siswa Aktif",
    walletAddress: "",
    amount: 750000,
    status: EscrowStatus.Tersalurkan,
    submissionDate: "2026-11-19",
    applicationHash: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
    txHash: "0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
    verificationNotes: "Dana bantuan telah ditransfer langsung dari Escrow Vault ke dompet siswa.",
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
    status: EscrowStatus.Terverifikasi,
    submissionDate: "2026-11-20",
    applicationHash: "0x9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
    txHash: "0x9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
    verificationNotes: "Disetujui sekolah, menunggu eksekusi transfer dana dari Escrow Vault.",
  },
  {
    id: 6,
    nisn: "0066654321",
    name: "Dewi Lestari",
    schoolName: "SMKN 3 Surabaya",
    npsn: "20308090",
    gradeLevel: "SMK",
    classRank: "Siswa Aktif",
    walletAddress: "",
    amount: 1800000,
    status: EscrowStatus.MenungguVerifikasi,
    submissionDate: "2026-11-21",
    applicationHash: "0x4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
    verificationNotes: "Menunggu verifikasi keaktifan siswa oleh pihak sekolah.",
  },
];

export const PIP_AID_CRITERIA = [
  { grade: "SD / SDLB / Paket A", amount: 450000, code: "SD", period: "Per Tahun Ajaran" },
  { grade: "SMP / SMPLB / Paket B", amount: 750000, code: "SMP", period: "Per Tahun Ajaran" },
  { grade: "SMA / SMALB / Paket C", amount: 1800000, code: "SMA", period: "Per Tahun Ajaran" },
  { grade: "SMK (Kejuruan)", amount: 1800000, code: "SMK", period: "Per Tahun Ajaran" },
];

export const INITIAL_SCHOOL_VALIDATORS: SchoolValidator[] = [
  { name: "SMAN 1 Purwokerto", address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", active: true },
  { name: "SMAN 2 Jakarta", address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", active: true },
  { name: "SMPN 5 Bandung", address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", active: true },
  { name: "SDN 03 Yogyakarta", address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", active: true },
  { name: "SMKN 3 Surabaya", address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc", active: true },
];
