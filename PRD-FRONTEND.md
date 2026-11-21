# PRD Frontend - Aloka Platform

## 1. Informasi Dokumen

| Properti | Detail |
| :--- | :--- |
| **Nama Produk** | Aloka |
| **Tipe Dokumen** | Product Requirements Document (Frontend) |
| **Versi** | v0.1.0 (Draft, mode antislop `during`) |
| **Status** | Draft untuk persetujuan |
| **Bahasa UI** | Bahasa Indonesia |
| **Acuan API** | `API-CONTRACT.md` (backend Express/Prisma) |
| **Acuan Visual** | Seragam Design System (belajar.id), INA Digital Design System, OpenSpending Viewer, Follow the Money Search (NYC CFB) |

---

## 2. Ringkasan Eksekutif

Frontend Aloka menghadirkan **portal transparansi publik** berbahasa Indonesia untuk distribusi bantuan Program Indonesia Pintar (PIP) berbasis Smart Contract Escrow Polygon. Dokumen ini mendefinisikan visi penuh antarmuka untuk empat role (Publik, Siswa, Sekolah, Pemerintah), dengan **tahap pertama (Phase 1) fokus pada Portal Publik read-only** yang dapat diaudit siapa saja tanpa login.

Identitas visual mengikuti kosakata desain layanan publik Indonesia (navy institusional, emerald status positif, Plus Jakarta Sans sebagai font karya studio Indonesia) dengan filter antislop aktif: setiap keputusan visual memiliki alasan tertulis.

---

## 3. Tujuan & Metrik

### 3.1 Tujuan Produk Frontend
- Menyediakan **public ledger explorer** yang dapat dipahami wali murid, jurnalis, dan audiens non-kripto.
- Menghilangkan kebutuhan registrasi untuk audit publik (data non-PII ditampilkan langsung).
- Membangun kepercayaan melalui **provenance** yang terlihat: setiap angka tertaut ke transaksi Polygonscan.

### 3.2 KPI Frontend (diukur saat Phase 1 di-deploy)

| Metrik | Target | Sumber Acuan |
| :--- | :--- | :--- |
| First Contentful Paint (FCP) | < 1.5 detik (p75) | PRD.md bagian 8.2 |
| Largest Contentful Paint (LCP) | < 2.5 detik (p75) | antislop R-40 (Core Web Vitals) |
| Cumulative Layout Shift (CLS) | < 0.1 | antislop R-40 |
| Kontras teks | WCAG AA (4.5:1 normal, 3:1 large) | antislop R-25 |
| Keyboard navigable | 100% elemen interaktif | antislop R-32 |
| Error/Empty/Loading state | 100% tampilan data | antislop R-27 |

Angka target mengikuti PRD.md bagian 8.2 dan standar antislop R-40. Tidak ada klaim performa yang dilaporkan tanpa pengukuran nyata (antislop R-36).

---

## 4. Persona & Perjalanan Pengguna

### 4.1 Persona Fase 1 (Portal Publik, read-only)

| Persona | Tujuan utama di Portal Publik | Tindakan yang dilakukan |
| :--- | :--- | :--- |
| **Wali Murid Penerima PIP** | Memastikan anaknya masuk daftar penerima | Cek nama sekolah di `/sekolah`, lacak txHash kartu siswa di `/transparansi` |
| **Jurnalis Investigasi** | Mencari anomali distribusi | Telusuri ledger paginated, cari txHash spesifik, bandingkan angka per jenjang |
| **Auditor Inspektorat** | Verifikasi independen | Buka kontrak di Polygonscan dari halaman utama, ekspor ledger |
| **Masyarakat Umum** | Memahami ke mana dana PIP pergi | Baca statistik di halaman utama, klik tx lihat bukti on-chain |

### 4.2 Persona Fase Berikutnya (outline, tidak dibangun sekarang)

- **Siswa Penerima**: login NISN + Tanggal Lahir, hubungkan wallet, klaim bantuan.
- **Operator Sekolah**: login email, antrean verifikasi siswa, tanda tangan on-chain (verifyApplication).
- **Admin Pemerintah**: login email, dashboard alokasi, batch submit on-chain, distribute.

Detail fase 2 sampai 4 akan dirinci di PRD lanjutan setelah fase 1 disetujui.

---

## 5. Stack Teknologi

