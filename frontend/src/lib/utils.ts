import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(amount: number | string | bigint): string {
  const num = typeof amount === "bigint" ? Number(amount) : Number(amount || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export enum EscrowStatus {
  BelumAda = 0,
  MenungguVerifikasi = 1,
  Terverifikasi = 2,
  Ditolak = 3,
  Tersalurkan = 4,
}

export const STATUS_LABELS: Record<EscrowStatus, { label: string; color: string; badgeClass: string; description: string }> = {
  [EscrowStatus.BelumAda]: {
    label: "Belum Terdaftar",
    color: "gray",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    description: "Pengajuan belum tercatat di smart contract escrow.",
  },
  [EscrowStatus.MenungguVerifikasi]: {
    label: "Menunggu Verifikasi Sekolah",
    color: "amber",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-300",
    description: "Pengajuan sedang direview oleh verifikator satuan pendidikan sekolah.",
  },
  [EscrowStatus.Terverifikasi]: {
    label: "Terverifikasi (Siap Disalurkan)",
    color: "blue",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-300",
    description: "Data siswa sah dan disetujui sekolah, menunggu eksekusi transfer dana dari Escrow Vault.",
  },
  [EscrowStatus.Ditolak]: {
    label: "Pengajuan Ditolak",
    color: "red",
    badgeClass: "bg-red-50 text-red-700 border-red-300",
    description: "Pengajuan tidak memenuhi syarat administratif kelayakan PIP.",
  },
  [EscrowStatus.Tersalurkan]: {
    label: "Dana Tersalurkan (Selesai)",
    color: "emerald",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-300",
    description: "Dana bantuan telah ditransfer langsung dari Escrow Vault ke wallet siswa tanpa perantara.",
  },
};

/**
 * Map backend OnchainStatus string ke EscrowStatus enum frontend.
 * Backend: UNSUBMITTED | AWAITING_REVIEW | VERIFIED | DISTRIBUTED | REJECTED
 */
export function mapOnchainStatus(status: string): EscrowStatus {
  switch ((status || "").toUpperCase()) {
    case "DISTRIBUTED":
      return EscrowStatus.Tersalurkan;
    case "VERIFIED":
      return EscrowStatus.Terverifikasi;
    case "AWAITING_REVIEW":
      return EscrowStatus.MenungguVerifikasi;
    case "REJECTED":
      return EscrowStatus.Ditolak;
    case "UNSUBMITTED":
    default:
      return EscrowStatus.BelumAda;
  }
}
