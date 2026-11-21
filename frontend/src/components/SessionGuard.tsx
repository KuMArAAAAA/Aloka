"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWeb3 } from "@/context/Web3Context";
import {
  touchActivity,
  getLastActivity,
  hasActiveStudentSession,
  hasActiveOfficialSession,
  clearAllSessions,
} from "@/lib/session";

const IDLE_MS = 15 * 60 * 1000; // 15 menit
const CHECK_MS = 30 * 1000; // cek tiap 30 detik
const PROTECTED_PATHS = ["/siswa", "/sekolah"];

export const SessionGuard: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { disconnectWallet } = useWeb3();

  // Track user activity (mouse/keyboard/touch/scroll)
  useEffect(() => {
    const events = ["mousedown", "keydown", "touchstart", "scroll", "click"];
    const handler = () => touchActivity();
    events.forEach((e) =>
      window.addEventListener(e, handler, { passive: true })
    );
    touchActivity();
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, []);

  // Periodic idle + expiry enforcement + role-based route guard
  useEffect(() => {
    const enforceLogout = (reason: "idle" | "expired") => {
      clearAllSessions();
      try {
        disconnectWallet();
      } catch {}
      router.replace(`/login?reason=${reason}`);
    };

    const check = () => {
      const studentAlive = hasActiveStudentSession();
      const officialAlive = hasActiveOfficialSession();

      // PROTEKSI KHUSUS: Siswa DILARANG mengakses halaman verifikasi sekolah
      if (pathname.startsWith("/sekolah")) {
        if (studentAlive) {
          // Jika siswa mencoba membuka /sekolah, langsung kembalikan ke portal siswa
          router.replace("/siswa");
          return;
        }
        if (!officialAlive) {
          router.replace("/login");
          return;
        }
      }

      // Halaman siswa hanya untuk yang memiliki sesi siswa (atau publik)
      if (pathname.startsWith("/siswa")) {
        if (!studentAlive && officialAlive) {
          router.replace("/sekolah");
          return;
        }
      }

      const isProtected = PROTECTED_PATHS.includes(pathname);
      if (!isProtected) return;

      // No active session at all on protected page → force login
      if (!studentAlive && !officialAlive) {
        enforceLogout("expired");
        return;
      }

      // Idle timeout
      const last = getLastActivity();
      if (last && Date.now() - last > IDLE_MS) {
        enforceLogout("idle");
        return;
      }
    };

    check();
    const h = setInterval(check, CHECK_MS);
    return () => clearInterval(h);
  }, [pathname, router, disconnectWallet]);

  return null;
};
