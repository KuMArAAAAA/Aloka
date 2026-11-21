"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "./ConnectWalletButton";
import {
  ShieldCheck,
  Home,
  GraduationCap,
  School,
  Building2,
  BarChart3,
  Menu,
  X,
  LogIn,
  User,
  LogOut,
} from "lucide-react";
import { useWeb3 } from "@/context/Web3Context";
import {
  getStudentSession,
  getOfficialSession,
  clearAllSessions,
  hasActiveStudentSession,
  hasActiveOfficialSession,
} from "@/lib/session";

const NAV_LINKS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/siswa", label: "Portal Siswa", icon: GraduationCap },
  { href: "/sekolah", label: "Verifikasi Sekolah", icon: School },
  { href: "/pemerintah", label: "Alokasi KPA", icon: Building2 },
  { href: "/transparansi", label: "Audit & Transparansi", icon: BarChart3 },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { disconnectWallet } = useWeb3();
  const [open, setOpen] = useState(false);
  const [studentSession, setStudentSession] = useState<{ fullName?: string; nisn?: string } | null>(null);
  const [officialSession, setOfficialSession] = useState<{ email?: string; school?: { name?: string } | null } | null>(null);

  const isLoginPage = pathname.startsWith("/login");

  useEffect(() => {
    const s = getStudentSession<{ fullName?: string; nisn?: string }>();
    setStudentSession(s && hasActiveStudentSession() ? s : null);
    const o = getOfficialSession<{ email?: string; school?: { name?: string } | null }>();
    setOfficialSession(o && hasActiveOfficialSession() ? o : null);
  }, [pathname]);

  const handleLogout = () => {
    clearAllSessions();
    try {
      disconnectWallet();
    } catch {}
    setStudentSession(null);
    setOfficialSession(null);
    window.location.href = "/login?reason=logout";
  };

  const displayName = studentSession?.fullName
    || studentSession?.nisn
    || (officialSession?.school?.name as string | undefined)
    || officialSession?.email;

  // Filter navigasi berdasarkan hak akses peran:
  // - Di halaman login atau saat belum login: HILANGKAN menu "Portal Siswa", "Verifikasi Sekolah", & "Alokasi KPA"
  // - Jika login sebagai Siswa: HILANGKAN menu "Verifikasi Sekolah" & "Alokasi KPA"
  // - Jika login sebagai Sekolah: HILANGKAN menu "Portal Siswa" & "Alokasi KPA"
  // - Jika login sebagai KPA Pemerintah: HILANGKAN menu "Portal Siswa" & "Verifikasi Sekolah"
  const accessibleLinks = NAV_LINKS.filter(({ href }) => {
    const isGov = (officialSession as any)?.role === "GOVERNMENT";
    const isSchool = !!officialSession && !isGov;

    if (isLoginPage || (!studentSession && !officialSession)) {
      if (href === "/siswa" || href === "/sekolah" || href === "/pemerintah") return false;
    }
    if (studentSession && (href === "/sekolah" || href === "/pemerintah")) return false;
    if (isSchool && (href === "/siswa" || href === "/pemerintah")) return false;
    if (isGov && (href === "/siswa" || href === "/sekolah")) return false;
    return true;
  });

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo (Kiri) */}
          <div className="flex items-center shrink-0 z-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  Aloka
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  PIP Escrow
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation (Persis di Tengah / Center Absolut) */}
          <nav
            className="hidden md:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2 z-0"
            aria-label="Navigasi Utama"
          >
            {accessibleLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "text-blue-600 bg-blue-50 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Icon className={["w-4 h-4", active ? "text-blue-600" : "text-slate-400"].join(" ")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions (Kanan) */}
          <div className="flex items-center gap-3 z-10">
            {(studentSession || officialSession) ? (
              <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-slate-800 max-w-[120px] truncate">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Keluar"
                  className="text-slate-400 hover:text-rose-600 p-0.5 ml-1 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : !isLoginPage ? (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Portal</span>
              </Link>
            ) : null}

            {/* Hilangkan tombol Hubungkan Wallet saat berada di halaman login */}
            {!isLoginPage && <ConnectWalletButton />}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle Menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-md">
          {accessibleLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-600 font-semibold"
                    : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                <Icon className={["w-4 h-4", active ? "text-blue-600" : "text-slate-400"].join(" ")} />
                <span>{label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            {(studentSession || officialSession) ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-medium truncate max-w-[180px]">{displayName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs text-rose-600 font-medium px-2 py-1 rounded bg-rose-50 hover:bg-rose-100"
                >
                  Keluar
                </button>
              </div>
            ) : !isLoginPage ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full text-center py-2 text-sm font-medium text-white bg-blue-600 rounded-lg flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Portal</span>
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
};
