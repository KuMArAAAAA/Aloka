# Aloka – Web3-Based Education Aid Distribution Platform

Platform distribusi bantuan pendidikan berbasis Web3 untuk meningkatkan transparansi, akuntabilitas, dan keamanan penyaluran dana bantuan pendidikan (**Program Indonesia Pintar / PIP**) menggunakan arsitektur **Hybrid Web2–Web3**.

Dana bantuan dikunci dalam **Smart Contract Escrow** on-chain, diverifikasi secara berjenjang oleh pihak sekolah, dan disalurkan langsung ke wallet Web3 siswa/wali murid tanpa perantara fisik untuk mengeliminasi potensi pemotongan dana (*fund leakage*), pungutan liar, maupun pencairan fiktif.

---

## 🏛️ Arsitektur Sistem

Aloka mengintegrasikan tiga lapisan utama:

```mermaid
flowchart LR
    subgraph Frontend ["Frontend (Next.js 14)"]
        UI_Publik["Portal Publik & Audit (/transparansi)"]
        UI_Siswa["Portal Siswa (/siswa)"]
        UI_Sekolah["Dashboard Sekolah (/sekolah)"]
        UI_Pemerintah["Admin Vault (/pemerintah)"]
    end

    subgraph Backend ["Backend API (Express.js & Prisma)"]
        AuthService["Auth & SIWE (EIP-4361)"]
        AppService["Manajemen Pengajuan & RBAC"]
        EventListener["Event Sync & Audit Logger"]
        DB[(PostgreSQL Database)]
    end

    subgraph Blockchain ["Polygon Amoy Testnet (Chain ID: 80002)"]
        EscrowContract["AlokaEscrow.sol (Vault & State Machine)"]
        TokenContract["MockIDR.sol (ERC-20 Token mIDR)"]
    end

    Frontend <-->|REST API / JSON| Backend
    Frontend <-->|Web3 Provider / Ethers.js| Blockchain
    Backend <-->|RPC Provider / Signer| Blockchain
    Backend <--> DB
```

### 1. Smart Contracts (Foundry / Solidity)
- **`AlokaEscrow.sol`**: Mengelola *escrow vault*, siklus status pengajuan (*state machine*), otorisasi verifikator sekolah (`setSchoolValidator`), penguncian kas negara (`fund`), verifikasi (`verifyApplication`), penolakan (`rejectApplication`), hingga penyaluran dana (`distributeAid`) dengan proteksi *ReentrancyGuard*.
- **`MockIDR.sol`**: Token ERC-20 simulasi Rupiah digital (`mIDR`) dengan `decimals = 0` (1 token = Rp1) dan batas *max supply* 1 miliar mIDR.

### 2. Backend REST API Service (Node.js / Express.js / Prisma ORM)
- **Autentikasi Multi-Metode**: Login email/password untuk admin & sekolah, login NISN + tanggal lahir untuk siswa, serta validasi single-use nonce **Sign-In with Ethereum (SIWE / EIP-4361)** untuk *wallet binding*.
- **Keamanan & Otorisasi**: Proteksi IDOR, multi-tenant RBAC, *refresh token rotation*, server-side token revocation, rate limiting, dan header Helmet.
- **Sinkronisasi On-Chain**: Background event listener dengan checkpoint block tracking (`EventSyncState`) dan pencatatan audit log otomatis tanpa duplikasi.
- **Database**: PostgreSQL (teruji dengan Supabase pgBouncer & Direct URL).