| Komponen | Pilihan | Alasan tertulis (antislop R-31) |
| :--- | :--- | :--- |
| Framework | Next.js 14 (App Router) | SSR untuk SEO halaman publik, App Router untuk co-locating route dengan komponen |
| Styling | Tailwind CSS 3 | Utility-first, mendukung token desain via `tailwind.config.ts` |
| Komponen UI | shadcn/ui (Radix-based) | Accessible by default (Radix), copy-into-repo, tidak dipakai apa adanya agar tidak jadi tampilan default shadcn (antislop R-30) |
| Fetching | TanStack Query v5 | Cache, refetch interval, loading/error state built-in untuk ledger publik |
| Web3 Client | Wagmi + Viem | Hook React idiomatik, Viem lebih ringan dari ethers untuk client-side |
| Font | Plus Jakarta Sans (display + body), JetBrains Mono (hanya hash) | Plus Jakarta Sans dirilis Tokotype (studio Jakarta), relevansi identitas Indonesia, bukan default AI |
| Ikon | Lucide, sub-set kurasi | Hanya ikon yang relevan secara semantik, dosis rendah (antislop R-04) |
| Format | Prettier + ESLint | Konsistensi tanpa perdebatan gaya di PR review |

Tokoh acuan visual yang TIDAK ditiru apa adanya (antislop R-30): tidak meng-klon Linear, Vercel, atau Notion. Identitas sendiri, dengan kosakata layanan publik Indonesia sebagai bahasa visual.

---

## 6. Sistem Desain

### 6.1 Identitas Visual & Acuan

Acuan resmi yang dipakai sebagai **kosakata**, bukan template:

1. **Seragam Design System (belajar.id / GovTech Edu)** - prinsip desain, ilustrasi, dan tata tulis untuk konteks pendidikan.
2. **INA Digital Design System (design.inadigital.go.id)** - token warna, sentiment color, brand mode per-lembaga. Kompatibel dengan identitas pemerintah Indonesia.
3. **OpenSpending Viewer (openspending.org)** - pola viewer data fiskal: treemap, bar, paginated table, filter kategori.
4. **Follow the Money Search (NYC CFB)** - UX transparansi search-first: label entitas, progressive disclosure, totals di atas tabel, tabular figures.

Pemilihan acuan tertulis semuanya (antislop R-37): portal ini terhubung dengan dunia layanan publik Indonesia, jadi kosakata visualnya diambil dari sana, bukan dari portofolio agensi Awwwards.

### 6.2 Dial Antislop (Liveliness Toolkit Part 3)

| Dial | Nilai | Alasan tertulis |
| :--- | :--- | :--- |
| **ENERGY** | 1 (Calm) | Layanan publik pemerintah, harus terasa tenang dan terpercaya (acuan: GOV.UK, Linear) |
| **RHYTHM** | 2 (Balanced) | Komposisi konsisten dengan beberapa pemutus antar seksi agar tidak monoton (acuan: Stripe, Vercel) |
| **MOTION** | 1 (Calm) | Cukup hover state dan transisi cepat; tidak ada scroll-reveal berlebih (acuan: GOV.UK) |

Dial dideklarasikan eksplisit per antislop R-37 dan R-19. Motion yang dipakai harus konsisten dengan MOTION=1: jika ada bagian yang scroll-reveal, dial harus dinaikkan, atau motion itu dibuang.

### 6.3 Palet Warna

Mengikuti prinsip INA Digital: brand color (identitas), sentiment color (status), neutral color (struktur). Maksimal 2-3 core + 1 aksen (antislop R-29).

| Token | Hex | Fungsi | Alasan tertulis |
| :--- | :--- | :--- | :--- |
| `brand-navy` | `#1e3a5f` | Header, judul utama, tombol primer | Warna institusional pemerintah Indonesia; sejajar dengan LAN Navy INA Digital |
| `brand-emerald` | `#059669` | Angka dana tersalurkan, link aktif, status sukses | Sentiment positive (INA Digital: hijau = positif) |
| `sentiment-red` | `#dc2626` | Status ditolak | Sentiment negative |
| `sentiment-amber` | `#d97706` | Status menunggu | Sentiment warning |
| `surface` | `#f8f7f4` | Latar halaman | Off-white hangat, BUKAN putih steril (menghindari sterile default antislop) |
| `card` | `#ffffff` | Latar kartu/tabel | Kontras dengan surface |
| `ink` | `#1a1a1a` | Teks utama | Rasio kontras ke surface sekitar 15:1, lolos WCAG AA |
| `ink-muted` | `#4b5563` | Teks sekunder | Rasio sekitar 7:1 ke surface, BUKAN abu-abu terlalu terang (antislop R-25) |

