# BKU (Buku Kas Umum) - KARTA CUP V

Aplikasi manajemen keuangan dan kwitansi untuk turnamen KARTA CUP V. Dibangun menggunakan React, TypeScript, dan Firebase.

## Fitur

- 📊 Dashboard dengan ringkasan keuangan
- 💰 Manajemen pemasukan dan pengeluaran
- 🧾 Pembuatan dan pencetakan kwitansi otomatis
- 📱 Responsif untuk semua ukuran layar
- 🔒 Sistem autentikasi pengguna
- 📄 Laporan keuangan
- 🖨️ Cetak kwitansi dengan fitur keamanan
- 🔍 Pencarian data transaksi dan kwitansi

## Teknologi

- React + TypeScript
- Firebase (Authentication & Firestore)
- Tailwind CSS
- Vite
- Lucide Icons

## Persyaratan Sistem

- Node.js versi 14 atau lebih tinggi
- NPM versi 6 atau lebih tinggi
- Web browser modern

## Instalasi

1. Clone repositori
```bash
git clone [url-repositori]
cd BKU
```

2. Install dependensi
```bash
npm install
```

3. Konfigurasi Firebase
- Buat proyek di Firebase Console
- Aktifkan Authentication dan Firestore
- Salin konfigurasi Firebase ke file `.env`

4. Jalankan aplikasi
```bash
npm run dev
```

## Struktur Proyek

```
BKU/
├── public/
│   └── images/         # Gambar statis (logo, tanda tangan, dll)
├── src/
│   ├── components/     # Komponen React yang dapat digunakan kembali
│   ├── pages/         # Halaman utama aplikasi
│   ├── firebase.ts    # Konfigurasi Firebase
│   └── App.tsx        # Komponen utama aplikasi
├── package.json
└── README.md
```

## Fitur Keamanan

- Autentikasi pengguna
- Validasi input
- Proteksi rute
- Fitur keamanan kwitansi:
  - Watermark
  - Micro text
  - Guilloche pattern
  - Serial number unik

## Penggunaan

1. Login menggunakan akun yang telah terdaftar
2. Akses fitur melalui menu navigasi:
   - Dashboard: Ringkasan keuangan
   - Pemasukan: Catat dan kelola pemasukan
   - Pengeluaran: Catat dan kelola pengeluaran
   - Kwitansi: Buat dan cetak kwitansi
   - Laporan: Lihat laporan keuangan

## Lisensi

Hak Cipta © 2025 KARTA CUP V. Seluruh hak dilindungi.

## Kontak

Untuk pertanyaan dan dukungan, silakan hubungi:
- Email: kartadesapangauban@gmail.com
- WhatsApp: 0852 1234 0232
