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

// Database dikosongkan (tidak diisi dummy data)
export const INITIAL_STUDENTS: StudentRecord[] = [];

export const PIP_AID_CRITERIA = [
  { grade: "SD / SDLB / Paket A", amount: 450000, code: "SD", period: "Per Tahun Ajaran" },
  { grade: "SMP / SMPLB / Paket B", amount: 750000, code: "SMP", period: "Per Tahun Ajaran" },
  { grade: "SMA / SMALB / Paket C", amount: 1800000, code: "SMA", period: "Per Tahun Ajaran" },
  { grade: "SMK (Kejuruan)", amount: 1800000, code: "SMK", period: "Per Tahun Ajaran" },
];

export const INITIAL_SCHOOL_VALIDATORS: SchoolValidator[] = [];
