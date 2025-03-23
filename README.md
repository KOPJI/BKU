# BKU KARTA CUP V

Aplikasi Buku Kas Umum Digital untuk KARTA CUP V - Sebuah aplikasi web untuk mengelola keuangan turnamen sepak bola.

## 🌟 Fitur Utama

- 💰 Pencatatan Pemasukan dan Pengeluaran
- 📊 Dashboard dengan Grafik Keuangan
- 📄 Pembuatan Laporan Keuangan
- 🧾 Pembuatan Kwitansi Digital
- 📝 Tanda Terima Wasit Digital
- 🔒 Sistem Autentikasi
- 📱 Progressive Web App (PWA)
- 🎨 Tampilan Responsif

## 🛠️ Teknologi yang Digunakan

- React + TypeScript
- Vite
- Firebase (Authentication & Firestore)
- TailwindCSS
- Recharts
- PWA

## 📋 Prasyarat

Sebelum memulai, pastikan Anda telah menginstal:

- Node.js (versi 14 atau lebih baru)
- npm atau yarn
- Git

## 🚀 Cara Menjalankan Aplikasi

1. Clone repository
```bash
git clone https://github.com/KOPJI/BKU.git
cd BKU
```

2. Instal dependensi
```bash
npm install
```

3. Salin file `.env.example` menjadi `.env` dan isi dengan konfigurasi Firebase Anda
```bash
cp .env.example .env
```

4. Jalankan aplikasi dalam mode development
```bash
npm run dev
```

5. Buka browser dan akses `http://localhost:5173`

## 📦 Build untuk Production

```bash
npm run build
```

## 🌐 Deploy

Aplikasi ini dikonfigurasi untuk di-deploy ke Vercel. Untuk melakukan deploy:

1. Push kode ke repository GitHub
2. Hubungkan repository dengan Vercel
3. Tambahkan environment variables di dashboard Vercel
4. Deploy!

## 📱 Fitur PWA

Aplikasi ini mendukung Progressive Web App (PWA) dengan fitur:
- Dapat diinstal di perangkat
- Dapat diakses offline
- Update otomatis
- Responsif di semua perangkat

## 🔐 Keamanan

- Autentikasi menggunakan Firebase Auth
- Enkripsi data sensitif
- Validasi input
- Proteksi rute
- Manajemen sesi

## 👥 Tim Pengembang

- KOPJI Developer Team

## 📄 Lisensi

Hak Cipta © 2025 KARTA CUP V. Seluruh hak cipta dilindungi undang-undang.
