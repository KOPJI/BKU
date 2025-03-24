import { useState, useEffect } from 'react';
import { collection, query, orderBy, addDoc, serverTimestamp, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AlertCircle, Plus, Search, Loader } from 'lucide-react';
import { getTodayIndonesia, formatDateIndonesia } from '../utils/dateHelper';

interface Transaksi {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori?: string;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
}

// Kategori pengeluaran
const kategoriPengeluaran = [
  'beli kopi',
  'operasional',
  'perlengkapan',
  'konsumsi',
  'transportasi',
  'izin keramaian',
  'kemanan harian',
  'bayar wasit',
  'bayar warung',
  'bayar anak gawang',
  'lainnya'
];

const PengeluaranPage = () => {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: getTodayIndonesia(),
    kategori: kategoriPengeluaran[0],
    keteranganLainnya: '',
    jenis: 'pengeluaran',
    jumlah: '',
  });
  const [error, setError] = useState('');
  const [indexError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Setup realtime listener
        const setupRealtimeListener = () => {
          try {
            const q = query(
              collection(db, "transaksi"),
              where("jenis", "==", "pengeluaran"),
              orderBy("tanggal", "desc"),
              orderBy("__name__", "desc")
            );

            const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
              const transaksiData: Transaksi[] = [];
              querySnapshot.forEach((doc) => {
                transaksiData.push({ id: doc.id, ...doc.data() } as Transaksi);
              });
              setTransaksi(transaksiData);
              
              // Hitung total
              const total = transaksiData.reduce((sum, t) => sum + t.jumlah, 0);
              setTotalPengeluaran(total);
              setLoading(false);
            }, (_) => {
              // Handle error dengan fallback query
              const fallbackQuery = query(
                collection(db, "transaksi"),
                where("jenis", "==", "pengeluaran")
              );

              const unsubscribeFallback = onSnapshot(fallbackQuery, (snapshot) => {
                const transaksiData = snapshot.docs
                  .map(doc => ({ id: doc.id, ...doc.data() } as Transaksi))
                  .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
                
                setTransaksi(transaksiData);
                const total = transaksiData.reduce((sum, t) => sum + t.jumlah, 0);
                setTotalPengeluaran(total);
                setLoading(false);
              });

              return () => unsubscribeFallback();
            });

            return unsubscribeSnapshot;
          } catch (error) {
            setLoading(false);
            return () => {};
          }
        };

        const unsubscribeFirestore = setupRealtimeListener();
        return () => {
          unsubscribeFirestore();
        };
      } else {
        setLoading(false);
        setError('Anda harus login terlebih dahulu untuk mengakses data');
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Effect untuk memperbarui tanggal saat form dibuka
  useEffect(() => {
    if (isFormOpen) {
      setFormData(prev => ({
        ...prev,
        tanggal: getTodayIndonesia()
      }));
    }
  }, [isFormOpen]);

  // Effect untuk memperbarui tanggal saat komponen dimount
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      tanggal: getTodayIndonesia()
    }));
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'jumlah') {
      // Hapus semua karakter non-digit
      const numericValue = value.replace(/[^\d]/g, '');
      
      // Format dengan titik sebagai pemisah ribuan
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      
      setFormData({
        ...formData,
        [name]: formattedValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    const kategori = formData.kategori;
    let keterangan = kategori;
    if (kategori === 'lainnya' && formData.keteranganLainnya) {
      keterangan = formData.keteranganLainnya;
    }

    if (!kategori || (kategori === 'lainnya' && !formData.keteranganLainnya) || !formData.jumlah) {
      setError('Semua field wajib diisi');
      setSubmitLoading(false);
      return;
    }

    try {
      if (!auth.currentUser) {
        setError('Sesi login telah berakhir. Silakan login kembali.');
        setSubmitLoading(false);
        return;
      }

      const numericJumlah = parseFloat(formData.jumlah.replace(/[^\d]/g, ''));
      
      if (isNaN(numericJumlah) || numericJumlah <= 0) {
        setError('Jumlah harus berupa angka positif');
        setSubmitLoading(false);
        return;
      }

      await addDoc(collection(db, "transaksi"), {
        tanggal: formData.tanggal,
        keterangan: keterangan,
        kategori: kategori,
        jenis: "pengeluaran",
        jumlah: numericJumlah,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({
        tanggal: getTodayIndonesia(),
        kategori: kategoriPengeluaran[0],
        keteranganLainnya: '',
        jenis: 'pengeluaran',
        jumlah: '',
      });
      
      setIsFormOpen(false);
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission-denied')) {
        setError('Anda tidak memiliki izin untuk menambahkan transaksi. Silakan login ulang atau hubungi administrator.');
      } else {
        setError('Gagal menyimpan transaksi. Silakan coba lagi.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredTransaksi = transaksi.filter(item => 
    item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.kategori && item.kategori.toLowerCase().includes(searchQuery.toLowerCase())) ||
    formatRupiah(item.jumlah).includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Data Pengeluaran</h1>
          <p className="text-sm sm:text-base text-gray-600">Kelola semua transaksi pengeluaran</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full sm:w-auto mt-3 sm:mt-0 px-3 py-2 bg-[#ff5722] text-white rounded-lg hover:bg-[#f4511e] flex items-center justify-center text-sm sm:text-base"
        >
          <Plus size={16} className="mr-2" />
          Tambah Pengeluaran
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 sm:p-4 mb-4 sm:mb-6 rounded text-sm sm:text-base">
          <p>{error}</p>
        </div>
      )}

      {/* Index Error Warning */}
      {indexError && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-3 sm:p-4 mb-4 sm:mb-6 rounded flex text-sm sm:text-base">
          <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium">Perhatian: Dibutuhkan Indeks Database</p>
            <p className="mt-1">Data mungkin tidak lengkap karena membutuhkan pengaturan indeks Firestore.</p>
            <p className="mt-1">
              <a 
                href={indexError} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-amber-800 underline font-medium hover:text-amber-900"
              >
                Klik disini untuk membuat indeks yang dibutuhkan
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-[#ff5722]"
            placeholder="Cari pengeluaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md my-4 sm:my-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Tambah Pengeluaran Baru</h2>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 sm:p-4 mb-4 rounded text-sm sm:text-base">
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="tanggal" className="block text-sm font-medium text-gray-700 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  id="tanggal"
                  name="tanggal"
                  value={formData.tanggal}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-[#ff5722]"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="kategori" className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  id="kategori"
                  name="kategori"
                  value={formData.kategori}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-[#ff5722]"
                  required
                >
                  {kategoriPengeluaran.map((kat) => (
                    <option key={kat} value={kat}>
                      {kat.charAt(0).toUpperCase() + kat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              {formData.kategori === 'lainnya' && (
                <div className="mb-4">
                  <label htmlFor="keteranganLainnya" className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan Lainnya
                  </label>
                  <input
                    type="text"
                    id="keteranganLainnya"
                    name="keteranganLainnya"
                    value={formData.keteranganLainnya}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-[#ff5722]"
                    required={formData.kategori === 'lainnya'}
                    placeholder="Masukkan keterangan pengeluaran"
                  />
                </div>
              )}
              
              <div className="mb-6">
                <label htmlFor="jumlah" className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah (Rp)
                </label>
                <input
                  type="text"
                  id="jumlah"
                  name="jumlah"
                  value={formData.jumlah}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-[#ff5722]"
                  required
                  placeholder="Contoh: 100.000"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 order-2 sm:order-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-[#ff5722] text-white rounded-lg hover:bg-[#f4511e] text-sm font-medium order-1 sm:order-2"
                >
                  {submitLoading ? (
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-8 sm:py-12">
          <Loader className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-[#ff5722]" />
          <span className="ml-2 text-sm sm:text-base text-gray-700">Memuat data pengeluaran...</span>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Total Pengeluaran Card */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">Total Pengeluaran</h2>
            <p className="text-xl sm:text-2xl font-bold text-red-600">{formatRupiah(totalPengeluaran)}</p>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filteredTransaksi.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Keterangan
                      </th>
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-right text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransaksi.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                          {formatDateIndonesia(item.tanggal)}
                        </td>
                        <td className="py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm text-gray-900">
                          {item.kategori || 'Umum'}
                        </td>
                        <td className="py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm text-gray-900">
                          {item.keterangan}
                        </td>
                        <td className="py-2 px-3 sm:py-3 sm:px-4 text-xs sm:text-sm text-right whitespace-nowrap font-medium text-red-600">
                          {formatRupiah(item.jumlah)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="text-gray-500 text-sm sm:text-base">
                  {searchQuery ? 'Tidak ada pengeluaran yang cocok dengan pencarian' : 'Belum ada pengeluaran tercatat'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PengeluaranPage;