Larangan tegas yang diwarisi dari antislop:
- Tidak ada gradient dekoratif, glow, mesh, atau blob (R-01, R-13).
- Tidak ada gradient pada tipografi (rekomendasi INA Digital).
- Tidak ada background grid / blueprint (R-07).
- Dark mode tidak dipakai sebagai default tanpa alasan (R-21): portal publik layanan publik Indonesia = light mode default. Toggle dark/light tidak dijadwalkan di Phase 1.

### 6.4 Tipografi

| Peran | Font | Bobot | Alasan |
| :--- | :--- | :--- | :--- |
| Display & body | Plus Jakarta Sans | 400/500/700 | Studio Indonesia, mendukung diakritik bahasa Indonesia, geometris-humanis (cocok ENERGY 1) |
| Numeric tabular (uang, hash) | JetBrains Mono | 400/500 | `font-variant-numeric: tabular-nums`, kolom angka uang lurus (pola Follow the Money) |
| Heading scoping | Plus Jakarta Sans 700, bukan uppercase tracking | - | Hindari uppercase tracking yang slop (R-06) |

Tidak ada font monospace besar untuk estetika terminal (R-06). JetBrains Mono hanya pada txHash dan nominal uang di tabel.

### 6.5 Ikonografi

- Sub-set kurasi Lucide yang relevan secara semantik: `Search` untuk pencarian, `ExternalLink` untuk link Polygonscan, `ArrowUpDown` untuk sort tabel, `CheckCircle2` untuk status verified, `Clock` untuk pending.
- Tidak ada ikon dekoratif generik (Sparkle, Magic, Lightning) - antislop R-04.
- Dosis: maksimal 1 ikon per kartu statistik, 1 ikon per header seksi.

### 6.6 Komponen Inti (dibangun di atas shadcn/ui, di-styling sendiri)

| Komponen | Modifikasi dari default shadcn | Alasan |
| :--- | :--- | :--- |
| `Button` | Hapus variants outline + ghost yang redundan; primary = navy, secondary = emerald outline | Kurangi pilihan tanpa tujuan (R-26) |
| `Card` | Radius 8px (bukan 16px default shadcn), tanpa shadow besar | RHYTHM 2 butuh hierarki lewat garis tipis bukan bayangan (R-12) |
| `Table` | Header sticky, baris zebra tiap 5 (bukan tiap 1), tabular nums untuk kolom angka | Pola OpenSpending/Follow the Money untuk kepadatan data |
| `Badge` | Status pakai dot kecil + label teks, bukan capsule glow | R-09 prohibitions |
| `Skeleton` | Block bukan shimmer animasi | MOTION 1; hindari template animation |
| `Pagination` | Previous/Next + nomer halaman aktif; tanpa tombol ellipsis berlebih | Sederhana, sesuai kebutuhan ledger |

### 6.7 Pola State (antislop R-27 wajib)

Setiap UI yang menampilkan data harus punya 3 state:

| State | Tampilan | Salinan (Bahasa Indonesia) |
| :--- | :--- | :--- |
| **Loading** | Skeleton block sesuai struktur asli | (tidak perlu teks) |
| **Error** | Card error + tombol Coba lagi | Gagal memuat data. Silakan coba lagi. |
| **Empty** | Ilustrasi kosong sederhana + teks konkret | Belum ada transaksi tercatat di buku besar. |

Pesan kontekstual, bukan generik (antislop R-15, R-16). Hindari "Terjadi kesalahan" tanpa konteks.

---

## 7. Arsitektur Informasi

### 7.1 Sitemap Phase 1

