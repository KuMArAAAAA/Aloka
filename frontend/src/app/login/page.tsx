"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWeb3 } from "@/context/Web3Context";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import {
  GraduationCap,
  Building2,
  School,
  ShieldCheck,
  ArrowRight,
  Wallet,
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  CheckCircle2,
} from "lucide-react";
import {
  setStudentToken,
  setStudentSession,
  setOfficialToken,
  setOfficialSession,
  getOfficialSession,
  clearStudentSessions,
  clearOfficialSessions,
  hasActiveOfficialSession,
  clearAllSessions,
} from "@/lib/session";

interface OfficialUser {
  id: string;
  email: string;
  role: "SCHOOL" | "GOVERNMENT";
  school?: { id: string; name: string; npsn: string } | null;
}

export default function LoginPage() {
  const router = useRouter();
  const { account, disconnectWallet } = useWeb3();

  const [activeTab, setActiveTab] = useState<"siswa" | "sekolah">("siswa");

  // --- Siswa form state ---
  const [nisn, setNisn] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [siswaLoading, setSiswaLoading] = useState(false);
  const [siswaError, setSiswaError] = useState<string | null>(null);

  // --- Sekolah (verifikator) form state ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [officialLoading, setOfficialLoading] = useState(false);
  const [officialError, setOfficialError] = useState<string | null>(null);
  const [officialUser, setOfficialUser] = useState<OfficialUser | null>(null);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

  // Pastikan sesi lama bersih total jika tiba setelah logout, idle, atau expired
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const reason = searchParams.get("reason");
      if (reason === "logout" || reason === "expired" || reason === "idle") {
        clearAllSessions();
        try {
          disconnectWallet();
        } catch {}
        setOfficialUser(null);
        return;
      }
    }

    const u = getOfficialSession<OfficialUser>();
    if (u && u.id && (u.role === "SCHOOL" || u.role === "GOVERNMENT") && hasActiveOfficialSession()) {
      setOfficialUser(u);
      setEmail(u.email);
    } else if (u) {
      clearOfficialSessions();
    }
  }, [disconnectWallet]);

  // ---- Handler: Login Siswa ----
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiswaError(null);

    const cleanNisn = nisn.trim();
    if (!cleanNisn || cleanNisn.length < 8) {
      setSiswaError("NISN harus valid (minimal 8-10 digit angka).");
      return;
    }
    if (!dateOfBirth) {
      setSiswaError("Tanggal lahir wajib diisi.");
      return;
    }

    try {
      setSiswaLoading(true);
      const res = await fetch(`${API_URL}/auth/student/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nisn: cleanNisn, dateOfBirth }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudentSession(data.data.student);
        setStudentToken(data.data.accessToken);
        // Drop official session (segration between tabs)
        clearOfficialSessions();
        router.push("/siswa");
        return;
      }
      throw new Error(data.message || "Data siswa tidak ditemukan di Dapodik.");
    } catch (err: any) {
      setSiswaError(err.message || "Gagal masuk. Periksa kembali NISN dan Tanggal Lahir.");
    } finally {
      setSiswaLoading(false);
    }
  };

  // ---- Handler: Login Sekolah (Verifikator) via email+password ----
  const handleOfficialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfficialError(null);

    if (!email.trim()) {
      setOfficialError("Email wajib diisi.");
      return;
    }
    if (!password) {
      setOfficialError("Password wajib diisi.");
      return;
    }

    try {
      setOfficialLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data.user.role !== "SCHOOL" && data.data.user.role !== "GOVERNMENT") {
          throw new Error(
            "Akses ditolak. Portal ini hanya untuk verifikator sekolah dan pengelola pemerintah (KPA)."
          );
        }
        const user: OfficialUser = {
          id: data.data.user.id,
          email: data.data.user.email,
          role: data.data.user.role,
          school: data.data.user.school || null,
        };
        setOfficialUser(user);
        setOfficialSession(user);
        setOfficialToken(data.data.accessToken);
        // Drop student session (segration between tabs)
        clearStudentSessions();

        if (user.role === "GOVERNMENT") {
          router.push("/pemerintah");
        } else {
          router.push("/sekolah");
        }
        return;
      }
      throw new Error(data.message || "Email atau password salah.");
    } catch (err: any) {
      setOfficialError(err.message || "Gagal masuk. Periksa email dan password.");
      setOfficialUser(null);
    } finally {
      setOfficialLoading(false);
    }
  };

  const handleOfficialRedirect = () => {
    if (!officialUser) return;
    if (officialUser.role === "GOVERNMENT") {
      router.push("/pemerintah");
    } else {
      router.push("/sekolah");
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Autentikasi Terpadu
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Masuk Portal Aloka PIP
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Pilih metode masuk sesuai peran Anda dalam distribusi bantuan PIP.
          </p>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 gap-1.5 mt-5 bg-slate-200/70 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("siswa")}
              className={`py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "siswa"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-600" />
              <span>Siswa (NISN)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sekolah")}
              className={`py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "sekolah"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <School className="w-4 h-4 text-blue-600" />
              <span>Petugas (Sekolah / KPA)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Siswa */}
        {activeTab === "siswa" && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Pengecekan Siswa via Dapodik
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan NISN dan tanggal lahir sesuai data resmi Dapodik.
              </p>
            </div>

            {siswaError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{siswaError}</span>
              </div>
            )}

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nomor Induk Siswa Nasional (NISN)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="Contoh: 0071234567"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tanggal Lahir Sesuai Dapodik
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={siswaLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {siswaLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{siswaLoading ? "Memeriksa..." : "Masuk ke Akun Siswa"}</span>
                {!siswaLoading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Sekolah (Verifikator) */}
        {activeTab === "sekolah" && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Akses Verifikator Sekolah
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Login dengan email sekolah dan password. Setelah masuk,
                hubungkan Web3 Wallet untuk verifikasi on-chain kelayakan siswa PIP.
              </p>
            </div>

            {officialError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{officialError}</span>
              </div>
            )}

            {/* Form email+password */}
            {!officialUser && (
              <form onSubmit={handleOfficialLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email Sekolah
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sman1pwt@sekolah.id"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={officialLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {officialLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{officialLoading ? "Memverifikasi..." : "Masuk Akun Petugas"}</span>
                  {!officialLoading && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="text-xs text-slate-500 pt-1 space-y-1">
                  <div>Klik cepat akun uji coba demo:</div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("sman1pwt@sekolah.id");
                        setPassword("Password123!");
                      }}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-blue-700 font-mono text-[11px]"
                    >
                      Sekolah: sman1pwt@sekolah.id
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("admin@kemendikbud.go.id");
                        setPassword("Password123!");
                      }}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-indigo-700 font-mono text-[11px]"
                    >
                      KPA: admin@kemendikbud.go.id
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Profil login berhasil + Wallet binding */}
            {officialUser && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Login Berhasil
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5 break-all">
                        {officialUser.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {officialUser.role === "GOVERNMENT" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Kuasa Pengguna Anggaran (KPA DJPb / Kemendikbud)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verifikator Satuan Pendidikan (Kepala Sekolah)
                          </span>
                        )}
                        {officialUser.school && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Building2 className="w-3.5 h-3.5" />
                            {officialUser.school.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Web3 Wallet untuk verifikasi on-chain */}
                <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Web3 Wallet untuk Eksekusi On-Chain
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {officialUser.role === "GOVERNMENT"
                          ? "Hubungkan dompet pengelola escrow untuk injeksi dana pagu atau verifikasi langsung."
                          : "Wajib hubungkan dompet untuk verifikasi on-chain kelayakan siswa PIP."}
                      </p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <ConnectWalletButton />
                  </div>
                  <p className="text-xs text-slate-500 font-mono break-all pt-1">
                    Akun dompet: {account || "Belum terhubung"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOfficialRedirect}
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <span>
                    {officialUser.role === "GOVERNMENT"
                      ? "Buka Dashboard Alokasi KPA"
                      : "Buka Dashboard Verifikasi Sekolah"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOfficialUser(null);
                    setEmail("");
                    setPassword("");
                    setOfficialError(null);
                    clearOfficialSessions();
                  }}
                  className="w-full text-xs text-slate-500 hover:text-slate-800 hover:underline transition-colors"
                >
                  Keluar dari akun sekolah ini
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}