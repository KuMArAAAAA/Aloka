"use client";

import React, { useState, useEffect } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { formatIDR, shortenAddress, EscrowStatus } from "@/lib/utils";
import { INITIAL_STUDENTS, StudentRecord } from "@/lib/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ShieldCheck,
  Lock,
  ArrowUpRight,
  ExternalLink,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";

export default function TransparansiPage() {
  const { escrowBalance, totalDistributed } = useWeb3();
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [filterGrade, setFilterGrade] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backendStats, setBackendStats] = useState<any>(null);
  const [isLiveApi, setIsLiveApi] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

  // Fetch real data from backend
  const fetchPublicData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [appsRes, statsRes] = await Promise.allSettled([
        fetch(`${API_URL}/public/applications`),
        fetch(`${API_URL}/public/stats`),
      ]);

      let loadedLive = false;

      if (appsRes.status === "fulfilled" && appsRes.value.ok) {
        const appsData = await appsRes.value.json();
        if (appsData.success && Array.isArray(appsData.data) && appsData.data.length > 0) {
          setStudents(appsData.data);
          loadedLive = true;
        }
      }

      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const statsData = await statsRes.value.json();
        if (statsData.success && statsData.data) {
          setBackendStats(statsData.data);
          loadedLive = true;
        }
      }

      setIsLiveApi(loadedLive);
      if (!loadedLive && appsRes.status === "rejected") {
        console.warn("Backend offline, using fallback mock data.");
      }
    } catch (err: any) {
      console.warn("Fetch public data notice:", err?.message || err);
      setError("Gagal memuat data live dari server. Menggunakan data tersimpan.");
      setIsLiveApi(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grades = [
    { grade: "SD", label: "SD / Sederajat" },
    { grade: "SMP", label: "SMP / Sederajat" },
    { grade: "SMA", label: "SMA / Sederajat" },
    { grade: "SMK", label: "SMK Kejuruan" },
  ];

  const summaryByGrade = grades.map((g) => {
    const list = students.filter((s) => s.gradeLevel === g.grade);
    const totalAmount = list.reduce((acc, curr) => acc + curr.amount, 0);
    return {
      grade: g.grade,
      label: g.label,
      count: list.length,
      amount: totalAmount,
    };
  });

  // Perhitungan agregat dari data transaksi
  const totalAllocated = students.reduce((acc, curr) => acc + curr.amount, 0);
  const distributedFromData = students
    .filter((s) => s.status === EscrowStatus.Tersalurkan)
    .reduce((acc, curr) => acc + curr.amount, 0);
  const distributedCount = students.filter((s) => s.status === EscrowStatus.Tersalurkan).length;
  const remainingVault = Math.max(0, totalAllocated - distributedFromData);

  // Nilai dinamis: gunakan on-chain jika > 0, atau stats backend jika ada, fallback ke agregat data buku kas
  const displayPaguVault =
    escrowBalance > BigInt(0)
      ? escrowBalance
      : totalAllocated;

  const displayDistributed =
    totalDistributed > BigInt(0)
      ? totalDistributed
      : backendStats?.summary?.totalFundDistributedIDR
      ? Number(backendStats.summary.totalFundDistributedIDR)
      : distributedFromData;

  const displayDistributedCount =
    backendStats?.summary?.totalDistributed !== undefined
      ? backendStats.summary.totalDistributed
      : distributedCount;

  const displayTotalStudents =
    backendStats?.summary?.totalApplications !== undefined
      ? backendStats.summary.totalApplications
      : students.length;

  const filteredLogs = students.filter(
    (s) => filterGrade === "ALL" || s.gradeLevel === filterGrade
  );

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleFilterChange = (grade: string) => {
    setFilterGrade(grade);
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (students.length === 0) {
      alert("Belum ada data transaksi untuk diekspor.");
      return;
    }
    const headers = "ID,Inisial Siswa,Satuan Pendidikan,Jenjang,Nominal PIP,Status,Tx Hash,Tanggal Pengajuan\n";
    const rows = students
      .map(
        (s) =>
          `"${s.id}","${s.name.split(" ").map((n) => n[0]).join(".")}*","${s.schoolName}",${s.gradeLevel},${s.amount},"${s.status}",${s.txHash || "N/A"},${s.submissionDate}`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Rekapitulasi_Audit_DJPb_PIP_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200">
        <div className="border-l-4 border-blue-600 pl-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Keterbukaan Informasi Publik
            </span>
            {isLiveApi ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Database & On-Chain
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                Data Offline Fallback
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Buku Besar & Audit Penyaluran PIP
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Data audit transparan tanpa mengekspos identitas privat siswa (Non-PII).
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={fetchPublicData}
            disabled={loading}
            title="Muat ulang data dari server"
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Laporan (CSV)</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      {loading && !students.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-slate-100 p-5 rounded-xl border border-slate-200 h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
              Pagu di Vault (TVL)
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {formatIDR(displayPaguVault)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {escrowBalance > BigInt(0)
                ? "Tersimpan dalam Smart Contract"
                : `Total pagu dialokasikan (Sisa: ${formatIDR(remainingVault)})`}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
              Realisasi Tersalurkan
            </span>
            <div className="text-2xl font-bold text-emerald-600">
              {formatIDR(displayDistributed)}
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              Terkonfirmasi di dompet siswa ({displayDistributedCount} Siswa)
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
              Total Siswa Terdaftar
            </span>
            <div className="text-2xl font-bold text-slate-900">
              {displayTotalStudents} Siswa
            </div>
            <p className="mt-1 text-xs text-slate-400">Tahun anggaran 2025/2026</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
              Tingkat Integritas
            </span>
            <div className="text-2xl font-bold text-slate-900">
              100%
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">0% pemotongan perantara</p>
          </div>
        </div>
      )}

      {/* Rincian Berdasarkan Jenjang */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="border-l-4 border-blue-600 pl-3 mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Alokasi Anggaran Menurut Jenjang
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryByGrade.map((item) => (
            <div key={item.grade} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs font-medium text-slate-500 block uppercase">
                {item.label}
              </span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {formatIDR(item.amount)}
              </div>
              <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                {item.count} Siswa Penerima
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabel Buku Kas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Buku Kas On-Chain
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan {paginatedLogs.length} dari {filteredLogs.length} transaksi audit.
            </p>
          </div>

          {/* Filter Jenjang */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterGrade}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">Semua Jenjang ({students.length})</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs tracking-wider">
                <th className="py-3 px-4">ID Transaksi</th>
                <th className="py-3 px-4">Penerima (Anonim)</th>
                <th className="py-3 px-4">Satuan Pendidikan</th>
                <th className="py-3 px-4">Jenjang</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Audit Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">
                    Tidak ada data transaksi untuk kategori ini.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((item) => (
                  <tr key={String(item.id)} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700 text-xs">
                      {String(item.id).length > 8
                        ? String(item.id).substring(0, 8) + "..."
                        : item.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {item.name ? item.name.split(" ").map((n) => n[0]).join(".") + "*" : "Siswa*"}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.schoolName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {item.gradeLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {formatIDR(item.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.txHash ? (
                        <a
                          href={`https://amoy.polygonscan.com/tx/${item.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <span>{shortenAddress(item.txHash)}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Halaman <span className="font-semibold text-slate-800">{currentPage}</span> dari{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