```
Aloka Portal Publik
+-- / (Beranda)
|   +-- Hero + Ringkasan Statistik
|   +-- Distribusi per Jenjang
|   +-- Aktivitas Terkini (5 baris)
|   +-- Info Kontrak + Link Polygonscan
|   +-- Footer
+-- /transparansi (Buku Besar On-Chain)
|   +-- Pencarian txHash
|   +-- Tabel Ledger (paginated)
|   +-- Kartu Detail Hasil Pencarian
+-- /sekolah (Daftar Sekolah Validator)
|   +-- Filter nama (client-side)
|   +-- Tabel Sekolah
+-- /transaksi/[txHash] (Detail Transaksi)
    +-- Status on-chain
    +-- Tiga Tahap Transaksi (submit/verify/distribute)
    +-- Link Polygonscan per tahap
```

Halaman `/transaksi/[txHash]` adalah Progressive Disclosure (pola Follow the Money): dari tabel ledger, klik txHash ke halaman detail dengan semua tahap transaksi.

### 7.2 Navigasi Header

```
[Beranda]  [Transparansi]  [Sekolah]                    [Login Siswa]
```

- 3 link internal mendarat di seksi yang ada (R-24: tidak ada navbar ke halaman tak terdefinisi).
- Tombol Login Siswa di kanan, menuju halaman login Fase 2 (saat ini tampilkan label "Login Siswa" dengan `aria-disabled` + tooltip "Segera hadir" - R-26: tombol mati hanya boleh jika berlabel jelas).

Tidak ada Trusted By logo bar (R-05). Tidak ada How It Works 3 langkah (R-05). Tidak ada FAQ generik (R-28): FAQ hanya jika ada pertanyaan nyata terdokumentasi.

---

## 8. Spesifikasi Halaman - Phase 1 (Portal Publik)

### 8.1 Halaman Beranda (`/`)

**Sumber data**: `GET /api/v1/public/stats` + `GET /api/v1/blockchain/escrow/stats` (lihat API-CONTRACT.md bagian 1.1 dan 5.1).

**Komposisi (atas ke bawah)**:

1. **Header global** - navigasi 3 link + tombol Login Siswa (disabled dengan label "Segera hadir").
2. **Hero** - Judul H1: "Bantuan Terlacak, Dana Tepat Sasaran". Subjudul 1-2 kalimat: "Platform transparansi Program Indonesia Pintar (PIP). Lacak setiap alokasi dana bantuan secara terbuka, permanen, dan dapat diverifikasi langsung di jaringan blockchain." 1 CTA spesifik: "Lihat Buku Besar" (link ke `/transparansi`) - bukan "Learn More" (R-15).
3. **Ringkasan Statistik** - Grid 2x2 desktop, stack 1 kolom mobile. Empat kartu:
   - Total Pengajuan (`summary.totalApplications`)
   - Dana Tersalurkan (`summary.totalFundDistributedIDR`, format Rupiah, font tabular)
   - Sudah Diverifikasi (`summary.totalVerified`)
   - Menunggu Proses (`summary.totalPending`)
4. **Saldo Escrow On-Chain** - Bar tipis horizontal dari `blockchain/escrow/stats`: totalFunded, totalDistributed, vaultBalance. Format Rupiah. Link ke kontrak Polygonscan.
5. **Distribusi per Jenjang** - Bar horizontal sederhana (SD/SMP/SMA/SMK) dari `byGradeLevel`. Tidak pakai treemap (data hanya 4 kategori - treemap overkill).
6. **Aktivitas Terkini** - 5 baris `recentActivity`: kolom Aksi, TX Hash (truncated, font mono, link), Aktor (role), Waktu (relatif: "2 jam lalu"). Tidak lebih dari 5 baris (R-05: bukan list panjang generik).
7. **Info Kontrak Pintar** - Card kecil: `contractAddress` (mono, dengan tombol Salin), `network`, tombol "Buka di Polygonscan".
8. **Footer** - Copyright, tautan GitHub repo, satu kalimat misi. Bukan footer 4 kolom template (R-05).

**State per seksi**:
- Statistik loading menjadi skeleton 4 kartu.
- Statistik error menjadi 1 kartu error menggantikan grid, dengan tombol "Coba lagi".
- Aktivitas empty menjadi "Belum ada aktivitas tercatat."
- Tidak ada pembuat testimoni atau logo perusahaan mitra (R-18, R-05).

### 8.2 Halaman Transparansi (`/transparansi`) - Buku Besar

**Sumber data**: `GET /api/v1/public/ledger?page=1&limit=10` (lihat API-CONTRACT.md bagian 1.2).

**Komposisi**:

