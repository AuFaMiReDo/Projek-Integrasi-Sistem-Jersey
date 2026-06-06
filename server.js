const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

// ============================================================
// Simulasi "Database" di memori (untuk demo/pengujian)
// Di produksi, ganti dengan koneksi database sesungguhnya
// ============================================================
const databasePesanan = {};

// Middleware wajib
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Rute Dasar
// ============================================================
app.get('/', (req, res) => {
    res.send('Server Integrasi E-Commerce Jersey Berjalan Lancar!');
});

// ============================================================
// FASE 2 — Endpoint Cek Ongkir
// ============================================================
app.post('/cek-ongkir', async (req, res) => {
    const { origin, destination, weight } = req.body;

    try {
        const formData = new URLSearchParams();
        formData.append('origin', origin);
        formData.append('destination', destination);
        formData.append('weight', weight);
        formData.append('courier', 'jne');

        const response = await axios.post(
            'https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost',
            formData,
            { headers: { 'key': process.env.RAJAONGKIR_API_KEY } }
        );

        res.json({ sukses: true, data: response.data.data });

    } catch (error) {
        res.status(500).json({
            sukses: false,
            pesan: 'Gagal mengecek ongkos kirim',
            error: error.response ? error.response.data : error.message
        });
    }
});

// ============================================================
// FASE 3 — Endpoint Checkout (Server-Side Order Creation)
//
// Menerima data pesanan dari browser, menyimpannya di "database",
// lalu merakit URL Tako dengan Deep Linking dan mengembalikannya.
// Ini mencegah parameter tampering karena Order ID & nominal
// dibuat dan disimpan di server, bukan di browser.
// ============================================================
app.post('/checkout', (req, res) => {
    const { namaDepan, namaBelakang, nomorWA, ukuran, kotaTujuan, ongkir, totalTagihan } = req.body;

    // Validasi input wajib
    if (!namaDepan || !nomorWA || !ukuran || !kotaTujuan || !totalTagihan) {
        return res.status(400).json({
            sukses: false,
            pesan: 'Data tidak lengkap. Pastikan semua field terisi.'
        });
    }

    // Generate Order ID unik di sisi server
    const timestamp = Date.now();
    const random   = Math.floor(Math.random() * 9000) + 1000;
    const orderId  = `CUCURUTUT-${timestamp}-${random}`;

    // Simpan pesanan ke "database"
    databasePesanan[orderId] = {
        orderId,
        namaDepan,
        namaBelakang,
        nomorWA,
        ukuran,
        kotaTujuan,
        ongkir: Number(ongkir),
        totalTagihan: Number(totalTagihan),
        status: 'MENUNGGU_PEMBAYARAN',
        createdAt: new Date().toISOString()
    };

    console.log('\n====================================');
    console.log('🛒 [CHECKOUT] Pesanan baru dibuat!');
    console.log('Order ID :', orderId);
    console.log('Pembeli  :', `${namaDepan} ${namaBelakang}`);
    console.log('Ukuran   :', ukuran);
    console.log('Tujuan   :', kotaTujuan);
    console.log('Total    :', `Rp ${Number(totalTagihan).toLocaleString('id-ID')}`);
    console.log('Status   :', 'MENUNGGU_PEMBAYARAN');
    console.log('====================================\n');

    // Rakit URL Tako dengan Deep Linking (sesuai blueprint laporan)
    // Format: https://tako.id/pay?amount=315000&order_id=CUCURUTUT-xxx
    const urlTako = `https://tako.id/pay?amount=${totalTagihan}&order_id=${encodeURIComponent(orderId)}`;

    res.json({
        sukses: true,
        orderId,
        urlPembayaran: urlTako
    });
});

// ============================================================
// FASE 4 — Endpoint Webhook Tako
//
// Menerima notifikasi pembayaran dari Tako setelah user bayar.
// Cross-validation: cek apakah nominal yang dikirim Tako
// sama dengan yang tersimpan di database (anti-tampering).
// ============================================================
app.post('/webhook/taco', (req, res) => {
    const payload = req.body;

    console.log('\n====================================');
    console.log('🔔 [WEBHOOK] Notifikasi baru dari Tako diterima!');
    console.log('Isi Payload:', JSON.stringify(payload, null, 2));

    const { order_id: orderId, status: statusPembayaran, amount: nominalDibayar } = payload;

    if (statusPembayaran === 'success') {

        // Cross-validation: cocokkan nominal dengan yang tersimpan di server
        const pesanan = databasePesanan[orderId];

        if (!pesanan) {
            console.log(`⚠️  Order ID ${orderId} tidak ditemukan di database!`);
            console.log('====================================\n');
            return res.status(404).json({ status: 'error', message: 'Order ID tidak ditemukan' });
        }

        if (Number(nominalDibayar) !== pesanan.totalTagihan) {
            console.log(`🚨 [CROSS-VALIDATION GAGAL] Nominal tidak cocok!`);
            console.log(`   Dibayar : Rp ${nominalDibayar}`);
            console.log(`   Tagihan : Rp ${pesanan.totalTagihan}`);
            console.log('   Status TIDAK diubah ke LUNAS.');
            console.log('====================================\n');
            return res.status(400).json({ status: 'error', message: 'Nominal pembayaran tidak sesuai tagihan' });
        }

        // Nominal cocok — update status ke LUNAS
        databasePesanan[orderId].status = 'LUNAS';
        databasePesanan[orderId].paidAt = new Date().toISOString();

        console.log(`✅ Pesanan ${orderId} BERHASIL LUNAS!`);
        console.log(`💰 Nominal cocok: Rp ${nominalDibayar}`);
        console.log(`🔧 Status pesanan diubah menjadi "LUNAS"`);
        console.log('====================================\n');

        return res.status(200).json({
            status: 'success',
            message: 'Webhook berhasil diterima, pesanan diperbarui ke LUNAS'
        });

    } else {
        console.log(`❌ Pembayaran gagal atau pending untuk pesanan ${orderId}`);
        console.log('====================================\n');
        return res.status(400).json({ status: 'failed', message: 'Status bukan success' });
    }
});

// ============================================================
// BONUS — Endpoint cek status pesanan (untuk debugging)
// Contoh: GET http://localhost:3000/pesanan/CUCURUTUT-xxx
// ============================================================
app.get('/pesanan/:orderId', (req, res) => {
    const pesanan = databasePesanan[req.params.orderId];
    if (!pesanan) {
        return res.status(404).json({ sukses: false, pesan: 'Pesanan tidak ditemukan' });
    }
    res.json({ sukses: true, data: pesanan });
});

// Lihat semua pesanan (untuk debugging)
app.get('/semua-pesanan', (req, res) => {
    res.json({ sukses: true, total: Object.keys(databasePesanan).length, data: databasePesanan });
});

// ============================================================
// Menyalakan Server
// ============================================================
app.listen(PORT, () => {
    console.log(`\n🚀 Server berhasil berjalan di http://localhost:${PORT}`);
    console.log(`📦 Endpoint tersedia:`);
    console.log(`   POST http://localhost:${PORT}/cek-ongkir`);
    console.log(`   POST http://localhost:${PORT}/checkout`);
    console.log(`   POST http://localhost:${PORT}/webhook/taco`);
    console.log(`   GET  http://localhost:${PORT}/pesanan/:orderId`);
    console.log(`   GET  http://localhost:${PORT}/semua-pesanan\n`);
});