"use client";

import React from "react";
import { useWeb3 } from "@/context/Web3Context";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";

const kindStyles: Record<
  "error" | "info" | "success",
  { wrap: string; icon: React.ReactNode; title: string; accent: string }
> = {
  error: {
    wrap: "bg-white border-rose-200",
    accent: "bg-rose-500",
    icon: <XCircle className="w-5 h-5 text-rose-600" />,
    title: "Gagal",
  },
  info: {
    wrap: "bg-white border-blue-200",
    accent: "bg-blue-500",
    icon: <Info className="w-5 h-5 text-blue-600" />,
    title: "Informasi",
  },
  success: {
    wrap: "bg-white border-emerald-200",
    accent: "bg-emerald-500",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    title: "Sukses",
  },
};

export const WalletToast: React.FC = () => {
  const { notif, dismissNotif } = useWeb3();

  if (!notif) return null;

  const style = kindStyles[notif.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 max-w-sm aloka-toast-enter"
    >
      <div
        className={`relative overflow-hidden shadow-lg rounded-xl border ${style.wrap} flex items-start gap-3 p-3 pr-8`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent}`} />
        <div className="shrink-0 pt-0.5">{style.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
            {style.title} Dompet
          </p>
          <p className="text-sm text-slate-800 leading-snug break-words">{notif.message}</p>
        </div>
        <button
          type="button"
          onClick={dismissNotif}
          aria-label="Tutup notifikasi"
          className="absolute top-2 right-2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};