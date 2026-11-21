"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="font-sans antialiased bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <h2 className="text-xl font-bold">Terjadi Kesalahan Fatal</h2>
          <p className="text-xs text-slate-500">
            Sistem mendeteksi kendala pada antarmuka aplikasi.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold"
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
