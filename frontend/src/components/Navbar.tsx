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
  { href: "/transparansi", label: "Audit & Transparansi", icon: BarChart3 },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { disconnectWallet } = useWeb3();
  const [open, setOpen] = useState(false);
  const [studentSession, setStudentSession] = useState<{ fullName?: string; nisn?: string } | null>(null);
  const [officialSession, setOfficialSession] = useState<{ email?: string; school?: { name?: string } | null } | null>(null);

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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
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

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Navigasi Utama">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "text-blue-600 bg-blue-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Icon className={["w-4 h-4", active ? "text-blue-600" : "text-slate-400"].join(" ")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
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
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Portal</span>
              </Link>
            )}

            <ConnectWalletButton />

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle Menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 shadow-md">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <Icon className={["w-4 h-4", active ? "text-blue-600" : "text-slate-400"].join(" ")} />
                <span>{label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-100">
            {(studentSession || officialSession) ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="w-full py-2 px-3 rounded-lg text-sm text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun ({displayName})</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white font-medium text-sm flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Portal Siswa / Sekolah</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
