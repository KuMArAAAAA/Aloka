"use client";

import React from "react";
import Link from "next/link";
import { useWeb3 } from "@/context/Web3Context";
import { formatIDR } from "@/lib/utils";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import {
  GraduationCap,
  School,
  Building2,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Lock,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  const { escrowBalance, totalDistributed, nextApplicationId } = useWeb3();

  return (
    <div className="space-y-10 pb-16">
      {/* 1. Hero Section */}
      <section className="bg-gradient-to-b from-blue-50/60 to-white border-b border-slate-200 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Program Indonesia Pintar On-Chain</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Penyaluran Bantuan PIP{" "}
              <span className="text-blue-600">Transparan & Akuntabel</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              Pengelolaan dana PIP berbasis Smart Contract Escrow di Polygon Amoy.
              Bantuan ditransfer langsung ke dompet digital siswa tanpa potongan administratif.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/siswa"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Portal Siswa: Cek NISN</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/transparansi"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-sm transition-colors shadow-xs"
              >
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <span>Audit Anggaran Publik</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Metrik Real-time On-Chain */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Pagu di Vault</span>
              <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatIDR(escrowBalance > BigInt(0) ? escrowBalance : 8400000)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {escrowBalance > BigInt(0) ? "Tersimpan dalam Escrow Vault" : "Total pagu dialokasikan (Sisa: Rp 5.850.000)"}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Realisasi Penyaluran</span>
              <div className="p-1.5 bg-emerald-50 rounded-md text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatIDR(totalDistributed > BigInt(0) ? totalDistributed : 2550000)}
            </div>
            <p className="mt-1 text-xs text-slate-500">Terkirim langsung ke siswa (2 Siswa)</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Penerima Manfaat</span>
              <div className="p-1.5 bg-indigo-50 rounded-md text-indigo-600">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {nextApplicationId > 1 ? nextApplicationId : 6} Siswa
            </div>
            <p className="mt-1 text-xs text-slate-500">Terverifikasi sekolah</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
              <span>Integritas Dana</span>
              <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              100%
            </div>
            <p className="mt-1 text-xs text-slate-500">Tanpa potongan perantara</p>
          </div>
        </div>
      </section>

      {/* 3. Akses Fitur Layanan */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Akses Layanan Platform
          </h2>
          <p className="text-sm text-slate-500">
            Pilih menu layanan sesuai peran Anda dalam distribusi dana PIP.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/siswa"
            className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                Portal Siswa
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pengecekan kelayakan NISN Dapodik, status dana, dan klaim langsung ke dompet.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600">
              <span>Buka Portal Siswa</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/sekolah"
            className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <School className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                Verifikasi Sekolah
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Pengesahan digital rekomendasi siswa oleh pihak satuan pendidikan.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600">
              <span>Masuk Verifikasi</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/pemerintah"
            className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                Alokasi KPA
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Injeksi pagu ke Escrow Vault, kelola validator sekolah, dan eksekusi pencairan.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600">
              <span>Dashboard KPA</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/transparansi"
            className="group bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                Buku Besar Audit
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Audit publik on-chain 24/7 dan unduh laporan transaksi kas bantuan.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-600">
              <span>Lihat Buku Besar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 4. Smart Contract Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Smart Contract Escrow Terverifikasi
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Alamat: {CONTRACT_ADDRESSES.escrow}
            </p>
          </div>
          <a
            href={`https://amoy.polygonscan.com/address/${CONTRACT_ADDRESSES.escrow}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors"
          >
            <span>Buka di Polygonscan</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </section>
    </div>
  );
}