### 3. Frontend Web Application (Next.js 14 App Router / Tailwind CSS / TypeScript)
- **Portal Siswa (`/siswa`)**: Lacak status bantuan via 10 digit NISN, integrasi browser wallet (MetaMask), formulir pengajuan bantuan baru, dan *stepper* progres 3 tahap.
- **Dashboard Verifikator Sekolah (`/sekolah`)**: Review keaktifan siswa di Dapodik, penetapan nominal resmi PIP per jenjang pendidikan, serta eksekusi verifikasi atau penolakan.
- **Admin Vault Pemerintah (`/pemerintah`)**: Form deposit kas APBN (`fund`), pencetakan simulasi dana (`mint` token mIDR), manajemen validator sekolah terdaftar, dan eksekusi pencairan bantuan (`distributeAid`).
- **Buku Besar Audit Publik (`/transparansi`)**: Log audit non-PII (masking nama siswa) terbuka 24/7 bagi KPK, BPK, jurnalis, dan masyarakat umum, ringkasan per jenjang, link langsung ke Polygonscan, serta ekspor laporan CSV.
- **Portal Login Terpadu (`/login`)**: Pintu masuk berbasis peran untuk staf sekolah, administrator pemerintah, maupun siswa.

---

## 📁 Struktur Repositori

```text
.
├── backend/                        # Backend REST API Service (Node.js / Express.js)
│   ├── abi/                        # ABI Smart Contract (AlokaEscrow & MockIDR)
│   ├── prisma/                     # Skema database & script data seeding
│   │   ├── schema.prisma           # Prisma schema (PostgreSQL)
│   │   └── seed.js                 # Seed data (sekolah, siswa, admin, rekomendasi)
│   ├── src/
│   │   ├── config/                 # Konfigurasi env, database Prisma, & signer blockchain
│   │   ├── controllers/            # Controller HTTP (Auth, Application, School, Blockchain)
│   │   ├── middleware/             # JWT auth, RBAC, error handler, Zod validator
│   │   ├── routes/                 # Route definition per domain
│   │   ├── schemas/                # Skema validasi Zod
│   │   ├── services/               # Core business logic & blockchain service
│   │   ├── utils/                  # Logger Winston, response helper, hash utilities
│   │   ├── app.js                  # Setup middleware & route Express
│   │   └── server.js               # Server entry point & graceful shutdown
│   ├── test/                       # Security & slice unit tests
│   ├── .env.example                # Template variabel lingkungan backend
│   └── package.json
├── frontend/                       # Frontend Web Application (Next.js 14 App Router)
│   ├── src/
│   │   ├── app/                    # Routing & Pages
│   │   │   ├── page.tsx            # Beranda & ringkasan metrik on-chain
│   │   │   ├── login/              # Portal login terpadu
│   │   │   ├── siswa/              # Portal tracking & pengajuan siswa
│   │   │   ├── sekolah/            # Dashboard verifikator satuan pendidikan
│   │   │   ├── pemerintah/         # Admin vault & manajemen distribusi dana
│   │   │   └── transparansi/       # Public ledger explorer & audit trail
│   │   ├── components/             # Reusable UI (Navbar, Footer, ConnectWalletButton, StatusBadge)
│   │   ├── context/                # Web3Context (Ethers.js provider, wallet state, network switch)
│   │   ├── contracts/              # ABI & konfigurasi alamat kontrak on-chain
│   │   └── lib/                    # Helper classnames & mock fallback data
│   ├── tailwind.config.js          # Konfigurasi styling Tailwind CSS
│   ├── tsconfig.json               # Konfigurasi TypeScript
│   └── package.json
├── src/                            # Solidity Smart Contracts (Foundry)
│   ├── AlokaEscrow.sol             # Smart Contract Escrow utama
│   └── MockIDR.sol                 # Token ERC-20 simulasi Rupiah (mIDR)
├── script/                         # Script Deployment Foundry
│   └── DeployAlokaEscrow.s.sol     # Script broadcast deploy ke jaringan Polygon Amoy
├── test/                           # Smart Contract Unit Tests (Forge)
│   ├── AlokaEscrow.t.sol           # Pengujian fungsionalitas vault & state machine
│   └── MockIDR.t.sol               # Pengujian token ERC-20 mIDR
├── API-CONTRACT.md                 # Dokumentasi spesifikasi antarmuka REST API
├── PRD.md                          # Product Requirements Document sistem Aloka
├── PRD-FRONTEND.md                 # Product Requirements Document frontend portal
├── foundry.toml                    # Konfigurasi Foundry project
└── README.md                       # Dokumentasi utama proyek
```

