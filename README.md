# 🛒 Projek Integrasi Sistem E-Commerce Jersey
**Pre-Order Jersey**

Proyek integrasi sistem e-commerce jersey yang menghubungkan website dengan API Logistik JNE (Rajaongkir Komerce) dan platform pembayaran Tako menggunakan teknik **Deep Linking** dan **Webhook**.

> Dibuat untuk memenuhi tugas UTS mata kuliah Integrasi Sistem  
> Program Studi Teknologi Informasi, Fakultas Teknik, Universitas Lambung Mangkurat — 2026

---

## 👥 Pembuat

| Nama | NIM |
|------|-----|
| Muhammad Aufa Fitrianda | 2310817210013 |


---

## 📁 Struktur Proyek

```
integrasi-jersey/
├── index.html        # Halaman website e-commerce (frontend)
├── server.js         # Server Node.js (backend + integrasi)
├── package.json      # Dependensi Node.js
├── .env              # API Key (tidak diupload ke GitHub)
├── .gitignore        # Mengecualikan node_modules & .env
└── README.md         # Dokumentasi ini
```

---

## ⚙️ Prasyarat

Pastikan sudah terinstall di komputer:

- [Node.js](https://nodejs.org/) versi 18 ke atas
- npm (sudah termasuk bersama Node.js)
- API Key dari [Rajaongkir Komerce](https://rajaongkir.komerce.id/)

---

## 🚀 Cara Menjalankan Proyek

### 1. Clone Repository

```bash
git clone https://github.com/AuFaMiReDo/Projek-Integrasi-Sistem-Jersey.git
cd Projek-Integrasi-Sistem-Jersey
```

### 2. Install Dependensi

```bash
npm install
```

### 3. Buat File `.env`

Buat file baru bernama `.env` di root folder proyek, lalu isi dengan API Key milikmu:

```
RAJAONGKIR_API_KEY=isi_api_key_kamu_disini
```

> ⚠️ File `.env` tidak boleh di-push ke GitHub. Sudah dikecualikan otomatis via `.gitignore`.

### 4. Jalankan Server

```bash
node server.js
```

Jika berhasil, terminal akan menampilkan:

```
🚀 Server berhasil berjalan di http://localhost:3000

📦 Endpoint tersedia:
   POST http://localhost:3000/cek-ongkir
   POST http://localhost:3000/checkout
   POST http://localhost:3000/webhook/taco
   GET  http://localhost:3000/pesanan/:orderId
   GET  http://localhost:3000/semua-pesanan
```

### 5. Buka Website

Buka file `index.html` langsung di browser (double click), atau gunakan ekstensi **Live Server** di VS Code.

> ⚠️ Pastikan server Node.js tetap berjalan selama menggunakan website.

---

## 🔄 Alur Sistem

```
Pembeli ──► Pilih ukuran & kota tujuan
        ──► Klik "Hitung Ongkir"  ──► POST /cek-ongkir ──► API JNE
        ──► Klik "Lanjutkan Pembayaran"
                ──► POST /checkout (server buat Order ID & simpan pesanan)
                ──► Redirect ke tako.id/pay?amount=xxx&order_id=xxx
                ──► Pembeli bayar di Tako
                ──► Tako kirim Webhook ──► POST /webhook/taco
                ──► Server validasi & update status → LUNAS
```

---

## 🧪 Pengujian dengan Postman

### A. Cek Ongkir

```
POST http://localhost:3000/cek-ongkir
Content-Type: application/json

{
  "origin": "43",
  "destination": "391",
  "weight": 1000
}
```

### B. Checkout (Buat Pesanan)

```
POST http://localhost:3000/checkout
Content-Type: application/json

{
  "namaDepan": "Ahmad",
  "namaBelakang": "Fauzi",
  "nomorWA": "08123456789",
  "ukuran": "L",
  "kotaTujuan": "Samarinda",
  "ongkir": 25000,
  "totalTagihan": 340000
}
```

Response akan mengembalikan `orderId` dan `urlPembayaran`.

### C. Simulasi Webhook Tako

Salin `orderId` dari response checkout di atas, lalu kirim:

```
POST http://localhost:3000/webhook/taco
Content-Type: application/json

{
  "order_id": "CUCURUTUT-xxx-xxx",
  "status": "success",
  "amount": 340000
}
```

> ⚠️ Nilai `amount` harus **persis sama** dengan `totalTagihan` saat checkout. Jika berbeda, server akan menolak (cross-validation).

### D. Cek Status Pesanan

```
GET http://localhost:3000/pesanan/CUCURUTUT-xxx-xxx
```

```
GET http://localhost:3000/semua-pesanan
```

---

## 📌 Catatan

- Platform Tako yang digunakan (`tako.id/pay`) memerlukan akun merchant aktif agar halaman pembayaran dapat menerima transaksi. Untuk pengujian, deep linking sudah berhasil mengirim parameter `amount` dan `order_id` via URL.
- Data pesanan disimpan di memori server (akan hilang jika server dimatikan). Untuk produksi, perlu diganti dengan database permanen seperti MySQL atau MongoDB.
- Webhook Tako dapat disimulasikan menggunakan Postman seperti panduan di atas.
