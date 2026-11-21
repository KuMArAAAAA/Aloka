import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/context/Web3Context";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WalletToast } from "@/components/WalletToast";
import { SessionGuard } from "@/components/SessionGuard";

export const metadata: Metadata = {
  title: "Aloka – Platform Distribusi Bantuan Pendidikan PIP Berbasis Web3",
  description:
    "Sistem distribusi Program Indonesia Pintar (PIP) transparan, aman, dan akuntabel menggunakan Smart Contract Escrow pada jaringan Polygon.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="flex flex-col min-h-screen font-sans antialiased text-slate-800">
        <Web3Provider>
          <SessionGuard />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <WalletToast />
        </Web3Provider>
      </body>
    </html>
  );
}
