import React from "react";
import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-16 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white">Aloka PIP</span>
            </div>
            <p className="text-xs text-slate-400">
              Distribusi Bantuan PIP Berbasis Web3 Smart Contract Escrow di Polygon Amoy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link href="/siswa" className="hover:text-white transition-colors">
              Portal Siswa
            </Link>
            <Link href="/sekolah" className="hover:text-white transition-colors">
              Verifikasi Sekolah
            </Link>
            <Link href="/transparansi" className="hover:text-white transition-colors">
              Buku Besar Audit
            </Link>
            <a
              href={`https://amoy.polygonscan.com/address/${CONTRACT_ADDRESSES.escrow}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span>Smart Contract</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© 2026 Aloka PIP. Program Indonesia Pintar On-Chain.</p>
          <p className="font-mono">Polygon Amoy Testnet (Chain ID 80002)</p>
        </div>
      </div>
    </footer>
  );
};
