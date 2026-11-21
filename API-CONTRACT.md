# API Contract - Aloka Platform

Spesifikasi antarmuka komunikasi antara Backend (REST API) dan Frontend.

- **Base URL**: `http://localhost:3000/api/v1`
- **Format Payload**: `application/json`
- **Format Waktu**: ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Format Respon Standar**:
  ```json
  // Sukses
  {
    "success": true,
    "message": "Deskripsi sukses",
    "data": { ... }
  }

  // Gagal
  {
    "success": false,
    "message": "Deskripsi error",
    "error": {
      "code": "ERROR_CODE",
      "details": [ ... ]
    }
  }
  ```

---

## 1. Domain Publik (`/public`)
Tidak memerlukan header `Authorization`.

### 1.1 Statistik Distribusi Nasional
- **Method / Endpoint**: `GET /public/stats`
- **Deskripsi**: Metrik agregat bantuan tersalurkan, jenjang penerima, dan audit trail singkat.
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Public transparency statistics retrieved",
    "data": {
      "summary": {
        "totalApplications": 120,
        "totalDistributed": 85,
        "totalVerified": 15,
        "totalPending": 18,
        "totalRejected": 2,
        "totalFundDistributedIDR": "85000000"
      },
      "byGradeLevel": {
        "SD": 30,
        "SMP": 25,
        "SMA": 18,
        "SMK": 12
      },
      "recentActivity": [
        {
          "action": "AID_DISTRIBUTED",
          "txHash": "0x3f1a...",
          "actorRole": "GOVERNMENT",
          "timestamp": "2026-11-20T10:00:00.000Z",
          "polygonscanUrl": "https://amoy.polygonscan.com/tx/0x3f1a..."
        }
      ],
      "contractAddress": "0xd938a4d1e8de7bd0eebe7fba0fbff4fc29154601",
      "network": "Polygon Amoy Testnet"
    }
  }
  ```

---

### 1.2 Ledger Audit Transaksi On-Chain
- **Method / Endpoint**: `GET /public/ledger`
- **Query Params**:
  - `page` (integer, default: `1`)
  - `limit` (integer, default: `10`, max: `50`)
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Public transaction ledger retrieved",
    "data": {
      "items": [
        {
          "id": "c1f7a...",
          "action": "APPLICATION_VERIFIED_ONCHAIN",
          "actorRole": "SCHOOL",
          "txHash": "0xabc...",
          "createdAt": "2026-11-20T09:30:00.000Z",
          "polygonscanUrl": "https://amoy.polygonscan.com/tx/0xabc..."
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 45,
        "totalPages": 5
      }
    }
  }
  ```

---

### 1.3 Verifikasi Pengajuan via TX Hash
- **Method / Endpoint**: `GET /public/applications/:txHash`
- **Params**: `txHash` (string heksadesimal 66 karakter dengan awalan `0x`)
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Application verified via transaction hash",
    "data": {
      "applicationHash": "0x1234...",
      "academicYear": "2025/2026",
      "onchainId": "12",
      "onchainStatus": "DISTRIBUTED",
      "amount": "1000000",
      "gradeLevel": "SMA",
      "school": {
        "name": "SMAN 1 Jakarta",
        "npsn": "20101234"
      },
      "transactions": {
        "submit": {
          "hash": "0xaaa...",
          "polygonscanUrl": "https://amoy.polygonscan.com/tx/0xaaa..."
        },
        "verify": {
          "hash": "0xbbb...",
          "polygonscanUrl": "https://amoy.polygonscan.com/tx/0xbbb..."
        },
        "distribute": {
          "hash": "0xccc...",
          "polygonscanUrl": "https://amoy.polygonscan.com/tx/0xccc..."
        }
      },
      "createdAt": "2026-11-18T08:00:00.000Z"
    }
  }
  ```
- **Error `404 Not Found`**:
  ```json
  {
    "success": false,
    "message": "No application found for this transaction hash",
    "error": { "code": "TX_NOT_FOUND" }
  }
  ```

---

### 1.4 Daftar Sekolah Terdaftar
- **Method / Endpoint**: `GET /public/schools`
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Registered schools retrieved",
    "data": [
      {
        "npsn": "20101234",
        "name": "SMAN 1 Jakarta",
        "address": "Jl. Budi Utomo No. 7, Jakarta Pusat",
        "_count": {
          "students": 150
        }
      }
    ]
  }
  ```

---

## 2. Domain Otentikasi (`/auth`)

### 2.1 Login Staf / Admin (Pemerintah & Sekolah)
- **Method / Endpoint**: `POST /auth/login`
- **Request Body**:
  ```json
  {
    "email": "admin@kemdikbud.go.id",
    "password": "Password123!"
  }
  ```
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "u-123",
        "email": "admin@kemdikbud.go.id",
        "role": "GOVERNMENT",
        "schoolId": null
      },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

---

### 2.2 Login Siswa (NISN & Tanggal Lahir)
- **Method / Endpoint**: `POST /auth/student/login`
- **Request Body**:
  ```json
  {
    "nisn": "0012345678",
    "dateOfBirth": "2008-05-15"
  }
  ```
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Student login successful",
    "data": {
      "student": {
        "id": "s-456",
        "nisn": "0012345678",
        "fullName": "Budi Santoso",
        "gradeLevel": "SMA",
        "schoolId": "sch-01",
        "walletAddress": null
      },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

---

### 2.4 Generate SIWE Nonce
- **Method / Endpoint**: `GET /auth/siwe/nonce`
- **Query Params**: `address` (wallet address format `0x...`)
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "SIWE nonce generated",
    "data": {
      "nonce": "aB1cD2eF3g",
      "issuedAt": "2026-11-20T10:00:00.000Z",
      "expirationTime": "2026-11-20T10:05:00.000Z"
    }
  }
  ```

---

### 2.5 Refresh Access Token
- **Method / Endpoint**: `POST /auth/refresh`
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Token refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
  ```

