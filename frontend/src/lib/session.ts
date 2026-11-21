// Centralized sessionStorage helpers.
// sessionStorage auto-clears when tab/browser closes — credentials/wallet
// are never persisted across browsing sessions.

const TOKEN_KEY = "aloka_token";
const STUDENT_SESSION_KEY = "aloka_student_session";
const OFFICIAL_TOKEN_KEY = "aloka_official_token";
const OFFICIAL_SESSION_KEY = "aloka_official_session";
const WALLET_KEY = "aloka_wallet_connected";
const LAST_ACTIVITY_KEY = "aloka_last_activity";

const isBrowser = () => typeof window !== "undefined";

// --- Siswa ---
export const getStudentToken = (): string | null =>
  isBrowser() ? sessionStorage.getItem(TOKEN_KEY) : null;

export const setStudentToken = (t: string) => {
  if (isBrowser()) sessionStorage.setItem(TOKEN_KEY, t);
};

export const getStudentSession = <T = any>(): T | null => {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(STUDENT_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const setStudentSession = (s: any) => {
  if (isBrowser()) sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(s));
};

// --- Official (sekolah) ---
export const getOfficialToken = (): string | null =>
  isBrowser() ? sessionStorage.getItem(OFFICIAL_TOKEN_KEY) : null;

export const setOfficialToken = (t: string) => {
  if (isBrowser()) sessionStorage.setItem(OFFICIAL_TOKEN_KEY, t);
};

export const getOfficialSession = <T = any>(): T | null => {
  if (!isBrowser()) return null;
  const raw = sessionStorage.getItem(OFFICIAL_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const setOfficialSession = (s: any) => {
  if (isBrowser()) sessionStorage.setItem(OFFICIAL_SESSION_KEY, JSON.stringify(s));
};

// --- Wallet flag ---
export const getWalletFlag = (): string | null =>
  isBrowser() ? sessionStorage.getItem(WALLET_KEY) : null;

export const setWalletFlag = () => {
  if (isBrowser()) sessionStorage.setItem(WALLET_KEY, "1");
};

export const clearWalletFlag = () => {
  if (isBrowser()) sessionStorage.removeItem(WALLET_KEY);
};

// --- JWT helpers ---
export const decodeJwtExp = (token: string | null): number | null => {
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(json);
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
};

// Expired = true if no exp info OR exp within buffer.
export const isTokenExpired = (token: string | null, bufferSec = 30): boolean => {
  const exp = decodeJwtExp(token);
  if (!exp) return true;
  return Date.now() / 1000 + bufferSec >= exp;
};

export const hasActiveStudentSession = (): boolean => {
  const t = getStudentToken();
  return !!t && !isTokenExpired(t);
};

export const hasActiveOfficialSession = (): boolean => {
  const t = getOfficialToken();
  return !!t && !isTokenExpired(t);
};

// --- Idle activity stamp ---
export const touchActivity = () => {
  if (isBrowser()) sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
};

export const getLastActivity = (): number | null => {
  if (!isBrowser()) return null;
  const v = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  return v ? Number(v) : null;
};

// --- Clear all (logout) ---
export const clearAllSessions = () => {
  if (!isBrowser()) return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(STUDENT_SESSION_KEY);
  sessionStorage.removeItem(OFFICIAL_TOKEN_KEY);
  sessionStorage.removeItem(OFFICIAL_SESSION_KEY);
  sessionStorage.removeItem(WALLET_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
};

// Clear only student side (when switching to official)
export const clearStudentSessions = () => {
  if (!isBrowser()) return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(STUDENT_SESSION_KEY);
};

// Clear only official side (when switching to student)
export const clearOfficialSessions = () => {
  if (!isBrowser()) return;
  sessionStorage.removeItem(OFFICIAL_TOKEN_KEY);
  sessionStorage.removeItem(OFFICIAL_SESSION_KEY);
};