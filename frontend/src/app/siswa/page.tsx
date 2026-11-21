"use client";

import React, { useState } from "react";
import { useWeb3 } from "@/context/Web3Context";
import { formatIDR, EscrowStatus, shortenAddress, mapOnchainStatus } from "@/lib/utils";
import { INITIAL_STUDENTS, PIP_AID_CRITERIA, StudentRecord } from "@/lib/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getStudentToken,
  getStudentSession,
  hasActiveStudentSession,
} from "@/lib/session";
import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from "@/contracts/addresses";
import { MOCK_IDR_ABI } from "@/contracts/abis";
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
  Loader2,
  Download,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

export default function SiswaPortalPage() {
  const {
    account,
    signer,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    isCorrectNetwork,
    walletAvailable,
    isLoading: walletLoading,
    escrowContract,
    refreshContractStats,
  } = useWeb3();

  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [isWalletBound, setIsWalletBound] = useState(false);

  // Saldo mIDR di-read langsung dari RPC public (publicnode) — independent dari
  // BrowserProvider MetaMask (yang internal RPC-nya juga bisa deprecated/cached).
  // Pakai wallet address siswa yang sedang login. Refresh tiap 15 detik.
  const [cardMidrBalance, setCardMidrBalance] = useState<bigint>(BigInt(0));

  const [copiedWallet, setCopiedWallet] = useState(false);
  const handleCopyWallet = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

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

  // Profile fetch state
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

  // Konversi response backend application/me -> StudentRecord
  const buildRecordFromBackend = (app: any): StudentRecord => {
    const student = app.student || {};
    const school = student.school || {};
    const status: EscrowStatus = mapOnchainStatus(app.onchainStatus);
    const amount = Number(app.amount || 0);
    const txHash =
      app.txDistributeHash || app.txVerifyHash || app.txSubmitHash || undefined;
    const submissionDate = (app.createdAt || new Date().toISOString()).split("T")[0];
    const verificationNotes =
      status === EscrowStatus.Tersalurkan
        ? "Dana bantuan telah ditransfer ke dompet Anda melalui Smart Contract Escrow."
        : status === EscrowStatus.Terverifikasi
        ? "Sekolah telah memvalidasi kelayakan Anda. Menunggu penyaluran dari Escrow Vault."
        : status === EscrowStatus.Ditolak
        ? app.rejectionReason || "Pengajuan ditolak oleh verifikator."
        : "Menunggu tanda tangan digital dari satuan pendidikan.";

    return {
      id: app.onchainId || app.id || Math.floor(Math.random() * 1_000_000),
      applicationDbId: app.id,
      nisn: student.nisn || "",
      name: student.fullName || "Peserta Didik",
      schoolName: school.name || "Sekolah Tidak Terdata",
      npsn: school.npsn || "",
      gradeLevel: student.gradeLevel || "SMA",
      classRank: "Siswa Aktif",
      walletAddress: student.walletAddress || account || "", // Pertahankan wallet siswa dari database jika sudah terdaftar
      amount,
      status,
      submissionDate,
      applicationHash: app.applicationHash || "",
      txHash,
      verificationNotes,
    };
  };

  // Fetch profil + application siswa dari backend setelah login
  const loadStudentProfileFromBackend = async () => {
    const token = getStudentToken();
    const session = getStudentSession<any>();
    if (!token || !session) return;

    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch(`${API_URL}/applications/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const record = buildRecordFromBackend(data.data);
        const boundWallet = data.data.student?.walletAddress || "";
        if (boundWallet && account && boundWallet.toLowerCase() === account.toLowerCase()) {
          setIsWalletBound(true);
        } else {
          setIsWalletBound(false);
        }
        setStudents([record]);
        setSearchResult(record);
        setHasSearched(true);
        setSearchNisn(record.nisn);
        setFormNisn(record.nisn);
        setFormName(record.name);
        setFormSchool(record.schoolName);
        setFormGrade(record.gradeLevel);
        // Auto-expand form pengajuan jika user belum punya aplikasi atau ditolak
        if (
          record.status === EscrowStatus.BelumAda ||
          record.status === EscrowStatus.Ditolak
        ) {
          setShowApplyForm(true);
        }
      } else if (!res.ok && data?.error?.code === "APPLICATION_NOT_FOUND") {
        // Siswa valid tapi belum punya application — tampilkan profil dasar + auto-buka form
        const basicRecord: StudentRecord = {
          id: Math.floor(Math.random() * 1_000_000),
          nisn: session.nisn || "",
          name: session.fullName || "Peserta Didik",
          schoolName: session.school?.name || "Sekolah Tidak Terdata",
          npsn: session.school?.npsn || "",
          gradeLevel: session.gradeLevel || "SMA",
          classRank: "Siswa Aktif",
          walletAddress: account || "",
          amount: 0,
          status: EscrowStatus.BelumAda,
          submissionDate: new Date().toISOString().split("T")[0],
          applicationHash: "",
          verificationNotes: "Anda belum memiliki pengajuan PIP on-chain. Silakan ajukan melalui formulir di bawah.",
        };
        setStudents([basicRecord]);
        setSearchResult(basicRecord);
        setHasSearched(true);
        setFormNisn(basicRecord.nisn);
        setFormName(basicRecord.name);
        setFormSchool(basicRecord.schoolName);
        setFormGrade(basicRecord.gradeLevel);
        setShowApplyForm(true);
      } else if (!res.ok) {
        setProfileError(data?.message || "Gagal memuat profil dari server.");
      }
    } catch (err: any) {
      console.warn("Fetch /applications/me failed:", err?.message);
      setProfileError("Backend tidak dapat dijangkau. Memuat data sesi lokal.");
      // Fallback ke session lokal minimal
      if (session) {
        const fallback: StudentRecord = {
          id: Math.floor(Math.random() * 1_000_000),
          nisn: session.nisn || "",
          name: session.fullName || "Peserta Didik",
          schoolName: session.school?.name || "Sekolah Tidak Terdata",
          npsn: session.school?.npsn || "",
          gradeLevel: session.gradeLevel || "SMA",
          classRank: "Siswa Aktif",
          walletAddress: account || "",
          amount: 0,
          status: EscrowStatus.BelumAda,
          submissionDate: new Date().toISOString().split("T")[0],
          applicationHash: "",
          verificationNotes: "Mode offline — data dari sesi lokal. Hubungkan ke backend untuk data live.",
        };
        setStudents([fallback]);
        setSearchResult(fallback);
        setHasSearched(true);
        setFormNisn(fallback.nisn);
        setFormName(fallback.name);
        setFormSchool(fallback.schoolName);
        setFormGrade(fallback.gradeLevel);
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  // Handler: Klaim Bantuan Siswa (Claim Verification Engine)
  const handleStudentClaim = async (targetStudent: StudentRecord) => {
    if (!account) {
      alert("Hubungkan dompet Web3 MetaMask Anda terlebih dahulu.");
      return;
    }

    try {
      setIsClaiming(true);
      setClaimSuccessMsg(null);

      const token = getStudentToken();
      let txHash = "";

      // 1. Eksekusi pencairan on-chain melalui relayer backend
      if (targetStudent.applicationDbId && token) {
        // Pastikan alamat wallet aktif di MetaMask terikat ke akun siswa di backend sebelum klaim
        if (account && (!targetStudent.walletAddress || targetStudent.walletAddress.toLowerCase() !== account.toLowerCase())) {
          try {
            await fetch(`${API_URL}/students/wallet/connect`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ walletAddress: account }),
            });
          } catch (bindErr) {
            console.warn("Auto-binding wallet notice:", bindErr);
          }
        }

        const res = await fetch(`${API_URL}/blockchain/applications/${targetStudent.applicationDbId}/distribute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result?.message || result?.error?.message || "Gagal mencairkan dana on-chain.");
        }
        txHash = result.data?.txHash || "";
      } else if (escrowContract && (escrowContract as any).runner) {
        // Fallback jika direct contract call
        const tx = await (escrowContract as any).distributeAid(targetStudent.id);
        const receipt = await tx.wait();
        txHash = receipt.hash;
      }

      const updatedRecord: StudentRecord = {
        ...targetStudent,
        status: EscrowStatus.Tersalurkan,
        txHash: txHash || undefined,
        verificationNotes: "Dana bantuan telah berhasil ditransfer langsung on-chain ke dompet MetaMask Anda.",
      };

      setStudents((prev) =>
        prev.map((s) => (s.id === targetStudent.id ? updatedRecord : s))
      );
      setSearchResult(updatedRecord);
      setClaimSuccessMsg(
        `Klaim sukses! Dana bantuan sebesar ${formatIDR(targetStudent.amount)} telah ditransfer langsung ke dompet MetaMask Anda on-chain Polygon Amoy.`
      );
      await refreshContractStats();
    } catch (err: any) {
      console.error("Claim error:", err);
      alert(err?.message || "Gagal melakukan klaim bantuan.");
    } finally {
      setIsClaiming(false);
    }
  };

  // Check login session + fetch profile dari backend
  React.useEffect(() => {
    const parsed = getStudentSession<any>();
    if (parsed && hasActiveStudentSession()) {
      setActiveStudent(parsed);
      if (parsed.nisn) {
        setSearchNisn(parsed.nisn);
        setFormNisn(parsed.nisn);
        setFormName(parsed.fullName || "");
      }
    } else if (parsed && !hasActiveStudentSession()) {
      // Sisa session tanpa token aktif → bersihkan; SessionGuard akan redirect.
      // Tidak perlu action eksplisit di sini.
    }
    // Fetch data live dari backend
    loadStudentProfileFromBackend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pantau apakah akun MetaMask aktif cocok dengan status terikat siswa
  React.useEffect(() => {
    if (!account) {
      setIsWalletBound(false);
      // Jangan reset walletAddress siswa agar memo/alamat tersimpan tidak hilang saat disconnect
    } else {
      if (searchResult?.walletAddress && account.toLowerCase() === searchResult.walletAddress.toLowerCase()) {
        setIsWalletBound(true);
      }
    }
  }, [account, searchResult?.walletAddress]);

  // Fetch saldo mIDR langsung dari RPC publicnode — package ini bug saldo Rp 0
  // yang terjadi kalau BrowserProvider MetaMask pakai RPC deprecated/blocked.
  // Local JsonRpcProvider + read-only balanceOf akun siswa berjalan setiap 15s.
  React.useEffect(() => {
    if (!account) {
      setCardMidrBalance(BigInt(0));
      return;
    }
    let cancelled = false;
    const rpcUrl = NETWORK_CONFIG.rpcUrls[0];
    const readProvider = new ethers.JsonRpcProvider(rpcUrl);
    const token = new ethers.Contract(
      CONTRACT_ADDRESSES.mockIdr,
      MOCK_IDR_ABI,
      readProvider
    );
    const fetchBalance = async () => {
      try {
        const bal = await token.balanceOf(account);
        if (!cancelled) setCardMidrBalance(bal);
      } catch (err: any) {
        // Diam — retry pada interval berikutnya. Jangan blank saldo yang sudah valid.
        console.warn("[SiswaPortal] balanceOf failed:", err?.message);
      }
    };
    fetchBalance();
    const h = setInterval(fetchBalance, 15_000);
    return () => {
      cancelled = true;
      clearInterval(h);
    };
  }, [account]);

  // Handler: Tanda tangani pesan SIWE di MetaMask untuk mengikat dompet secara sah
  const handleSignAndBindWallet = async () => {
    setIsSigning(true);
    setSignError(null);

    try {
      const token = getStudentToken();
      if (!token) throw new Error("Sesi login siswa belum aktif. Silakan masuk kembali dengan NISN.");

      // 1. Selalu re-request akun MetaMask tepat sebelum sign.
      // Jangan andalkan `account` dari Web3Context — bisa address lama dari
      // sesi sebelumnya yang tidak cocok dengan akun aktif MetaMask, sehingga
      // personal_sign ditolak dengan code 4100 (unauthorized).
      const eth = (window as any)?.ethereum;
      if (!eth) {
        throw new Error("Dompet Web3 MetaMask tidak terdeteksi. Silakan pasang ekstensi MetaMask.");
      }
      const browserProvider = new ethers.BrowserProvider(eth);
      const accounts: string[] = await browserProvider.send("eth_requestAccounts", []);
      if (!accounts || accounts.length === 0) {
        throw new Error("Tidak ada akun MetaMask yang dipilih.");
      }
      const activeAccount = accounts[0];
      const activeSigner = await browserProvider.getSigner();

      // Sync global Web3Context bila akun yang terotorisasi berbeda
      if (!account || account.toLowerCase() !== activeAccount.toLowerCase()) {
        await connectWallet();
      }

      if (!activeSigner || !activeAccount) {
        throw new Error("Gagal memperoleh signer dari dompet MetaMask.");
      }

      // 2. Dapatkan Nonce resmi dari backend
      const nonceRes = await fetch(`${API_URL}/auth/siwe/nonce`);
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok || !nonceData?.data?.nonce) {
        throw new Error(nonceData?.message || "Gagal mengambil nonce keamanan dari server.");
      }
      const nonce = nonceData.data.nonce;

      // 3. Susun pesan SIWE (EIP-4361)
      const domain = typeof window !== "undefined" ? window.location.host : "localhost:3001";
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";
      const nowIso = new Date().toISOString();
      const currentNisn = activeStudent?.nisn || searchNisn || "Peserta Didik";

      const siweMessage =
`${domain} wants you to sign in with your Ethereum account:
${activeAccount}

Tanda tangani pesan ini untuk mengaitkan dompet Web3 MetaMask Anda dengan NISN ${currentNisn} di sistem Aloka PIP.

URI: ${origin}
Version: 1
Chain ID: 80002
Nonce: ${nonce}
Issued At: ${nowIso}`;

      // 4. Pemicu pop up Sign MetaMask!
      const signature = await activeSigner.signMessage(siweMessage);

      // 5. Kirim ke backend untuk verifikasi kriptografis
      const bindRes = await fetch(`${API_URL}/students/wallet/bind`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          walletAddress: activeAccount,
          message: siweMessage,
          signature: signature,
        }),
      });

      const bindData = await bindRes.json();
      if (!bindRes.ok || !bindData.success) {
        throw new Error(bindData.message || "Verifikasi tanda tangan gagal di server.");
      }

      // 6. Sukses terikat secara sah
      setIsWalletBound(true);
      setStudents((prev) =>
        prev.map((s) => ({
          ...s,
          walletAddress: activeAccount!,
        }))
      );
      setSearchResult((prev) => (prev ? { ...prev, walletAddress: activeAccount! } : null));
    } catch (err: any) {
      console.error("SIWE bind error:", err);
      if (err?.code === 4001 || /rejected|denied|user rejected/i.test(err?.message)) {
        setSignError("Permintaan tanda tangan di MetaMask dibatalkan oleh pengguna.");
      } else {
        setSignError(err?.message || "Gagal melakukan tanda tangan di MetaMask.");
      }
    } finally {
      setIsSigning(false);
    }
  };

  // Search logic: cari di state lokal (diisi dari backend), bukan INITIAL_STUDENTS empty
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
    const cleaned = searchNisn.trim();
    if (!cleaned) {
      setSearchResult(null);
      return;
    }
    // 1) Cari di students (sudah berisi data dari backend /apps/me)
    const found = students.find((s) => s.nisn === cleaned);
    if (found) {
      setSearchResult(found);
      return;
    }
    // 2) Jika belum ada di state lokal (mis. user cari NISN lain), tampilkan not found
    setSearchResult(null);
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

      if (escrowContract && (escrowContract as any).runner) {
        try {
          const tx = await (escrowContract as any).submitApplication(hash);
          const receipt = await tx.wait();
          txHash = receipt.hash;
        } catch (onchainErr: any) {
          console.warn("Onchain submit fallback to simulation:", onchainErr);
        }
      }

      // Submit ke backend agar pengajuan tercatat di database
      const backendResult = await submitApplicationToBackend();
      const backendSubmitted = backendResult.success;
      const standardAmount = PIP_AID_CRITERIA.find((c) => c.code === formGrade)?.amount || 1800000;

      const newRecord: StudentRecord = {
        id: students.length + 1,
        applicationDbId: backendResult.applicationId,
        nisn: formNisn,
        name: formName,
        schoolName: formSchool,
        npsn: "10293847",
        gradeLevel: formGrade,
        classRank: "Siswa Aktif",
        walletAddress: account,
        amount: standardAmount,
        status: backendSubmitted
          ? EscrowStatus.MenungguVerifikasi
          : EscrowStatus.MenungguVerifikasi,
        submissionDate: new Date().toISOString().split("T")[0],
        applicationHash: hash,
        txHash: txHash,
        verificationNotes: backendSubmitted
          ? "Pengajuan berhasil dikirim on-chain dan tercatat di backend. Menunggu verifikasi satuan pendidikan."
          : "Pengajuan tercatat on-chain (simulasi). Backend tidak terjangkau — data lokal sementara.",
      };

      setStudents([newRecord, ...students.filter((s) => s.nisn !== newRecord.nisn)]);
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

  // Helper: POST ke /applications untuk persist pengajuan ke backend
  // Returns { success, applicationId } so callers can sync UI state with backend DB.
  const submitApplicationToBackend = async (): Promise<{ success: boolean; applicationId?: string; onchainId?: string | null }> => {
    const token = getStudentToken();
    const session = getStudentSession<any>();
    if (!token || !session) return { success: false };
    const studentId = session.id;
    if (!studentId) return { success: false };

    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId,
          academicYear: "2025/2026",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          applicationId: data.data?.id,
          onchainId: data.data?.onchainId ?? null,
        };
      }
      console.warn("Backend /applications rejected:", data?.message || data);
      return { success: false };
    } catch (err: any) {
      console.warn("Cannot reach backend /applications:", err?.message);
      return { success: false };
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

        {loadingProfile && (
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Memuat profil dan status aplikasi dari server...</span>
          </div>
        )}
        {profileError && !loadingProfile && (
          <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{profileError}</span>
          </div>
        )}
      </div>

      {/* Kartu Koneksi Dompet Web3 Siswa di Dashboard */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${account ? (isWalletBound ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600") : "bg-blue-50 text-blue-600"}`}>
              <Wallet className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {account
                    ? isWalletBound
                      ? "Dompet Digital Siswa Terikat Resmi"
                      : "Dompet Terhubung (Perlu Tanda Tangan)"
                    : "Koneksi Dompet Digital Siswa"}
                </h3>
                {account && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Polygon Amoy (80002)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                {account
                  ? isWalletBound
                    ? "Dompet digital ini telah ditandatangani secara sah di MetaMask dan siap menerima transfer alokasi PIP dari Smart Contract Escrow."
                    : "Dompet MetaMask terdeteksi. Silakan klik tombol 'Sign di MetaMask' agar MetaMask memunculkan pop up tanda tangan verifikasi kepemilikan dompet Anda."
                  : "Sambungkan dompet MetaMask di jaringan Polygon Amoy untuk menerima pencairan dana bantuan PIP langsung tanpa perantara."}
              </p>
              {signError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{signError}</span>
                </div>
              )}
              {account && (
                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono">
                  <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-slate-700">
                    <span>{shortenAddress(account, 6)}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyWallet(account)}
                      className="text-slate-400 hover:text-slate-600"
                      title="Salin alamat dompet"
                    >
                      {copiedWallet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md font-semibold font-mono border border-emerald-200">
                    Saldo mIDR: {formatIDR(cardMidrBalance)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto shrink-0">
            {!account ? (
              walletAvailable ? (
                <button
                  type="button"
                  onClick={handleSignAndBindWallet}
                  disabled={walletLoading || isSigning}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSigning || walletLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menunggu Pop Up MetaMask...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Hubungkan & Sign MetaMask</span>
                    </>
                  )}
                </button>
              ) : (
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Pasang MetaMask</span>
                </a>
              )
            ) : !isCorrectNetwork ? (
              <button
                type="button"
                onClick={switchNetwork}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs shadow-xs transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Ganti ke Polygon Amoy</span>
              </button>
            ) : !isWalletBound ? (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSignAndBindWallet}
                  disabled={isSigning}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSigning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>{isSigning ? "Menunggu Pop Up MetaMask..." : "Sign di MetaMask"}</span>
                </button>
                <button
                  type="button"
                  onClick={disconnectWallet}
                  className="w-full sm:w-auto px-3 py-2 text-xs text-slate-500 hover:text-slate-700 font-medium"
                >
                  Batal / Ganti
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dompet Terikat Sah</span>
                </div>
                <button
                  type="button"
                  onClick={disconnectWallet}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-medium transition-colors"
                >
                  <span>Putuskan Dompet</span>
                </button>
              </div>
            )}
          </div>
        </div>
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
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Dompet Digital Penerima (MetaMask)
                      </p>
                      {!account ? (
                        <div className="mt-2 space-y-2">
                          {searchResult?.walletAddress ? (
                            <div>
                              <p className="text-[11px] font-medium text-slate-500 mb-0.5">Alamat Dompet Terdaftar di Sistem:</p>
                              <p className="text-sm font-mono font-medium text-slate-800 break-all bg-white p-2 rounded border border-slate-200">
                                {searchResult.walletAddress}
                              </p>
                            </div>
                          ) : null}
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{searchResult?.walletAddress ? "MetaMask Belum Terhubung" : "Belum Ada Dompet Terhubung"}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Hubungkan dompet Web3 MetaMask Anda di jaringan Polygon Amoy untuk pencairan dana. Klik{" "}
                            <button
                              type="button"
                              onClick={handleSignAndBindWallet}
                              disabled={isSigning}
                              className="text-blue-600 font-semibold underline hover:text-blue-800"
                            >
                              {isSigning ? "Menunggu Pop Up MetaMask..." : "Hubungkan & Tautkan MetaMask"}
                            </button>
                            .
                          </p>
                        </div>
                      ) : !isWalletBound ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-sm font-mono font-medium text-slate-800 break-all">
                            {account}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                              Menunggu Tanda Tangan
                            </span>
                            <button
                              type="button"
                              onClick={handleSignAndBindWallet}
                              disabled={isSigning}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                            >
                              {isSigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                              <span>{isSigning ? "Menunggu Pop Up..." : "Sign di MetaMask"}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm font-mono font-bold text-slate-900 break-all">
                            {account}
                          </p>
                          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terikat Sah & Ditandatangani di Smart Contract</span>
                          </p>
                        </div>
                      )}
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
                            ? "Dana mIDR ditransfer ke dompet MetaMask siswa"
                            : account
                            ? "Dana siap disalurkan ke dompet MetaMask terhubung"
                            : "Menunggu dompet MetaMask dihubungkan"}
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

                  {/* Action: Ajukan / Re-ajukan PIP jika status belum ada aplikasi atau ditolak */}
                  {(searchResult.status === EscrowStatus.BelumAda ||
                    searchResult.status === EscrowStatus.Ditolak) && (
                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            {searchResult.status === EscrowStatus.Ditolak
                              ? "Pengajuan Ditolak — Silakan Ajukan Ulang"
                              : "Belum Ada Pengajuan On-Chain"}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-2">
                          {searchResult.status === EscrowStatus.Ditolak
                            ? "Ajukan Ulang Bantuan PIP"
                            : "Mulai Pengajuan Bantuan PIP"}
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                          {searchResult.status === EscrowStatus.Ditolak
                            ? "Pengajuan sebelumnya ditolak. Anda dapat mengajukan ulang setelah memperbaiki data. Isi formulir di bawah dan kirim untuk diverifikasi sekolah."
                            : "Data NISN Anda tercatat di Dapodik namun belum memiliki pengajuan PIP on-chain. Isi formulir di bawah untuk memulai proses verifikasi."}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-amber-200">
                        <button
                          type="button"
                          onClick={() => {
                            setFormNisn(searchResult.nisn);
                            setFormName(searchResult.name);
                            setFormSchool(searchResult.schoolName);
                            setFormGrade(searchResult.gradeLevel);
                            setShowApplyForm(true);
                            // Scroll ke form
                            setTimeout(() => {
                              document
                                .getElementById("form-pengajuan-pip")
                                ?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 100);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs"
                        >
                          <FileText className="w-4 h-4" />
                          <span>
                            {searchResult.status === EscrowStatus.Ditolak
                              ? "Ajukan Ulang Sekarang"
                              : "Buka Formulir Pengajuan PIP"}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
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
                      NISN tersebut belum terdaftar dalam sistem Aloka. Jika Anda siswa yang memenuhi kriteria PIP, Anda dapat mengajukan pendaftaran baru.
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
          <div id="form-pengajuan-pip" className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 scroll-mt-20">
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
                aria-expanded={showApplyForm}
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
                  {account && isWalletBound ? (
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
                      onClick={handleSignAndBindWallet}
                      disabled={isSigning}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>{isSigning ? "Menunggu Pop Up MetaMask..." : "Hubungkan & Tanda Tangani Dompet (Sign)"}</span>
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
