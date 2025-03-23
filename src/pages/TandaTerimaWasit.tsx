import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getTodayIndonesia, formatDateIndonesia } from '../utils/dateHelper';
import { formatRupiah } from '../utils/formatRupiah';
import { terbilang } from '../utils/terbilang';
import { Printer, Loader, Ban } from 'lucide-react';

interface FormData {
  nomorKwitansi: string;
  tanggal: string;
  namaWasit: string;
  jumlah: number;
}

interface TandaTerima {
  id: string;
  nomorKwitansi: string;
  tanggal: string;
  namaWasit: string;
  jumlah: number;
  createdAt: string;
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
  const [daftarTandaTerima, setDaftarTandaTerima] = useState<TandaTerima[]>([]);
  const [loadingDaftar, setLoadingDaftar] = useState(true);

  useEffect(() => {
    generateNomorKwitansi();
    fetchDaftarTandaTerima();
  }, []);

  const fetchDaftarTandaTerima = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error('Anda harus login terlebih dahulu');
      }

      const tandaTerimaRef = collection(db, 'tandaTerimaWasit');
      let tandaTerima: TandaTerima[] = [];

      try {
        // Mencoba query dengan pengurutan
        const q = query(
          tandaTerimaRef,
          where('createdBy', '==', auth.currentUser.uid),
          orderBy('tanggal', 'desc')
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          tandaTerima.push({
            id: doc.id,
            ...doc.data()
          } as TandaTerima);
        });
      } catch (indexError: any) {
        // Jika index belum dibuat, tampilkan pesan error yang lebih informatif
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('requires an index')) {
          setError(
            'Diperlukan pengaturan index di Firebase. Silakan klik link berikut untuk membuat index: ' +
            (indexError.message?.match(/https:\/\/console\.firebase\.google\.com\/[^\s]*/)?.[0] || '')
          );
          
          // Gunakan query sederhana tanpa pengurutan sebagai fallback
          const simpleQuery = query(
            tandaTerimaRef,
            where('createdBy', '==', auth.currentUser.uid)
          );
          const querySnapshot = await getDocs(simpleQuery);
          querySnapshot.forEach((doc) => {
            tandaTerima.push({
              id: doc.id,
              ...doc.data()
            } as TandaTerima);
          });
          // Urutkan data secara manual
          tandaTerima.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
        } else {
          throw indexError;
        }
      }

      setDaftarTandaTerima(tandaTerima);
    } catch (err: any) {
      console.error('Error fetching tanda terima:', err);
      setError('Gagal memuat daftar tanda terima');
    } finally {
      setLoadingDaftar(false);
    }
  };

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

      // Simpan ke koleksi tandaTerimaWasit
      await addDoc(collection(db, 'tandaTerimaWasit'), {
        ...formData,
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });

      // Simpan ke koleksi transaksi sebagai pengeluaran
      await addDoc(collection(db, 'transaksi'), {
        tanggal: formData.tanggal,
        keterangan: `Honor Wasit - ${formData.namaWasit}`,
        jenis: 'pengeluaran',
        kategori: 'Bayar Wasit',
        jumlah: formData.jumlah,
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        nomorKwitansi: formData.nomorKwitansi
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
      
      // Refresh daftar tanda terima
      fetchDaftarTandaTerima();
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
                <div class="text-center relative">
                  <p class="mt-6">Penyetor</p>
                  <img src="/images/ttd-panitia.png" alt="Tanda Tangan Panitia" class="w-32 h-auto absolute left-4 top-14"/>
                  <p class="mt-16 font-semibold">Panitia KARTA CUP V</p>
                </div>

                <div class="text-center">
                  <p>Pangauban ${formatDateIndonesia(formData.tanggal)}</p>
                  <p>Penerima</p>
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

  const handlePrintItem = (item: TandaTerima) => {
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
                  <p class="text-gray-600">No: ${item.nomorKwitansi}</p>
                </div>
              </div>

              <div class="mb-8">
                <div class="border-b pb-4">
                  <p class="mb-1">Telah diterima dari:</p>
                  <p class="font-semibold text-lg">Panitia KARTA CUP V</p>
                </div>

                <div class="border-b py-4">
                  <p class="mb-1">Uang Sejumlah:</p>
                  <p class="font-semibold text-lg">${formatRupiah(item.jumlah)}</p>
                  <p class="text-gray-600 text-sm italic">Terbilang: ${terbilang(item.jumlah)} rupiah</p>
                </div>

                <div class="border-b py-4">
                  <p class="mb-1">Untuk Pembayaran:</p>
                  <p class="font-semibold">Honor Wasit Utama Turnamen Sepak Bola Karta Cup V</p>
                </div>
              </div>

              <div class="flex justify-between mt-8">
                <div class="text-center relative">
                  <p class="mt-6">Penyetor</p>
                  <img src="/images/ttd-panitia.png" alt="Tanda Tangan Panitia" class="w-32 h-auto absolute left-4 top-14"/>
                  <p class="mt-16 font-semibold">Panitia KARTA CUP V</p>
                </div>

                <div class="text-center">
                  <p>Pangauban ${formatDateIndonesia(item.tanggal)}</p>
                  <p>Penerima</p>
                  <p class="mt-16 font-semibold">Wasit ${item.namaWasit}</p>
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
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2 sm:mb-0">Tanda Terima Wasit</h1>
          <button
            onClick={() => handlePrint()}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center sm:justify-start"
            disabled={loading}
          >
            <Printer className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Preview
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm sm:text-base">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 sm:p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm sm:text-base">
            Tanda terima berhasil disimpan dan dicetak!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Nomor Kwitansi
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                value={formData.nomorKwitansi}
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Tanggal
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.tanggal}
                onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Nama Wasit
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.namaWasit}
                onChange={(e) => setFormData({ ...formData, namaWasit: e.target.value })}
                placeholder="Masukkan nama wasit"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Jumlah Honor
              </label>
              <input
                type="number"
                required
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.jumlah || ''}
                onChange={(e) => setFormData({ ...formData, jumlah: parseInt(e.target.value) || 0 })}
                placeholder="Masukkan jumlah honor"
              />
              {formData.jumlah > 0 && (
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  Terbilang: {terbilang(formData.jumlah)} rupiah
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2 bg-[#ff5722] text-white rounded-lg hover:bg-[#f4511e] flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan & Cetak'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Daftar Tanda Terima */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
          Daftar Tanda Terima Wasit
        </h2>

        {loadingDaftar ? (
          <div className="flex justify-center items-center py-6 sm:py-8">
            <Loader className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-[#ff5722]" />
            <span className="ml-2 text-sm sm:text-base text-gray-700">Memuat data...</span>
          </div>
        ) : daftarTandaTerima.length > 0 ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Nomor Kwitansi
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Nama Wasit
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah Honor
                    </th>
                    <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {daftarTandaTerima.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                        {item.nomorKwitansi}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {formatDateIndonesia(item.tanggal)}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900">
                        {item.namaWasit}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right font-medium text-gray-900">
                        {formatRupiah(item.jumlah)}
                      </td>
                      <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center">
                        <button
                          onClick={() => handlePrintItem(item)}
                          className="inline-flex items-center px-2 sm:px-3 py-1 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          Cetak
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <Ban className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
            <h3 className="mt-2 text-sm sm:text-base font-medium text-gray-900">Belum ada data</h3>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Belum ada tanda terima wasit yang dibuat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TandaTerimaWasit; 