1. **Judul H1** - "Buku Besar Transaksi On-Chain". Subjudul: 1 kalimat menjelaskan sumber data (smart contract escrow Polygon Amoy).
2. **Bar Pencarian txHash** - Input + tombol "Cari" (bukan "Search" generik). Validasi format: `^0x[a-fA-F0-9]{64}$` (64 hex + 0x prefix = 66 karakter total). Hasil pencarian menavigasi ke `/transaksi/[txHash]`.
3. **Ringkasan Filter Aktif** - Chip kecil menampilkan scope saat ini (mis. "Semua transaksi", "Halaman 1 dari 5"). Pola Follow the Money.
4. **Tabel Ledger** - Kolom:
   - No (urut halaman, bukan global ID)
   - Aksi (action label dalam Bahasa Indonesia: "Diajukan ke On-Chain", "Diverifikasi", "Dana Disalurkan")
   - Aktor (role: Pemerintah/Sekolah/Siswa)
   - TX Hash (mono, truncated `0x1234...abcd`, link ke `/transaksi/[txHash]`)
   - Waktu (ISO absolute + tooltip relatif)
5. **Pagination** - Previous / nomer halaman aktif / Next. Tidak ada jump-to-page input (lebih dari 50 halaman tidak realistis di MVP).
6. **Definisi Inline** - Tooltip kecil pada kolom Aksi yang menjelaskan istilah teknis (pola Follow the Money: trust bergantung pada definisi).

**State**:
- Loading tabel menjadi skeleton 10 baris.
- Empty ledger menjadi ilustrasi buku besar kosong + "Belum ada transaksi tercatat di buku besar."
- Pencarian tidak ditemukan menavigasi ke `/transaksi/[txHash]` menampilkan 404 kontekstual.

### 8.3 Halaman Detail Transaksi (`/transaksi/[txHash]`)

**Sumber data**: `GET /api/v1/public/applications/:txHash` (API-CONTRACT.md bagian 1.3).

**Komposisi**:

1. **Back link** - "Kembali ke Buku Besar".
2. **Header Detail** - txHash penuh (mono, tombol salin), status on-chain (badge), timestamp.
3. **Timeline Tiga Tahap** - Stepper vertikal (submit lalu verify lalu distribute). Setiap tahap menampilkan:
   - Label tahap
   - txHash tahap (jika ada, link Polygonscan; jika null, tampilkan "Belum dieksekusi")
   - Timestamp (jika ada)
4. **Kartu Metadata** - `academicYear`, `amount` (Rupiah), `gradeLevel`, `school.name` + `school.npsn`.
5. **CTA Verifikasi Independen** - Tombol "Buka di Polygonscan" (link external, `target="_blank"`, `rel="noopener noreferrer"`).

**State**:
- 404 (`TX_NOT_FOUND`) menjadi "Transaksi dengan hash tersebut tidak ditemukan di buku besar Aloka." + saran cek format.
- Loading menjadi skeleton timeline.
- Tahap belum lengkap menjadi tampilkan "Belum dieksekusi", bukan hide tahap (R-27: visibility tahap eksplisit).

### 8.4 Halaman Daftar Sekolah (`/sekolah`)

**Sumber data**: `GET /api/v1/public/schools` (API-CONTRACT.md bagian 1.4).

**Komposisi**:

1. **Judul H1** - "Daftar Satuan Pendidikan Validator".
2. **Input Filter Client-side** - Filter lokal berdasarkan nama sekolah (debounce 200ms). Hanya client filter, data sudah lengkap dari API.
3. **Tabel Sekolah** - Kolom:
   - No
   - NPSN (mono)
   - Nama Sekolah
   - Alamat
   - Jumlah Siswa Terdaftar (`_count.students`, kanan-rata, tabular nums)
4. **Ringkasan Hasil** - "Menampilkan X dari Y sekolah."

**State**:
- Loading menjadi skeleton 5 baris.
- Empty menjadi "Belum ada satuan pendidikan terdaftar."
- Filter no-match menjadi "Tidak ada sekolah dengan nama [query]."

---

## 9. Pemetaan API per Halaman

