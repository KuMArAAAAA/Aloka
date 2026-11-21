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

const IDLE_MS = 15 * 60 * 1000; // 15 menit (sama dengan TTL access token backend)
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

  // Periodic idle + expiry enforcement
  useEffect(() => {
    const enforceLogout = (reason: "idle" | "expired") => {
      clearAllSessions();
      try {
        disconnectWallet();
      } catch {}
      router.replace(`/login?reason=${reason}`);
    };

    const check = () => {
      const isProtected = PROTECTED_PATHS.includes(pathname);
      if (!isProtected) return;

      const studentAlive = hasActiveStudentSession();
      const officialAlive = hasActiveOfficialSession();

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