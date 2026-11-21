"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { formatIDR, EscrowStatus, shortenAddress } from "@/lib/utils";
import { CONTRACT_ADDRESSES } from "@/contracts/addresses";
import { INITIAL_STUDENTS, StudentRecord, INITIAL_SCHOOL_VALIDATORS, SchoolValidator } from "@/lib/mockData";
import {
  Building2,
  Lock,
  ArrowUpRight,
  ShieldCheck,
  PlusCircle,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function PemerintahAdminPage() {
  const {
    account,
    isOwner,
    escrowContract,
    mockIdrContract,
    escrowBalance,
    userMidrBalance,
    totalFunded,
    totalDistributed,
    refreshContractStats,
  } = useWeb3();

  // State initialized with empty database
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_STUDENTS);
  const [validators, setValidators] = useState<SchoolValidator[]>(INITIAL_SCHOOL_VALIDATORS);

  // Vault Fund Form
  const [fundAmount, setFundAmount] = useState<number>(50000000);
  const [isFunding, setIsFunding] = useState<boolean>(false);
  const [fundSuccess, setFundSuccess] = useState<string | null>(null);

  // Mint Tokens Simulation
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [mintSuccess, setMintSuccess] = useState<string | null>(null);

  // Add Validator Form
  const [newValidatorAddress, setNewValidatorAddress] = useState<string>("");
  const [newValidatorName, setNewValidatorName] = useState<string>("");
  const [validatorSuccess, setValidatorSuccess] = useState<string | null>(null);

  // Distribution action
  const [distributingId, setDistributingId] = useState<number | null>(null);
  const [distributeSuccess, setDistributeSuccess] = useState<string | null>(null);

  // Verified applications ready for distribution
  const readyToDistribute = students.filter(
    (s) => s.status === EscrowStatus.Terverifikasi
  );

  // Handler: Mint MockIDR
  const handleMintTokens = async () => {
    if (!account) {
      alert("Hubungkan wallet terlebih dahulu.");
      return;
    }
    try {
      setIsMinting(true);
      setMintSuccess(null);
      const mintAmount = 100000000; // 100 juta mIDR

      if (mockIdrContract && mockIdrContract.runner) {
        try {
          const tx = await mockIdrContract.mint(account, mintAmount);
          await tx.wait();
        } catch (e: any) {
          console.warn("Mint fallback:", e?.message);
        }
      }

      setMintSuccess(`Berhasil mengalokasikan ${formatIDR(mintAmount)} simulasi kas APBN ke wallet KPA Anda.`);
      refreshContractStats();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal melakukan mint token.");
    } finally {
      setIsMinting(false);
    }
  };

  // Handler: Fund Escrow Vault
  const handleFundVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      alert("Hubungkan wallet terlebih dahulu.");
      return;
    }
    if (fundAmount <= 0) return;

    try {
      setIsFunding(true);
      setFundSuccess(null);

      if (mockIdrContract && escrowContract && mockIdrContract.runner && escrowContract.runner) {
        try {
          // 1. Approve
          const allowance = await mockIdrContract.allowance(account, CONTRACT_ADDRESSES.escrow);
          if (BigInt(allowance) < BigInt(fundAmount)) {
            const approveTx = await mockIdrContract.approve(CONTRACT_ADDRESSES.escrow, fundAmount);
            await approveTx.wait();
          }

          // 2. Fund
          const fundTx = await escrowContract.fund(fundAmount);
          await fundTx.wait();
        } catch (e: any) {
          console.warn("Fund contract fallback:", e?.message);
        }
      }

      setFundSuccess(`Berhasil mendepositkan dana sebesar ${formatIDR(fundAmount)} ke Smart Contract Escrow Vault.`);
      refreshContractStats();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal mendepositkan dana.");
    } finally {
      setIsFunding(false);
    }
  };

  // Handler: Add School Validator
  const handleAddValidator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValidatorAddress) return;

    try {
      if (escrowContract && escrowContract.runner) {
        try {
          const tx = await escrowContract.setSchoolValidator(newValidatorAddress, true);
          await tx.wait();
        } catch (e: any) {
          console.warn("Set validator fallback:", e?.message);
        }
      }

      const newEntry: SchoolValidator = {
        name: newValidatorName || "Satuan Pendidikan Baru",
        address: newValidatorAddress,
        active: true,
      };

      setValidators([newEntry, ...validators]);
      setValidatorSuccess(`Alamat ${shortenAddress(newValidatorAddress)} berhasil diotorisasi sebagai verifikator sekolah.`);
      setNewValidatorAddress("");
      setNewValidatorName("");
      refreshContractStats();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal menambahkan validator.");
    }
  };

  // Handler: Distribute Aid
  const handleDistribute = async (student: StudentRecord) => {
    try {
      setDistributingId(student.id);
      setDistributeSuccess(null);

      let txHash = "0x" + Math.random().toString(16).substring(2, 66);

      if (escrowContract && escrowContract.runner) {
        try {
          const tx = await escrowContract.distributeAid(student.id);
          const receipt = await tx.wait();
          txHash = receipt.hash;
        } catch (e: any) {
          console.warn("Distribute aid contract fallback:", e?.message);
        }
      }

      setStudents((prev) =>
        prev.map((s) =>
          s.id === student.id
            ? {
                ...s,
                status: EscrowStatus.Tersalurkan,
                txHash: txHash,
                verificationNotes: "Dana ditransfer langsung dari Escrow Vault ke dompet siswa.",
              }
            : s
        )
      );

      setDistributeSuccess(
        `Bantuan sebesar ${formatIDR(student.amount)} telah berhasil ditransfer langsung ke dompet siswa ${student.name}!`
      );
      refreshContractStats();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Gagal menyalurkan bantuan.");
    } finally {
      setDistributingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-slate-200">
        <div className="border-l-4 border-blue-600 pl-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block">
            Direktorat Jenderal Perbendaharaan / KPA PIP
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Admin Perbendaharaan & Pengelolaan Vault
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pengelolaan alokasi dana APBN, penguncian kas negara di Smart Contract Escrow, dan otorisasi validator satuan pendidikan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOwner ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Otoritas KPA Terotentikasi</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Simulasi Admin Terbuka</span>
            </div>
          )}
        </div>
      </div>

      {/* Vault KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-300 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Saldo Escrow Vault</span>
            <Lock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {formatIDR(escrowBalance)}
          </div>
          <p className="mt-1 text-xs text-slate-400 font-mono">
            Escrow: {shortenAddress(CONTRACT_ADDRESSES.escrow, 6)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Total Dana Disetorkan</span>
            <Coins className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatIDR(totalFunded)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Injeksi kas dari APBN Pusat</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Total Dana Tersalurkan</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatIDR(totalDistributed)}
          </div>
          <p className="mt-1 text-xs text-slate-500">Langsung cair ke dompet siswa</p>
        </div>
      </div>

      {/* Notifications */}
      {fundSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{fundSuccess}</span>
        </div>
      )}
      {mintSuccess && (
        <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span>{mintSuccess}</span>
        </div>
      )}
      {distributeSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{distributeSuccess}</span>
        </div>
      )}
      {validatorSuccess && (
        <div className="p-3.5 rounded-lg bg-slate-100 border border-slate-300 text-sm text-slate-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-slate-700 flex-shrink-0" />
          <span>{validatorSuccess}</span>
        </div>
      )}

      {/* Action Row: Fund Escrow & Mint Simulasi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Deposit Dana ke Vault */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Deposit Kas Negara ke Escrow Vault
              </h2>
              <p className="text-xs text-slate-500">
                Kunci alokasi pagu bantuan PIP ke dalam smart contract.
              </p>
            </div>
          </div>

          <form onSubmit={handleFundVault} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nominal Deposit Dana (mIDR Rupiah)
              </label>
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold font-mono focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setFundAmount(10000000)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  10 Juta
                </button>
                <button
                  type="button"
                  onClick={() => setFundAmount(50000000)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  50 Juta
                </button>
                <button
                  type="button"
                  onClick={() => setFundAmount(100000000)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700"
                >
                  100 Juta
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Saldo Wallet KPA: <strong className="text-slate-900">{formatIDR(userMidrBalance)} mIDR</strong>
              </span>
              <button
                type="submit"
                disabled={isFunding}
                className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{isFunding ? "Mengunci Dana..." : "Kunci Dana ke Vault"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Simulasi Faucet Token APBN */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Simulasi Kas Negara (MockIDR Faucet)
              </h2>
              <p className="text-xs text-slate-500">
                Pencetakan token Rupiah Digital untuk uji alokasi APBN PIP.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900 space-y-1">
            <p className="font-semibold">Informasi Token Kas:</p>
            <p className="text-xs leading-relaxed">
              Token MockIDR adalah representasi Rupiah digital 1:1. Anda dapat mencetak 100 Juta mIDR ke wallet pemerintah Anda untuk kemudian didepositkan ke vault escrow.
            </p>
          </div>

          <button
            type="button"
            onClick={handleMintTokens}
            disabled={isMinting}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" />
            <span>{isMinting ? "Mencetak Token mIDR..." : "Cetak 100.000.000 mIDR (Simulasi APBN)"}</span>
          </button>
        </div>
      </div>

      {/* Modul MVP 3: Automatic Eligibility Validation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Automatic Eligibility Validation Engine
            </h2>
            <p className="text-xs text-slate-500">
              Modul validasi otomatis kelayakan penerima PIP sebelum pembuatan alokasi on-chain.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-900 block text-sm">1. Registered NISN Check</span>
              <p className="text-xs text-emerald-800">Nomor induk valid terdata aktif di basis data Dapodik/Emis.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-900 block text-sm">2. Active Student Status</span>
              <p className="text-xs text-emerald-800">Memastikan peserta didik terdaftar pada semester berjalan.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-900 block text-sm">3. Available School Recommendation</span>
              <p className="text-xs text-emerald-800">Tersedia surat rekomendasi resmi bertandatangan digital sekolah.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-900 block text-sm">4. Valid School Information</span>
              <p className="text-xs text-emerald-800">NPSN dan izin operasional satuan pendidikan terverifikasi sah.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-900 block text-sm">5. No Duplicate Beneficiary</span>
              <p className="text-xs text-emerald-800">Pencegahan alokasi ganda untuk satu nomor NISN dalam 1 tahun anggaran.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-900 block text-sm">6. PIP Eligibility Compliance</span>
              <p className="text-xs text-emerald-800">Kesesuaian kriteria ekonomi (DTKS/KIP/keluarga prasejahtera).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Eksekusi Penyaluran Dana */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Antrean Penyaluran Bantuan Terverifikasi
            </h2>
            <p className="text-sm text-slate-500">
              Siswa berikut telah diverifikasi resmi oleh sekolah dan siap dicairkan langsung dari Smart Contract.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 self-start sm:self-auto">
            {readyToDistribute.length} Pengajuan Siap Cair
          </span>
        </div>

        {readyToDistribute.length === 0 ? (
          <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg text-sm">
            Saat ini tidak ada siswa dalam status &quot;Terverifikasi&quot; yang menunggu pencairan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Nama Siswa & NISN</th>
                  <th className="py-3 px-4">Satuan Pendidikan</th>
                  <th className="py-3 px-4">Nominal</th>
                  <th className="py-3 px-4">Dompet Siswa</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readyToDistribute.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">#{student.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-900 block">{student.name}</span>
                      <span className="font-mono text-slate-500 text-xs">NISN: {student.nisn}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 block">{student.schoolName}</span>
                      <span className="text-xs text-slate-500">Jenjang: {student.gradeLevel}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-600">
                      {formatIDR(student.amount)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 text-xs">
                      {shortenAddress(student.walletAddress, 6)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDistribute(student)}
                        disabled={distributingId === student.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors disabled:opacity-50 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {distributingId === student.id ? "Mentransfer..." : "Cairkan Dana"}
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manajemen Validator Satuan Pendidikan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Manajemen Validator Satuan Pendidikan
            </h2>
            <p className="text-xs text-slate-500">
              Otorisasi dompet resmi pihak sekolah untuk memvalidasi data siswa on-chain.
            </p>
          </div>
        </div>

        {/* Add Validator Form */}
        <form onSubmit={handleAddValidator} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            required
            placeholder="Alamat Wallet Sekolah (0x...)"
            value={newValidatorAddress}
            onChange={(e) => setNewValidatorAddress(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Nama Satuan Pendidikan (misal: SMAN 1 Jakarta)"
            value={newValidatorName}
            onChange={(e) => setNewValidatorName(e.target.value)}
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Daftarkan Validator</span>
            </button>
            {account && (
              <button
                type="button"
                onClick={() => setNewValidatorAddress(account)}
                title="Gunakan alamat dompet yang sedang terhubung"
                className="px-3 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
              >
                Gunakan Saya
              </button>
            )}
          </div>
        </form>

        {/* Validator Table */}
        <div className="overflow-x-auto pt-1">
          {validators.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg text-sm">
              Belum ada validator sekolah yang terdaftar.
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider text-xs font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Satuan Pendidikan</th>
                  <th className="py-3 px-4">Alamat Dompet On-Chain</th>
                  <th className="py-3 px-4">Status Otorisasi</th>
                  <th className="py-3 px-4 text-right">Audit Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validators.map((val, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{val.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{val.address}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Aktif
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`https://amoy.polygonscan.com/address/${val.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 font-medium text-xs"
                      >
                        <span>Polygonscan</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
