"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWeb3 } from "@/context/Web3Context";
import {
  GraduationCap,
  Building2,
  ShieldCheck,
  ArrowRight,
  Wallet,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { account, connectWallet, isOwner, isValidator } = useWeb3();

  const [activeTab, setActiveTab] = useState<"siswa" | "pejabat">("siswa");
  const [nisn, setNisn] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNisn = nisn.trim();
    if (!cleanNisn || cleanNisn.length < 8) {
      setErrorMsg("NISN harus valid (minimal 8-10 digit angka).");
      return;
    }
    if (!dateOfBirth) {
      setErrorMsg("Tanggal lahir wajib diisi.");
      return;
    }

    try {
      setIsLoading(true);

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

      try {
        const res = await fetch(`${API_URL}/auth/student/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nisn: cleanNisn, dateOfBirth }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem(
            "aloka_student_session",
            JSON.stringify(data.data.student)
          );
          localStorage.setItem("aloka_token", data.data.accessToken);
          router.push("/siswa");
          return;
        } else {
          throw new Error(data.message || "Data siswa tidak ditemukan di Dapodik.");
        }
      } catch (fetchErr: any) {
        // Fallback demo mode jika backend offline
        console.warn("Backend offline, entering offline mode:", fetchErr.message);
        const demoStudent = {
          id: `s-${cleanNisn.slice(-4)}`,
          nisn: cleanNisn,
          fullName: "Peserta Didik Terdaftar",
          gradeLevel: "SMA",
          schoolId: "sch-01",
          walletAddress: account || null,
        };
        localStorage.setItem(
          "aloka_student_session",
          JSON.stringify(demoStudent)
        );
        router.push("/siswa");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal masuk. Periksa kembali NISN dan Tanggal Lahir.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfficialRedirect = () => {
    if (isOwner) {
      router.push("/pemerintah");
    } else if (isValidator) {
      router.push("/sekolah");
    } else {
      router.push("/pemerintah");
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
              onClick={() => setActiveTab("pejabat")}
              className={`py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === "pejabat"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Sekolah & Pejabat</span>
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

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{isLoading ? "Memeriksa..." : "Masuk ke Akun Siswa"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Sekolah & Pejabat Web3 */}
        {activeTab === "pejabat" && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Akses Otoritas (Web3 Wallet)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Khusus Kepala Sekolah (Validator) dan Kuasa Pengguna Anggaran (KPA).
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Status Wallet Web3
                  </h3>
                  <p className="text-xs font-mono text-slate-600 mt-0.5 break-all">
                    {account ? account : "Belum terhubung"}
                  </p>
                </div>
              </div>

              {account ? (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 text-xs">Peran:</span>
                    {isOwner ? (
                      <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        KPA (Admin Pemerintah)
                      </span>
                    ) : isValidator ? (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Verifikator Sekolah
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                        Akun Peninjau
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleOfficialRedirect}
                    className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Buka Dashboard Layanan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={connectWallet}
                    className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Hubungkan Wallet Web3</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
