"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { shortenAddress, formatIDR } from "@/lib/utils";
import {
  Wallet,
  LogOut,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  School,
  User,
  Download,
  Loader2,
  ChevronDown,
} from "lucide-react";

const METAMASK_DOWNLOAD_URL = "https://metamask.io/download/";

export const ConnectWalletButton: React.FC = () => {
  const {
    account,
    isCorrectNetwork,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    isOwner,
    isValidator,
    userMidrBalance,
    isLoading,
    walletAvailable,
  } = useWeb3();

  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleCopy = () => {
    if (!account) return;
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close dropdown on outside click
  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-wallet-dropdown]")) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  // 1. Tidak ada MetaMask → tombol link install
  if (!walletAvailable && !account) {
    return (
      <a
        href={METAMASK_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium px-3.5 py-2 rounded-lg text-sm transition-colors shadow-xs"
        title="Dompet Web3 tidak terdeteksi. Pasang MetaMask untuk menghubungkan dompet."
      >
        <Download className="w-4 h-4 text-slate-300" />
        <span>Pasang MetaMask</span>
      </a>
    );
  }

  // 2. Belum terhubung
  if (!account) {
    return (
      <button
        onClick={connectWallet}
        disabled={isLoading}
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium px-3.5 py-2 rounded-lg text-sm transition-colors shadow-xs"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
        ) : (
          <Wallet className="w-4 h-4 text-slate-300" />
        )}
        <span>{isLoading ? "Menghubungkan..." : "Hubungkan Wallet"}</span>
      </button>
    );
  }

  // 3. Terhubung tapi jaringan salah
  if (!isCorrectNetwork) {
    return (
      <button
        onClick={switchNetwork}
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-medium px-3.5 py-2 rounded-lg text-sm shadow-xs transition-colors"
      >
        <AlertTriangle className="w-4 h-4" />
        <span>Ganti ke Polygon Amoy</span>
      </button>
    );
  }

  // 4. Terhubung + jaringan benar → dropdown akun
  const getRoleBadge = () => {
    if (isValidator) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <School className="w-3.5 h-3.5" />
          Sekolah
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <User className="w-3.5 h-3.5" />
        Penerima
      </span>
    );
  };

  return (
    <div className="relative" data-wallet-dropdown>
      <button
        onClick={() => setDropdownOpen((v) => !v)}
        className="flex items-center gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors text-slate-800 shadow-xs"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
      >
        <div className="flex flex-col items-start leading-tight">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-mono font-medium text-sm text-slate-900">
              {shortenAddress(account)}
            </span>
            {getRoleBadge()}
          </div>
          <span className="text-xs text-slate-500 mt-0.5">
            Saldo: <strong className="text-slate-800 font-semibold">{formatIDR(userMidrBalance)}</strong>
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
      </button>

      {dropdownOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50 text-sm"
        >
          <div className="px-3.5 py-2.5 border-b border-slate-100">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Alamat Akun Web3</p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-mono text-xs text-slate-800 truncate mr-2">{account}</span>
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                title="Salin Alamat"
                aria-label="Salin alamat dompet"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="px-3.5 py-2 border-b border-slate-100">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Jaringan:</span>
              <span className="font-medium text-emerald-700">Polygon Amoy (80002)</span>
            </div>
          </div>

          <div className="px-2 pt-1">
            <button
              onClick={() => {
                disconnectWallet();
                setDropdownOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              role="menuitem"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Putuskan Koneksi</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};