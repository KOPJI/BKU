import { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getTodayIndonesia, formatDateIndonesia } from '../utils/dateHelper';
import { formatRupiah } from '../utils/formatRupiah';
import { terbilang } from '../utils/terbilang';
import { Printer, Loader } from 'lucide-react';

interface FormData {
  nomorKwitansi: string;
  tanggal: string;
  namaWasit: string;
  jumlah: number;
}

const TandaTerimaWasit = () => {
  const [formData, setFormData] = useState<FormData>({
    nomorKwitansi: '',
    tanggal: getTodayIndonesia(),
    namaWasit: '',
    jumlah: 0
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    generateNomorKwitansi();
  }, []);

  const generateNomorKwitansi = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      // Generate random 3 digit number
      const randomNum = Math.floor(Math.random() * 900) + 100; // Generates number between 100-999
      const newNomorKwitansi = `W-${randomNum}/KARTACUP/2025`;
      
      setFormData(prev => ({
        ...prev,
        nomorKwitansi: newNomorKwitansi
      }));

    } catch (err: any) {
      console.error('Error generating nomor kwitansi:', err);
      // Jika terjadi error, gunakan format default dengan timestamp
      const timestamp = new Date().getTime();
      const fallbackNumber = timestamp.toString().slice(-3);
      const fallbackNomorKwitansi = `W-${fallbackNumber}/KARTACUP/2025`;
      
      setFormData(prev => ({
        ...prev,
        nomorKwitansi: fallbackNomorKwitansi
      }));

      if (err.code === 'permission-denied') {
        setError('Mohon tunggu sebentar, sedang memuat data...');
        // Coba lagi setelah 2 detik
        setTimeout(() => {
          generateNomorKwitansi();
        }, 2000);
      } else {
        setError('Menggunakan nomor kwitansi alternatif karena terjadi kesalahan sistem');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (!auth.currentUser) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      await addDoc(collection(db, 'tandaTerimaWasit'), {
        ...formData,
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      handlePrint();
      
      // Reset form dan generate nomor baru
      setFormData({
        nomorKwitansi: '',
        tanggal: getTodayIndonesia(),
        namaWasit: '',
        jumlah: 0
      });
      generateNomorKwitansi();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Generate unique document ID with timestamp and random string
    const timestamp = new Date().getTime();
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const uniqueDocId = `TRW-${timestamp}-${randomStr}`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Tanda Terima Wasit - KARTA CUP V</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @media print {
                body {
                  padding: 20px;
                }
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="max-w-2xl mx-auto p-8 bg-white">
              <div class="flex items-center justify-between mb-6">
                <img src="/images/logo-karta-cup-v.png" alt="KARTA CUP V Logo" class="w-24 h-auto"/>
                <div class="text-right">
                  <h2 class="text-xl font-bold">TANDA TERIMA</h2>
                  <p class="text-gray-600">No: ${formData.nomorKwitansi}</p>
                </div>
              </div>

              <div class="mb-8">
                <div class="border-b pb-4">
                  <p class="mb-1">Telah diterima dari:</p>
                  <p class="font-semibold text-lg">Panitia KARTA CUP V</p>
                </div>

                <div class="border-b py-4">
                  <p class="mb-1">Uang Sejumlah:</p>
                  <p class="font-semibold text-lg">${formatRupiah(formData.jumlah)}</p>
                  <p class="text-gray-600 text-sm italic">Terbilang: ${terbilang(formData.jumlah)} rupiah</p>
                </div>

                <div class="border-b py-4">
                  <p class="mb-1">Untuk Pembayaran:</p>
                  <p class="font-semibold">Honor Wasit Utama Turnamen Sepak Bola Karta Cup V</p>
                </div>
              </div>

              <div class="flex justify-between mt-8">
                <div class="text-center">
                  <p>Penyetor,</p>
                  <img src="/images/ttd-panitia.png" alt="Tanda Tangan Panitia" class="w-24 h-auto my-4"/>
                  <p class="font-semibold">Panitia KARTA CUP V</p>
                </div>

                <div class="text-center">
                  <p>Pangauban, ${formatDateIndonesia(formData.tanggal)}</p>
                  <p>Penerima,</p>
                  <p class="mt-16 font-semibold">Wasit ${formData.namaWasit}</p>
                </div>
              </div>

              <div class="mt-8 text-xs text-gray-500 text-center">
                <p>KARTA CUP V - 2025</p>
                <p>Dokumen ID: ${uniqueDocId}</p>
              </div>
            </div>
            <script>
              window.onload = () => {
                window.print();
                window.onafterprint = () => window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tanda Terima Wasit</h1>
          <button
            onClick={() => handlePrint()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            disabled={loading}
          >
            <Printer className="w-5 h-5 mr-2" />
            Preview
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
            Tanda terima berhasil disimpan dan dicetak!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor Kwitansi
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                value={formData.nomorKwitansi}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tanggal
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Wasit
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.namaWasit}
                onChange={(e) => setFormData({ ...formData, namaWasit: e.target.value })}
                placeholder="Masukkan nama wasit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah Honor
              </label>
              <input
                type="number"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.jumlah || ''}
                onChange={(e) => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 0 })}
                placeholder="Masukkan jumlah honor"
              />
              {formData.jumlah > 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  Terbilang: {terbilang(formData.jumlah)} rupiah
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#ff5722] text-white rounded-lg hover:bg-[#f4511e] flex items-center"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan & Cetak'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TandaTerimaWasit; 