| Halaman/Rute | Endpoint API-CONTRACT.md | Trigger |
| :--- | :--- | :--- |
| `/` | `GET /public/stats` | Saat mount |
| `/` | `GET /blockchain/escrow/stats` | Saat mount, parallel dengan stats |
| `/transparansi` | `GET /public/ledger?page&limit` | Saat mount + ganti halaman |
| `/transaksi/[txHash]` | `GET /public/applications/:txHash` | Saat mount + perubahan txHash |
| `/sekolah` | `GET /public/schools` | Saat mount |

Frontend tidak memanggil endpoint privat (`/auth/*`, `/applications/*`, `/schools/*` privat, `/blockchain/*` privat) di Phase 1. Token JWT tidak dibutuhkan.

Catatan konfigurasi backend:
- `CORS_ORIGIN` perlu di-set ke URL frontend dev (mis. `http://localhost:3001`) di `backend/.env`.

Frontend env:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_ESCROW_ADDRESS=0xd938a4d1e8de7bd0eebe7fba0fbff4fc29154601
NEXT_PUBLIC_POLYGONSCAN_URL=https://amoy.polygonscan.com
NEXT_PUBLIC_NETWORK_NAME=Polygon Amoy Testnet
```

---

## 10. Integrasi Web3 Wallet (Outline Fase 2)

Di Phase 2, portal siswa menambahkan:

1. Deteksi provider MetaMask via Wagmi `useEIP1193InjectedProvider`.
2. SIWE flow: `GET /auth/siwe/nonce?address=0x...` ke sign message EIP-4361 ke verify (endpoint verify belum terdefinisi di API-CONTRACT.md, perlu ditambah).
3. Binding wallet terverifikasi ke record siswa di DB.

Detail di Phase 2 PRD lanjutan. Phase 1 tidak menyentuh wallet.

---

## 11. Non-Functional Requirements

### 11.1 Performansi
- Hero image (bila ada) pakai `<img>` dengan `fetchpriority="high"` tanpa `loading="lazy"` (antislop R-40). Bila hero hanya teks, aturan tidak berlaku.
- Semua `<img>` punya `width` + `height` atau `aspect-ratio` (R-40).
- Tidak ada script render-blocking pihak ketiga di `<head>` (R-40).
- Refetch interval React Query untuk `public/ledger`: 60 detik (audit data sering di-update).
- Refetch interval `public/stats`: 30 detik.

### 11.2 Aksesibilitas
- `<html lang="id">` (antislop R-39).
- Landmark `<header>`, `<nav>`, `<main>`, `<footer>` (R-39).
- Satu `<h1>` per halaman, hierarki tidak melompat (R-39).
- Fokus indicator terlihat jelas; tidak ada `outline: none` tanpa pengganti (R-32).
- Semua tombol punya `cursor: pointer`; disabled punya `cursor: not-allowed` (R-39).
- `prefers-reduced-motion: reduce` menjadi transisi dimatikan (R-39, MOTION 1).
- Tap target minimum 44px (R-03).

### 11.3 SEO
- Metadata per halaman via Next.js `generateMetadata`.
- OpenGraph image statis (1 gambar resmi, bukan AI-generated).
- `robots.txt` mengizinkan crawl semua halaman publik.

### 11.4 Keamanan Klien
- Tidak menyimpan token di `localStorage` (Phase 2: httpOnly cookie refresh).
- Sanitasi input txHash sebelum dikirim ke API.
- Validasi format ketat di form (Zod) sebelum enable tombol submit.

### 11.5 Resiliensi
- Backend mati menjadi semua halaman menampilkan error state kontekstual, BUKAN crash putih.
- Polygonscan down menjadi link tetap ditampilkan (URL tetap valid), tidak ada dependensi render.

---

## 12. Definition of Done - Phase 1

- [ ] `npm run build` lolos tanpa error atau warning ESLint.
- [ ] Halaman `/`, `/transparansi`, `/sekolah` menampilkan data real dari backend di `localhost:3000`.
- [ ] `/transaksi/[txHash]` menampilkan detail tiga tahap dari `public/applications/:txHash`.
- [ ] Setiap tampilan data memiliki 3 state: loading (skeleton), error (retry), empty (pesan kontekstual).
- [ ] Responsif: tidak ada horizontal overflow di 375px, 768px, 1280px.
- [ ] Kontras teks lolos WCAG AA (4.5:1 normal, 3:1 large).
- [ ] Semua elemen interaktif dapat diakses dengan Tab/Enter/Escape; fokus indicator terlihat.
- [ ] Tidak ada link mati tanpa label "Segera hadir" (R-24, R-26).
- [ ] Tidak ada statistik/testimoni fiktif (R-17, R-18, R-36).
- [ ] Delivery Gate antislop dijalankan sebelum submit (laporan PASS/FAIL per item).
- [ ] Skor Lighthouse diukur dan dilaporkan dengan angka real, bukan klaim (R-40).

---

## 13. Roadmap Frontend

| Fase | Cakupan | Status |
| :--- | :--- | :--- |
| **Phase 1** | Portal Publik (Beranda, Transparansi, Sekolah, Detail Transaksi) | PRD ini, siap implementasi setelah persetujuan |
| **Phase 2** | Portal Siswa (login NISN + DOB, status alokasi, hubungkan wallet, klaim) | PRD lanjutan setelah Phase 1 demo-ready |
| **Phase 3** | Dashboard Sekolah (antrean verifikasi sign on-chain) | PRD lanjutan |
| **Phase 4** | Dashboard Pemerintah (batch alokasi, distribute, monitor nasional) | PRD lanjutan |

---

## 14. Keputusan Desain Tertulis (Audit Trail antislop R-31)

Satu baris alasan per keputusan:

- **Navy `#1e3a5f`**: identitas institusional pemerintah Indonesia, sejajar INA Digital LAN Navy.
- **Emerald `#059669`**: sentiment positive (INA Digital), dipakai hanya untuk angka dana tersalur dan link aktif, dosis rendah.
- **Plus Jakarta Sans**: studio Indonesia, geometris-humanis cocok ENERGY 1.
- **Surface `#f8f7f4`**: hindari sterile default putih murni, hangat tipis agar terasa dikerjakan.
- **Card radius 8px**: hierarki via garis bukan bayangan; 16px shadcn default terlalu konsumer-ish.
- **Tabular nums pada angka uang**: kolom uang lurus, pola Follow the Money.
- **Skeleton block bukan shimmer**: MOTION 1, hindari animasi template.
- **Tidak ada dark mode default**: layanan publik Indonesia = light mode; toggle di Phase 2 jika dibutuhkan.
- **Steper vertikal di `/transaksi`**: progressive disclosure pola Follow the Money; tahap belum dieksekusi eksplisit.
- **Header Login Siswa disabled**: Phase 2 belum jadi, jangan nav ke halaman tak ada (R-24); label Segera hadir jujur (R-26).
- **Slogan "Bantuan Terlacak, Dana Tepat Sasaran"**: Singkat, representasi nilai anti-leakage PIP, tanpa istilah buzzword.
- **Wordmark teks Aloka**: Placeholder jujur Plus Jakarta Sans Bold hingga ada aset visual resmi (R-23).

