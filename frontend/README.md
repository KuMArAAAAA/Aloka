# Aloka PIP Frontend – Web3 Education Aid Distribution Platform

Frontend web modern berbasis **Next.js (App Router)** dan **Tailwind CSS** untuk **Aloka**, sistem distribusi bantuan pendidikan terdesentralisasi (**Program Indonesia Pintar / PIP**) berbasis Smart Contract Escrow pada jaringan **Polygon**.

---

## 🚀 Fitur Utama & Modul Sesuai PRD

1. **Beranda & On-Chain Metrics (`/`)**
   - Ringkasan live statistik Escrow Vault (Saldo Terkunci, Total Tersalurkan, Jumlah Siswa, dan Waktu Audit Real-Time).
   - Akses cepat navigasi multi-peran.

2. **Portal Siswa & Tracking Mandiri (`/siswa`)**
   - **Pelacakan NISN:** Cek status bantuan langsung menggunakan 10 digit NISN.
   - **Integrasi Web3 Wallet:** Hubungkan MetaMask / browser wallet untuk mengikat alamat dompet digital penerima.
   - **Formulir Pengajuan Baru:** Siswa/wali dapat mengajukan bantuan langsung ke smart contract on-chain.
   - **3-Tahap Stepper:** Tracking transparan dari Pengajuan -> Verifikasi Sekolah -> Pencairan Escrow.

3. **Dashboard Verifikator Satuan Pendidikan (`/sekolah`)**
   - Otorisasi resmi akun sekolah (`isSchoolValidator`).
   - Review berkas administratif & keaktifan siswa di Dapodik.
   - Penetapan nominal resmi PIP per jenjang (SD Rp450.000, SMP Rp750.000, SMA/SMK Rp1.800.000).
   - Eksekusi `verifyApplication()` atau `rejectApplication()` on-chain.

4. **Admin Vault Kemendikbud (`/pemerintah`)**
   - Manajemen Smart Contract Escrow Vault.
   - Form pendanaan kas negara (`fund()`) dengan token Rupiah Digital (`mIDR`).
   - Faucet / Mint Simulasi APBN (mencetak token mIDR untuk pengujian alur distribusi).
   - Manajemen otorisasi akun verifikator sekolah (`setSchoolValidator()`).
   - Eksekusi penyaluran bantuan (`distributeAid()`) langsung ke dompet siswa.

5. **Buku Besar Audit Publik (`/transparansi`)**
   - Akses terbuka bagi publik, KPK, BPK, dan inspektorat.
   - Rekapitulasi per jenjang pendidikan dan status alokasi.
   - Log audit Non-PII (menjaga privasi siswa dengan masking nama).
   - Link langsung transaksi ke Polygonscan Explorer.
   - Fitur Ekspor Laporan Audit ke format CSV.

---

## 🛠️ Informasi Smart Contract (Polygon)

- **Network:** Polygon
- **Chain ID:** `80002` (`0x13882`)
- **AlokaEscrow Vault:** `0xd938a4d1e8de7bd0eebe7fba0fbff4fc29154601`
- **MockIDR Token (mIDR):** `0xf7CDC1cc0a689585B7E9c25E29319Cd4B73e0Ad2`
- **Owner / Pemerintah:** `0xf4aD431Aa2F60A00676F4CF7ac2f18012a1883f6`
- **Akun Cadangan (address.md):** `0xD3946D8fB18C576270b7E18732E94d1018f07834`

---

## 📦 Menjalankan Frontend

1. Pindah ke direktori frontend:
   ```bash
   cd frontend
   ```

2. Jalankan mode pengembangan (Development):
   ```bash
   npm run dev
   ```
   Aplikasi akan aktif di `http://localhost:3000`.

3. Menjalankan Production Build:
   ```bash
   npm run build
   npm run start
   ```