---

### 2.6 Logout
- **Method / Endpoint**: `POST /auth/logout`
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

## 3. Domain Pengajuan Bantuan (`/applications`)
Memerlukan header: `Authorization: Bearer <accessToken>`

### 3.1 Buat Pengajuan (Khusus Siswa)
- **Method / Endpoint**: `POST /applications`
- **Role**: `STUDENT`
- **Request Body**:
  ```json
  {
    "academicYear": "2025/2026"
  }
  ```
- **Respon `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Application submitted successfully",
    "data": {
      "id": "app-001",
      "studentId": "s-456",
      "academicYear": "2025/2026",
      "validationStatus": "PENDING",
      "onchainStatus": "UNSUBMITTED",
      "applicationHash": "0x7a8b...",
      "createdAt": "2026-11-20T11:00:00.000Z"
    }
  }
  ```

---

### 3.2 Ambil Daftar Pengajuan
- **Method / Endpoint**: `GET /applications`
- **Role**: Semua role terotentikasi (Siswa hanya melihat miliknya, Sekolah melihat muridnya, Pemerintah melihat semua).
- **Query Params**:
  - `page` (default: 1)
  - `limit` (default: 10)
  - `status` (opsional: `PENDING`, `VALID`, `REJECTED`)
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Applications retrieved",
    "data": {
      "items": [
        {
          "id": "app-001",
          "academicYear": "2025/2026",
          "amount": "1000000",
          "validationStatus": "VALID",
          "onchainStatus": "AWAITING_REVIEW",
          "createdAt": "2026-11-20T11:00:00.000Z"
        }
      ],
      "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
    }
  }
  ```

---

### 3.3 Detail Pengajuan
- **Method / Endpoint**: `GET /applications/:id`
- **Role**: Pemilik pengajuan, Sekolah yang bersangkutan, atau Pemerintah.
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Application details retrieved",
    "data": {
      "id": "app-001",
      "applicationHash": "0x7a8b...",
      "academicYear": "2025/2026",
      "amount": "1000000",
      "validationStatus": "VALID",
      "onchainStatus": "VERIFIED",
      "student": {
        "fullName": "Budi Santoso",
        "nisn": "0012345678",
        "gradeLevel": "SMA",
        "walletAddress": "0x1111..."
      },
      "txSubmitHash": "0xaaa...",
      "txVerifyHash": "0xbbb...",
      "txDistributeHash": null
    }
  }
  ```

---

## 4. Domain Verifikasi Sekolah (`/schools`)
Memerlukan header: `Authorization: Bearer <accessToken>`
Khusus role: `SCHOOL`

### 4.1 Daftar Pengajuan Siswa Sekolah
- **Method / Endpoint**: `GET /schools/applications`
- **Respon `200 OK`**: Array pengajuan milik tenant sekolah yang sedang login.

---

### 4.2 Verifikasi Administratif Siswa
- **Method / Endpoint**: `PATCH /schools/applications/:id/verify`
- **Request Body**:
  ```json
  {
    "referenceNumber": "SK/2026/001"
  }
  ```
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Student application verified administratively",
    "data": {
      "id": "app-001",
      "validationStatus": "VALID"
    }
  }
  ```

---

### 4.3 Tolak Kelayakan Siswa
- **Method / Endpoint**: `PATCH /schools/applications/:id/reject`
- **Request Body**:
  ```json
  {
    "reason": "Siswa sudah lulus / pindah sekolah"
  }
  ```
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Student application rejected",
    "data": {
      "id": "app-001",
      "validationStatus": "REJECTED",
      "rejectionReason": "Siswa sudah lulus / pindah sekolah"
    }
  }
  ```

---

## 5. Domain Blockchain Transaksional (`/blockchain`)
Memerlukan header: `Authorization: Bearer <accessToken>`

### 5.1 Statistik Escrow On-Chain Langsung
- **Method / Endpoint**: `GET /blockchain/escrow/stats`
- **Akses**: Publik
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Escrow contract stats retrieved",
    "data": {
      "totalFunded": "500000000",
      "totalDistributed": "85000000",
      "vaultBalance": "415000000",
      "nextApplicationId": 86
    }
  }
  ```

---

### 5.2 Submit Pengajuan ke On-Chain (Pemerintah)
- **Method / Endpoint**: `POST /blockchain/applications/:id/submit`
- **Role**: `GOVERNMENT`
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Application submitted on-chain",
    "data": {
      "onchainId": 12,
      "txHash": "0x123..."
    }
  }
  ```

---

### 5.3 Verifikasi Pengajuan On-Chain (Sekolah)
- **Method / Endpoint**: `POST /blockchain/applications/:id/verify`
- **Role**: `SCHOOL`
- **Request Body**:
  ```json
  {
    "amount": "1000000"
  }
  ```
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Application verified on-chain",
    "data": {
      "txHash": "0x456..."
    }
  }
  ```

---

### 5.4 Eksekusi Distribusi Bantuan (Pemerintah)
- **Method / Endpoint**: `POST /blockchain/applications/:id/distribute`
- **Role**: `GOVERNMENT`
- **Respon `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Aid distributed on-chain",
    "data": {
      "txHash": "0x789..."
    }
  }
  ```