---

## 15. Keputusan Final Pengguna (Phase 1)

1. **Logo**: Belum ada aset resmi. Gunakan wordmark teks "Aloka" dengan font Plus Jakarta Sans Bold (placeholder jujur, antislop R-23).
2. **Slogan & Hero**: "Bantuan Terlacak, Dana Tepat Sasaran" (singkat, padat, tanpa buzzword AI).
3. **Target Environment**: Localhost terlebih dahulu (`http://localhost:3001` untuk frontend, `http://localhost:3000/api/v1` untuk backend). Arsitektur siap di-deploy ke Vercel di tahap berikutnya.
4. **Afiliasi Visual Kementerian**: Tidak menggunakan logo instansi (Kemendikdasmen) tanpa otorisasi formal. Identitas murni milik platform Aloka.

---

## 16. Acuan & Sumber Eksternal

1. Seragam Design System (belajar.id/GovTech Edu): `https://seragam.belajar.id/`
2. INA Digital Design System - Warna: `https://design.inadigital.go.id/foundation/color/`
3. Identitas Visual Kemendikdasmen: `https://www.kemendikdasmen.go.id/detail/Identitas-Visual`
4. OpenSpending Docs (Interact): `https://docs.openspending.org/en/latest/users/interact/`
5. Follow the Money Search Redesign (Lehner Digital): `https://www.lehnerdigital.net/work/follow-the-money-search-new-york-campaign-finance-board`
6. Arlington Visual Budget (GoInvo): `https://www.goinvo.com/work/visual-government`
7. Surat Edaran Kemendikdasmen No. 7 Tahun 2025 (Panduan Logo & Slogan)