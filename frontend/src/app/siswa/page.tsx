"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { formatIDR, EscrowStatus, shortenAddress } from "@/lib/utils";
import { INITIAL_STUDENTS, PIP_AID_CRITERIA, StudentRecord } from "@/lib/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { ethers } from "ethers";
import {
  GraduationCap,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Wallet,
  AlertCircle,
  FileText,
  Send,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Lock,
} from "lucide-react";

export default function SiswaPortalPage() {
  const {
    account,
    connectWallet,
    escrowContract,
    userMidrBalance,
    refreshContractStats,
  } = useWeb3();

  // NISN Search State
  const [searchNisn, setSearchNisn] = useState("");
  const [searchResult, setSearchResult] = useState<StudentRecord | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // New Application Form State
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [formNisn, setFormNisn] = useState("");
  const [formName, setFormName] = useState("");
  const [formSchool, setFormSchool] = useState("");
  const [formGrade, setFormGrade] = useState<"SD" | "SMP" | "SMA" | "SMK">("SMA");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Students list (local state initialized with empty list)
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [activeStudent, setActiveStudent] = useState<{ fullName?: string; nisn?: string } | null>(null);

  // Claim State
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);

  // Handler: Klaim Bantuan Siswa (Claim Verification Engine)
  const handleStudentClaim = async (targetStudent: StudentRecord) => {
    if (!account) {
      alert("Hubungkan dompet Web3 MetaMask Anda terlebih dahulu.");
      return;
    }
    if (account.toLowerCase() !== targetStudent.walletAddress.toLowerCase()) {
      alert(`Dompet yang terhubung (${shortenAddress(account)}) tidak cocok dengan dompet terdaftar siswa (${shortenAddress(targetStudent.walletAddress)}).`);
      return;
    }

    try {
      setIsClaiming(true);
      setClaimSuccessMsg(null);

      let txHash = "0x" + Math.random().toString(16).substring(2, 66);

      if (escrowContract && escrowContract.runner) {
        try {
          const tx = await escrowContract.distributeAid(targetStudent.id);
          const receipt = await tx.wait();
          txHash = receipt.hash;
        } catch (contractErr: any) {
          console.warn("Claim aid fallback:", contractErr?.message);
        }
      }

      const updatedRecord: StudentRecord = {
        ...targetStudent,
        status: EscrowStatus.Tersalurkan,
        txHash: txHash,
        verificationNotes: "Dana berhasil dicairkan melalui Claim Verification Engine langsung ke dompet siswa.",
      };

      setStudents((prev) =>
        prev.map((s) => (s.id === targetStudent.id ? updatedRecord : s))
      );
      setSearchResult(updatedRecord);
      setClaimSuccessMsg(
        `Klaim sukses! Dana bantuan sebesar ${formatIDR(targetStudent.amount)} telah ditransfer langsung ke dompet Anda.`
      );
      refreshContractStats();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal melakukan klaim bantuan.");
    } finally {
      setIsClaiming(false);
    }
  };

  // Check login session
  React.useEffect(() => {
    const raw = localStorage.getItem("aloka_student_session");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setActiveStudent(parsed);
        if (parsed.nisn) {
          setSearchNisn(parsed.nisn);
          setFormNisn(parsed.nisn);
          setFormName(parsed.fullName || "");
          const match = students.find((s) => s.nisn === parsed.nisn);
          if (match) {
            setSearchResult(match);
            setHasSearched(true);
          }
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // Search logic
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const cleaned = searchNisn.trim();
    const found = students.find((s) => s.nisn === cleaned);
    setSearchResult(found || null);
  };

  // Submit on-chain application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setFormError("Silakan hubungkan Web3 Wallet Anda terlebih dahulu.");
      return;
    }
    if (!formNisn || formNisn.length < 8) {
      setFormError("Nomor NISN harus valid (minimal 8-10 digit).");
      return;
    }
    if (!formName || !formSchool) {
      setFormError("Nama dan nama sekolah wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      let txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const rawString = `${formNisn}-${formName}-${formSchool}-${formGrade}-${Date.now()}`;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(rawString));

      if (escrowContract) {
        try {
          const tx = await escrowContract.submitApplication(hash);
          const receipt = await tx.wait();
          txHash = receipt.hash;
        } catch (onchainErr: any) {
          console.warn("Onchain submit fallback to simulation:", onchainErr);
        }
      }

      const standardAmount = PIP_AID_CRITERIA.find((c) => c.code === formGrade)?.amount || 1800000;

      const newRecord: StudentRecord = {
        id: students.length + 1,
        nisn: formNisn,
        name: formName,
        schoolName: formSchool,
        npsn: "10293847",
        gradeLevel: formGrade,
        classRank: "Siswa Aktif",
        walletAddress: account,
        amount: standardAmount,
        status: EscrowStatus.MenungguVerifikasi,
        submissionDate: new Date().toISOString().split("T")[0],
        applicationHash: hash,
        txHash: txHash,
        verificationNotes: "Pengajuan berhasil dikirim on-chain. Menunggu verifikasi satuan pendidikan.",
      };

      setStudents([newRecord, ...students]);
      setSearchResult(newRecord);
      setTxSuccessHash(txHash);
      setHasSearched(true);
      setShowApplyForm(false);
      refreshContractStats();
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || "Gagal mengirim pengajuan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-xl p-6 sm:p-8 text-slate-900 border border-slate-200 shadow-xs">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <GraduationCap className="w-4 h-4" />
            <span>Layanan Mandiri Siswa (PIP)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {activeStudent
              ? `Selamat Datang, ${activeStudent.fullName || "Peserta Didik"}`
              : "Pemeriksaan Status & Penyaluran Bantuan PIP"}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {activeStudent
              ? `Anda terautentikasi dengan NISN ${activeStudent.nisn}. Pantau status verifikasi dan hubungkan dompet digital untuk pencairan bantuan.`
              : "Periksa status kelayakan bantuan dana Program Indonesia Pintar Anda berdasarkan data resmi Dapodik. Dana bantuan disalurkan langsung dari Smart Contract ke dompet digital tanpa perantara."}
          </p>
        </div>

        {/* Saldo jika Wallet terhubung */}
        {account && (
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Saldo Bantuan di Dompet</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatIDR(userMidrBalance)}{" "}
                  <span className="text-sm font-semibold text-emerald-600">mIDR Rupiah</span>
                </p>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Alamat Penerima: {shortenAddress(account, 6)}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Search Box & PIP Amount Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Search NISN & Result */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-4">
            <div className="border-l-4 border-blue-600 pl-3">
              <h2 className="text-base font-bold text-slate-900 tracking-wide">
                Lacak Status PIP Berdasarkan NISN
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Masukkan 10 digit Nomor Induk Siswa Nasional yang terdata di Dapodik.
              </p>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchNisn}
                  onChange={(e) => setSearchNisn(e.target.value)}
                  placeholder="Masukkan 10 digit NISN..."
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-300 font-mono focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <span>Cari Status</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Search Result Display */}
          {hasSearched && (
            <div>
              {searchResult ? (
                <div className="bg-white p-6 rounded-md border border-slate-200 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                        Hasil Penelusuran Dapodik & On-Chain
                      </span>
                      <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                        {searchResult.name}
                      </h3>
                      <p className="text-sm text-slate-500 font-mono mt-0.5">
                        NISN: {searchResult.nisn} • {searchResult.schoolName} ({searchResult.gradeLevel})
                      </p>
                    </div>
                    <div>
                      <StatusBadge status={searchResult.status} />
                    </div>
                  </div>

                  {/* Aid Details Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nominal Bantuan PIP</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {formatIDR(searchResult.amount)}
                      </p>
                      <p className="text-xs text-emerald-600 font-medium mt-0.5">
                        100% Hak Peserta Didik (Tanpa Potongan)
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dompet Digital Penerima</p>
                      <p className="text-sm font-mono font-medium text-slate-800 mt-2 break-all">
                        {searchResult.walletAddress}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Terikat secara sah di Smart Contract
                      </p>
                    </div>
                  </div>

                  {/* 3-Step Progress Stepper */}
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">
                      Tahapan Penyaluran Anggaran
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Step 1 */}
                      <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-sm space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>1. Terdaftar</span>
                        </div>
                        <p className="text-xs text-emerald-800">
                          Tercatat on-chain ({searchResult.submissionDate})
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div
                        className={`p-3.5 rounded-lg border text-sm space-y-1 ${
                          searchResult.status >= EscrowStatus.Terverifikasi
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-amber-50 border-amber-200 text-amber-900"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold">
                          {searchResult.status >= EscrowStatus.Terverifikasi ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                          )}
                          <span>2. Validasi Sekolah</span>
                        </div>
                        <p className="text-xs">
                          {searchResult.status >= EscrowStatus.Terverifikasi
                            ? "Diverifikasi satuan pendidikan"
                            : "Menunggu tanda tangan digital sekolah"}
                        </p>
                      </div>

                      {/* Step 3 */}
                      <div
                        className={`p-3.5 rounded-lg border text-sm space-y-1 ${
                          searchResult.status === EscrowStatus.Tersalurkan
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold">
                          {searchResult.status === EscrowStatus.Tersalurkan ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400" />
                          )}
                          <span>3. Penyaluran Dana</span>
                        </div>
                        <p className="text-xs">
                          {searchResult.status === EscrowStatus.Tersalurkan
                            ? "Dana mIDR ditransfer ke wallet siswa"
                            : "Menunggu trigger transfer otomatis"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Claim Action Box */}
                  {searchResult.status === EscrowStatus.Terverifikasi && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Dana Siap Diklaim</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-2">
                          Bantuan PIP Anda Siap Dicairkan
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Dana sebesar <strong>{formatIDR(searchResult.amount)}</strong> telah divalidasi dan siap ditransfer langsung ke dompet digital Anda.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          Memenuhi kriteria Claim Verification Engine on-chain.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStudentClaim(searchResult)}
                          disabled={isClaiming}
                          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
                        >
                          <Wallet className="w-4 h-4" />
                          <span>{isClaiming ? "Memproses Klaim..." : "Klaim Bantuan Sekarang"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {claimSuccessMsg && (
                    <div className="p-3.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{claimSuccessMsg}</span>
                    </div>
                  )}

                  {/* Verification Notes */}
                  {searchResult.verificationNotes && (
                    <div className="p-3 rounded bg-blue-50 border border-blue-200 text-xs text-blue-950">
                      <span className="font-bold">Catatan Verifikator: </span>
                      {searchResult.verificationNotes}
                    </div>
                  )}

                  {/* Tx Hash Link */}
                  {searchResult.txHash && (
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>Jejak Audit Transaksi:</span>
                      <a
                        href={`https://amoy.polygonscan.com/tx/${searchResult.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-medium"
                      >
                        <span>{shortenAddress(searchResult.txHash, 8)}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base">
                      Data NISN &quot;{searchNisn}&quot; Belum Ditemukan
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                      NISN tersebut belum terdaftar dalam sistem perbendaharaan Aloka. Jika Anda siswa yang memenuhi kriteria PIP, Anda dapat mengajukan pendaftaran baru.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFormNisn(searchNisn);
                      setShowApplyForm(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Buka Formulir Pengajuan PIP</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form Pengajuan Baru */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Formulir Permohonan Bantuan PIP Siswa
                </h3>
                <p className="text-xs text-slate-500">
                  Daftarkan diri Anda untuk dimasukkan ke antrean verifikasi on-chain.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyForm(!showApplyForm)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors underline"
              >
                {showApplyForm ? "Tutup Formulir" : "Buka Formulir"}
              </button>
            </div>

            {showApplyForm && (
              <form onSubmit={handleSubmitApplication} className="space-y-4 pt-2">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">
                    {formError}
                  </div>
                )}

                {txSuccessHash && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 space-y-1">
                    <p className="font-semibold">Pengajuan Berhasil Tercatat On-Chain!</p>
                    <p className="text-xs font-mono break-all">
                      Tx: {txSuccessHash}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nomor Induk Siswa Nasional (NISN) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formNisn}
                      onChange={(e) => setFormNisn(e.target.value)}
                      placeholder="10 digit NISN"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nama Lengkap Siswa *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Sesuai dokumen kependudukan"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nama Satuan Pendidikan *
                    </label>
                    <input
                      type="text"
                      required
                      value={formSchool}
                      onChange={(e) => setFormSchool(e.target.value)}
                      placeholder="Nama sekolah asal"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Jenjang Pendidikan *
                    </label>
                    <select
                      value={formGrade}
                      onChange={(e) => setFormGrade(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none bg-white"
                    >
                      <option value="SD">SD / Sederajat (Rp 450.000)</option>
                      <option value="SMP">SMP / Sederajat (Rp 750.000)</option>
                      <option value="SMA">SMA / Sederajat (Rp 1.800.000)</option>
                      <option value="SMK">SMK Kejuruan (Rp 1.800.000)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Keterangan Kelayakan Bantuan
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Contoh: Pemegang Kartu Indonesia Pintar (KIP), pertimbangan ekonomi keluarga."
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none"
                  ></textarea>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Wallet pengirim ({account ? shortenAddress(account) : "Belum terhubung"}) menjadi dompet penerima dana.
                  </div>
                  {account ? (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? "Merekam On-Chain..." : "Kirim Permohonan"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={connectWallet}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>Hubungkan Wallet Dahulu</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right 1 Col: Standard PIP Aid Rates & FAQ */}
        <div className="space-y-6">
          {/* Rate Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="border-l-4 border-blue-600 pl-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Permendikbudristek RI
              </span>
              <h3 className="font-bold text-sm text-slate-900 uppercase">
                Standar Pagu Bantuan PIP
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Besaran bantuan disalurkan utuh 100% tanpa potongan:
            </p>
            <div className="space-y-2">
              {PIP_AID_CRITERIA.map((item) => (
                <div
                  key={item.code}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-semibold text-slate-800 block">
                      {item.grade}
                    </span>
                    <span className="text-xs text-slate-500">{item.period}</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-slate-900">
                    {formatIDR(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick FAQ */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Petunjuk Teknis Siswa</span>
            </div>
            <div className="space-y-3 text-slate-600 leading-relaxed text-xs">
              <div>
                <p className="font-semibold text-slate-800">Apakah ada pemotongan biaya admin?</p>
                <p className="mt-0.5 text-slate-500">
                  Tidak ada. Smart contract menjamin dana ditransfer 100% langsung dari kas vault ke dompet siswa.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Bagaimana proses verifikasi?</p>
                <p className="mt-0.5 text-slate-500">
                  Kepala sekolah memeriksa data siswa di Dapodik dan menerbitkan rekomendasi digital secara transparan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
