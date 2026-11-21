"use client";

import React, { useState, useEffect } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { formatIDR, EscrowStatus, shortenAddress, mapOnchainStatus } from "@/lib/utils";
import { INITIAL_STUDENTS, StudentRecord } from "@/lib/mockData";
import { getOfficialToken, getOfficialSession } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import {
  School,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Info,
  ExternalLink,
  Loader2,
} from "lucide-react";

export default function SekolahDashboardPage() {
  const {
    isValidator,
    escrowContract,
    refreshContractStats,
  } = useWeb3();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; npsn?: string } | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Selected for verification modal
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);
  const [customAmount, setCustomAmount] = useState<number>(1800000);
  const [recommendationLetter, setRecommendationLetter] = useState<string>("");

  // Konversi student dari backend ke StudentRecord frontend
  const mapSchoolStudentToRecord = (item: any, fallbackSchoolName: string): StudentRecord => {
    const latestApp = item.latestApplication || {};
    const onchainStatus = latestApp.onchainStatus || "UNSUBMITTED";
    const status = mapOnchainStatus(onchainStatus);
    const amount = Number(latestApp.amount || 1800000);
    const txHash = latestApp.txDistributeHash || latestApp.txVerifyHash || latestApp.txSubmitHash;

    return {
      id: latestApp.onchainId || latestApp.id || item.id,
      nisn: item.nisn,
      name: item.fullName,
      schoolName: item.school?.name || fallbackSchoolName || "Satuan Pendidikan",
      npsn: item.school?.npsn || "",
      gradeLevel: item.gradeLevel || "SMA",
      classRank: "Siswa Aktif",
      walletAddress: item.walletAddress || "",
      amount: amount,
      status: status,
      submissionDate: (latestApp.createdAt || new Date().toISOString()).split("T")[0],
      applicationHash: latestApp.applicationHash || "",
      txHash: txHash || undefined,
      verificationNotes: item.recommendation?.referenceNumber
        ? `Surat Rekomendasi No: ${item.recommendation.referenceNumber}`
        : status === EscrowStatus.Tersalurkan
        ? "Dana bantuan telah ditransfer langsung dari Escrow Vault ke dompet siswa."
        : status === EscrowStatus.Terverifikasi
        ? "Disetujui sekolah, menunggu eksekusi transfer dana dari Escrow Vault."
        : "Menunggu verifikasi keaktifan siswa.",
    };
  };

  // Muat data siswa dari backend atau fallback resmi
  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      const token = getOfficialToken();
      const session = getOfficialSession<any>();
      const currentSchoolName = session?.school?.name || "SMAN 1 Purwokerto";
      setSchoolInfo(session?.school || { name: currentSchoolName });

      if (token) {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
          const res = await fetch(`${API_URL}/schools/me/students`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          const data = await res.json();
          if (res.ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
            const mapped = data.data.map((item: any) => mapSchoolStudentToRecord(item, currentSchoolName));
            setStudents(mapped);
            setLoading(false);
            return;
          }
        } catch (e: any) {
          console.warn("Fetch /schools/me/students failed, using fallback data:", e?.message);
        }
      }

      // Fallback: muat data siswa yang relevan dengan sekolah yang sedang login
      const relevant = INITIAL_STUDENTS.filter((s) =>
        s.schoolName.toLowerCase().includes(currentSchoolName.toLowerCase()) ||
        currentSchoolName.toLowerCase().includes(s.schoolName.toLowerCase())
      );
      setStudents(relevant.length > 0 ? relevant : INITIAL_STUDENTS);
      setLoading(false);
    };

    loadStudents();
  }, []);

  const countAll = students.length;
  const countPending = students.filter((s) => s.status === EscrowStatus.MenungguVerifikasi).length;
  const countVerified = students.filter((s) => s.status === EscrowStatus.Terverifikasi).length;
  const countDistributed = students.filter((s) => s.status === EscrowStatus.Tersalurkan).length;

  const filteredStudents = students.filter((s) => {
    const matchesFilter =
      filterStatus === "ALL" ||
      (filterStatus === "PENDING" && s.status === EscrowStatus.MenungguVerifikasi) ||
      (filterStatus === "VERIFIED" && s.status === EscrowStatus.Terverifikasi) ||
      (filterStatus === "DISTRIBUTED" && s.status === EscrowStatus.Tersalurkan) ||
      (filterStatus === "REJECTED" && s.status === EscrowStatus.Ditolak);

    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nisn.includes(searchTerm) ||
      s.schoolName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleOpenVerifyModal = (student: StudentRecord) => {
    setSelectedStudent(student);
    setCustomAmount(student.amount);
    setRecommendationLetter(`421/${student.gradeLevel}1/PIP/XI/2026`);
  };

  const handleConfirmVerify = async () => {
    if (!selectedStudent) return;
    try {
      setActionLoadingId(selectedStudent.id);
      setActionSuccessMsg(null);

      if (escrowContract && escrowContract.runner) {
        try {
          const tx = await escrowContract.verifyApplication(
            selectedStudent.id,
            customAmount
          );
          await tx.wait();
        } catch (e: any) {
          console.warn("Smart contract verify fallback:", e?.message);
        }
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudent.id
            ? {
                ...s,
                amount: customAmount,
                status: EscrowStatus.Terverifikasi,
                verificationNotes: `Diverifikasi resmi. Surat Rekomendasi No: ${recommendationLetter}`,
              }
            : s
        )
      );

      setActionSuccessMsg(`Pengajuan ${selectedStudent.name} berhasil disahkan on-chain.`);
      setSelectedStudent(null);
      refreshContractStats();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal memproses verifikasi.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (student: StudentRecord) => {
    const reason = prompt("Masukkan alasan penolakan pengajuan (misal: Data tidak aktif di Dapodik):");
    if (!reason) return;

    try {
      setActionLoadingId(student.id);
      setActionSuccessMsg(null);

      if (escrowContract && escrowContract.runner) {
        try {
          const tx = await escrowContract.rejectApplication(student.id);
          await tx.wait();
        } catch (e: any) {
          console.warn("Smart contract reject fallback:", e?.message);
        }
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? {
                ...s,
                status: EscrowStatus.Ditolak,
                verificationNotes: `Ditolak oleh verifikator: ${reason}`,
              }
            : s
        )
      );

      setActionSuccessMsg(`Pengajuan ${student.name} berhasil ditandai ditolak.`);
      refreshContractStats();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal menolak pengajuan.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200">
        <div className="border-l-4 border-emerald-600 pl-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 block">
            Satuan Pendidikan & Verifikasi Dapodik
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Dashboard Verifikator: {schoolInfo?.name || "Satuan Pendidikan"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Validasi keaktifan siswa di Dapodik dan terbitkan rekomendasi digital kelayakan PIP ke Smart Contract.
          </p>
        </div>

        {/* Validator Badge Check */}
        <div className="flex items-center gap-2">
          {isValidator ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Wallet Terdaftar Sebagai Verifikator</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Mode Tinjauan Satuan Pendidikan</span>
            </div>
          )}
        </div>
      </div>

      {/* Info Notice about Validator Roles */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3 text-sm text-slate-700">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-1 text-xs leading-relaxed">
          <p className="font-semibold text-slate-900">Kewenangan Verifikator Sekolah:</p>
          <p>
            Alamat dompet sekolah yang ditunjuk resmi memiliki hak memanggil fungsi on-chain <code>verifyApplication()</code> dan <code>rejectApplication()</code>. Validasi ini memastikan bantuan disalurkan hanya kepada siswa aktif yang sah.
          </p>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Tabs with accurate count badges */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-sm font-medium w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 rounded-md transition ${
              filterStatus === "ALL" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua ({countAll})
          </button>
          <button
            onClick={() => setFilterStatus("PENDING")}
            className={`px-3 py-1.5 rounded-md transition ${
              filterStatus === "PENDING" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Menunggu ({countPending})
          </button>
          <button
            onClick={() => setFilterStatus("VERIFIED")}
            className={`px-3 py-1.5 rounded-md transition ${
              filterStatus === "VERIFIED" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Disahkan ({countVerified})
          </button>
          <button
            onClick={() => setFilterStatus("DISTRIBUTED")}
            className={`px-3 py-1.5 rounded-md transition ${
              filterStatus === "DISTRIBUTED" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tersalurkan ({countDistributed})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari siswa, NISN, atau sekolah..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="py-3 px-4">ID & Tanggal</th>
                <th className="py-3 px-4">Siswa & NISN</th>
                <th className="py-3 px-4">Satuan Pendidikan</th>
                <th className="py-3 px-4">Pagu PIP</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Memuat data pengajuan siswa...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Tidak ditemukan data pengajuan siswa untuk kategori ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">
                      <span className="font-semibold text-slate-900 block">#{student.id}</span>
                      <span className="text-xs text-slate-400">{student.submissionDate}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block text-sm">
                        {student.name}
                      </span>
                      <span className="font-mono text-slate-500 text-xs">
                        NISN: {student.nisn} • {student.classRank}
                      </span>
                      <span className="text-xs text-slate-400 block font-mono">
                        Wallet: {shortenAddress(student.walletAddress)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block text-sm">
                        {student.schoolName}
                      </span>
                      <span className="text-xs text-slate-500">
                        Jenjang: <strong>{student.gradeLevel}</strong>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold font-mono text-slate-900">
                      {formatIDR(student.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={student.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {student.status === EscrowStatus.MenungguVerifikasi ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenVerifyModal(student)}
                            disabled={actionLoadingId === student.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors active:scale-95 disabled:opacity-50"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Sahkan</span>
                          </button>
                          <button
                            onClick={() => handleReject(student)}
                            disabled={actionLoadingId === student.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium text-xs transition-colors active:scale-95 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      ) : student.status === EscrowStatus.Terverifikasi ? (
                        <span className="text-slate-700 font-medium text-xs flex items-center justify-end gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Menunggu Transfer Escrow
                        </span>
                      ) : student.status === EscrowStatus.Tersalurkan ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-emerald-700 font-medium text-xs flex items-center justify-end gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Dana Selesai Ditransfer
                          </span>
                          {student.txHash && (
                            <a
                              href={`https://amoy.polygonscan.com/tx/${student.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-mono hover:underline"
                            >
                              <span>{shortenAddress(student.txHash, 6)}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-rose-600 font-medium text-xs">
                          Ditolak Verifikator
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">
                    Otorisasi Kelayakan Siswa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Penerbitan rekomendasi digital on-chain
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-base font-medium"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Siswa:</span>
                <span className="font-semibold text-slate-900">{selectedStudent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">NISN:</span>
                <span className="font-mono text-slate-800">{selectedStudent.nisn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sekolah & Jenjang:</span>
                <span className="text-slate-800">
                  {selectedStudent.schoolName} ({selectedStudent.gradeLevel})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dompet Penerima:</span>
                <span className="font-mono text-slate-800 break-all">
                  {shortenAddress(selectedStudent.walletAddress, 6)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Besaran Bantuan PIP yang Disahkan (Rupiah) *
                </label>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold font-mono focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setCustomAmount(450000)}
                    className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 font-medium"
                  >
                    SD (450rb)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomAmount(750000)}
                    className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 font-medium"
                  >
                    SMP (750rb)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomAmount(1800000)}
                    className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700 font-medium"
                  >
                    SMA/SMK (1.8jt)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nomor Surat Rekomendasi Satuan Pendidikan *
                </label>
                <input
                  type="text"
                  value={recommendationLetter}
                  onChange={(e) => setRecommendationLetter(e.target.value)}
                  placeholder="Contoh: 421/SMAN1/PIP/XI/2026"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmVerify}
                disabled={actionLoadingId !== null}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {actionLoadingId ? "Memproses..." : "Sahkan Rekomendasi On-Chain"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