---

## ⛓️ Smart Contracts & Deployment

Jaringan Target: **Polygon Amoy Testnet (Chain ID: 80002 / Hex: 0x13882)**

| Kontrak / Entitas | Alamat Terverifikasi | Explorer |
| :--- | :--- | :--- |
| **AlokaEscrow** | `0xd938a4d1e8de7bd0eebe7fba0fbff4fc29154601` | [Polygonscan Amoy](https://amoy.polygonscan.com/address/0xd938a4d1e8de7bd0eebe7fba0fbff4fc29154601) |
| **MockIDR (`mIDR`)** | `0xf7CDC1cc0a689585B7E9c25E29319Cd4B73e0Ad2` | [Polygonscan Amoy](https://amoy.polygonscan.com/address/0xf7CDC1cc0a689585B7E9c25E29319Cd4B73e0Ad2) |
| **Government Deployer** | `0xf4aD431Aa2F60A00676F4CF7ac2f18012a1883f6` | [Polygonscan Amoy](https://amoy.polygonscan.com/address/0xf4aD431Aa2F60A00676F4CF7ac2f18012a1883f6) |

### Siklus Status Pengajuan (`AlokaEscrow`)
```text
[BelumAda (0)] 
      │
      ▼ (submitApplication)
[MenungguVerifikasi (1)] ──(rejectApplication)──► [Ditolak (3)]
      │
      ▼ (verifyApplication)
[Terverifikasi (2)]
      │
      ▼ (distributeAid)
[Tersalurkan (4)]
```

### Standar Nominal Bantuan PIP Resmi
| Jenjang Pendidikan | Nominal per Siswa / Tahun |
| :--- | :--- |
| **SD / SDLB / Paket A** | Rp 450.000 |
| **SMP / SMPLB / Paket B** | Rp 750.000 |
| **SMA / SMK / SMALB / Paket C** | Rp 1.800.000 |

---

## 🚀 Panduan Memulai (Quick Start)

### 1. Prasyarat Sistem
- [Node.js](https://nodejs.org/) v18+ & npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (untuk kompilasi dan testing smart contract)
- Database PostgreSQL (lokal atau cloud seperti Supabase)
- Web3 Wallet browser extension (seperti [MetaMask](https://metamask.io/)) terhubung ke Polygon Amoy Testnet

---

### 2. Setup Smart Contracts (Foundry)

```bash
# Clone repository
git clone https://github.com/WhyNotKumara/Aloka.git
cd Aloka

# Kompilasi smart contract
forge build

# Menjalankan rangkaian unit test forge
forge test
```

---

### 3. Setup Backend Service

Masuk ke direktori backend:

```bash
cd backend
```

Salin file environment dan lengkapi konfigurasi:

```bash
cp .env.example .env
```

Contoh konfigurasi `.env` penting:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/aloka_db?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/aloka_db"

JWT_SECRET="aloka_super_secret_jwt_key_2026_min32chars"
JWT_REFRESH_SECRET="aloka_super_refresh_jwt_key_2026_min32chars"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

POLYGON_RPC_URL="https://polygon-amoy-bor-rpc.publicnode.com"
ESCROW_CONTRACT_ADDRESS="0xd938a4d1e8de7bd0eebe7fba0fbff4fc29154601"
TOKEN_CONTRACT_ADDRESS="0xf7CDC1cc0a689585B7E9c25E29319Cd4B73e0Ad2"

CORS_ORIGIN="http://localhost:3001"
OTP_MOCK_ENABLED=true
```

Install dependensi, inisialisasi database, dan jalankan server:

```bash
# Install dependencies
npm install

# Generate Prisma Client & push skema ke database
npm run prisma:generate
npm run prisma:push

# (Opsional) Jalankan seed data awal
npm run prisma:seed

# Jalankan server development
npm run dev

# Jalankan automated security tests
npm test
```

Server backend aktif di `http://localhost:3000`.

---

### 4. Setup Frontend Web Application

Buka terminal baru dan masuk ke direktori frontend:

```bash
cd frontend
```

Install dependensi dan jalankan server development Next.js:

```bash
# Install dependencies
npm install

# Jalankan development server (port 3001)
npm run dev
```

Buka antarmuka aplikasi di browser pada `http://localhost:3001`.

Untuk menjalankan build production:

```bash
npm run build
npm run start
```

---

## 🛡️ Ringkasan API Endpoints

Base URL: `http://localhost:3000/api/v1`

### 🌐 1. Domain Publik (`/api/v1/public`)
- `GET /api/v1/public/stats` - Statistik agregat distribusi nasional, rekapitulasi jenjang, dan aktivitas terkini.
- `GET /api/v1/public/ledger` - Log audit publik dan riwayat transaksi on-chain (terpaginasi).
- `GET /api/v1/public/verify/:txHash` - Verifikasi langsung keabsahan transaksi on-chain berdasarkan transaction hash.
- `GET /api/v1/public/schools` - Daftar sekolah yang telah resmi terdaftar sebagai validator sah.

### 🔐 2. Autentikasi (`/api/v1/auth`)
- `POST /api/v1/auth/login` - Login email/password staf pemerintah dan sekolah.
- `POST /api/v1/auth/student/login` - Login siswa via NISN & tanggal lahir (validasi data Dapodik).
- `GET /api/v1/auth/siwe/nonce?address=0x...` - Generate nonce unik EIP-4361 dengan masa berlaku terbatas.
- `POST /api/v1/auth/refresh` - Rotasi access token menggunakan refresh token valid.
- `POST /api/v1/auth/logout` - Revokasi refresh token dari basis data.

### 🎓 3. Siswa & Profil (`/api/v1/students`)
- `GET /api/v1/students/me` - Mendapatkan data profil siswa yang sedang login.
- `POST /api/v1/students/wallet/bind` - Mengikat alamat Web3 wallet siswa menggunakan verifikasi SIWE.

### 📝 4. Pengajuan Bantuan (`/api/v1/applications`)
- `POST /api/v1/applications` - Siswa membuat permohonan bantuan baru.
- `GET /api/v1/applications` - Daftar pengajuan (terfilter otomatis sesuai wewenang role).
- `GET /api/v1/applications/:id` - Informasi detail satu pengajuan bantuan.

### 🏫 5. Verifikasi Satuan Pendidikan (`/api/v1/schools`)
- `GET /api/v1/schools/applications` - Daftar permohonan siswa yang terdaftar di sekolah verifikator.
- `PATCH /api/v1/schools/applications/:id/verify` - Verifikasi kelayakan administratif siswa.
- `PATCH /api/v1/schools/applications/:id/reject` - Penolakan kelayakan siswa disertai catatan alasan penolakan.

### ⛓️ 6. Operasi Blockchain (`/api/v1/blockchain`)
- `GET /api/v1/blockchain/escrow-stats` - Statistik saldo vault escrow langsung dari smart contract.
- `POST /api/v1/blockchain/submit-onchain` - Inisiasi pencatatan pengajuan ke smart contract vault.
- `POST /api/v1/blockchain/verify-onchain` - Eksekusi persetujuan pengajuan on-chain oleh verifikator sekolah.
- `POST /api/v1/blockchain/distribute` - Eksekusi transfer token mIDR dari escrow ke dompet siswa oleh pemerintah.

---

## 👥 Tim Pengembang

Dikembangkan untuk **Hackathon** oleh tim **Trash Bag Bola Obor**.
Informasi lengkap arsitektur bisnis dan spesifikasi teknis dapat dibaca pada [PRD.md](file:///d:/Hackathon/Aloka/PRD.md), [PRD-FRONTEND.md](file:///d:/Hackathon/Aloka/PRD-FRONTEND.md), dan [API-CONTRACT.md](file:///d:/Hackathon/Aloka/API-CONTRACT.md).
