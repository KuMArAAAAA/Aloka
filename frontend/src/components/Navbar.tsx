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

const NAV_LINKS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/siswa", label: "Portal Siswa", icon: GraduationCap },
  { href: "/sekolah", label: "Verifikasi Sekolah", icon: School },
  { href: "/pemerintah", label: "Admin Perbendaharaan", icon: Building2 },
  { href: "/transparansi", label: "Audit & Transparansi", icon: BarChart3 },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [studentSession, setStudentSession] = useState<{ fullName?: string; nisn?: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("aloka_student_session");
    if (raw) {
      try {
        setStudentSession(JSON.parse(raw));
      } catch {
        setStudentSession(null);
      }
    } else {
      setStudentSession(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("aloka_student_session");
    localStorage.removeItem("aloka_token");
    setStudentSession(null);
    window.location.href = "/";
  };

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
            {studentSession ? (
              <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-slate-800 max-w-[120px] truncate">
                  {studentSession.fullName || studentSession.nisn}
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
            {studentSession ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="w-full py-2 px-3 rounded-lg text-sm text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun ({studentSession.fullName || studentSession.nisn})</span>
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
