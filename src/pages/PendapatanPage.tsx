import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CircleAlert, CirclePlus, Loader, Search } from 'lucide-react';

interface Transaksi {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori?: string;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
}

// Kategori pendapatan
const kategoriPendapatan = [
  'sponsor',
  'donasi',
  'kopi',
  'tiket dan parkir',
  'iuran warung',
  'kartu merah dan kuning',
  'lainnya'
];

const PendapatanPage = () => {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kategori: kategoriPendapatan[0],
    keteranganLainnya: '',
    jenis: 'pemasukan',
    jumlah: '',
  });
  const [error, setError] = useState('');
  const [indexError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPendapatan, setTotalPendapatan] = useState(0);

  const fetchTransaksi = async () => {
    if (!auth.currentUser) {
      // Error handling tanpa console log
      return;
    }

    setLoading(true);
    try {
      // Query untuk mendapatkan transaksi
      let transaksiData: Transaksi[] = [];
      
      try {
        const q = query(
          collection(db, "transaksi"),
          where("jenis", "==", "pemasukan"),
          orderBy("tanggal", "desc"),
          orderBy("__name__", "desc")
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          transaksiData.push({ id: doc.id, ...doc.data() } as Transaksi);
        });
      } catch (indexErr: any) {
        // Fallback query tanpa index
        const q = query(
          collection(db, "transaksi"),
          where("jenis", "==", "pemasukan")
        );
        const querySnapshot = await getDocs(q);
        transaksiData = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Transaksi))
          .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      }

      setTransaksi(transaksiData);
      
      // Hitung total
      const total = transaksiData.reduce((sum, t) => sum + t.jumlah, 0);
      setTotalPendapatan(total);
    } catch (error) {
      // Error handling tanpa console log
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchTransaksi();
      } else {
        setLoading(false);
        setError('Anda harus login terlebih dahulu untuk mengakses data');
      }
    });
    
    return () => unsubscribe();
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
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    const kategori = formData.kategori;
    // Generate keterangan based on kategori
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
      // Verify user is authenticated
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
        jenis: "pemasukan",
        jumlah: numericJumlah,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({
        tanggal: new Date().toISOString().split('T')[0],
        kategori: kategoriPendapatan[0],
        keteranganLainnya: '',
        jenis: 'pemasukan',
        jumlah: '',
      });
      
      setIsFormOpen(false);
      fetchTransaksi(); // Refresh data
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Pendapatan</h1>
          <p className="text-gray-600">Kelola semua transaksi pendapatan</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary mt-4 sm:mt-0 flex items-center"
        >
          <CirclePlus size={20} className="mr-2" />
          Tambah Pendapatan
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* Index Error Warning */}
      {indexError && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-800 p-4 mb-6 rounded flex">
          <CircleAlert className="h-6 w-6 mr-3 flex-shrink-0" />
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
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-[#ff5722] sm:text-sm"
            placeholder="Cari pendapatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md my-8">
            <h2 className="text-xl font-semibold mb-4">Tambah Pendapatan Baru</h2>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
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
                  className="input-field"
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
                  className="input-field"
                  required
                >
                  {kategoriPendapatan.map((kat) => (
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
                    className="input-field"
                    required={formData.kategori === 'lainnya'}
                    placeholder="Masukkan keterangan pendapatan"
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
                  className="input-field"
                  required
                  placeholder="Contoh: 100000"
                />
              </div>
              
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 w-full sm:w-auto"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="btn-primary w-full sm:w-auto"
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
        <div className="flex justify-center items-center py-12">
          <Loader className="animate-spin h-8 w-8 text-[#ff5722]" />
          <span className="ml-2 text-gray-700">Memuat data pendapatan...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Total Pendapatan Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Total Pendapatan</h2>
            <p className="text-2xl font-bold text-green-600">{formatRupiah(totalPendapatan)}</p>
          </div>

          <div className="card overflow-hidden">
            {filteredTransaksi.length > 0 ? (
              <div className="overflow-x-auto -mx-6 -my-4 sm:mx-0 sm:my-0">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Keterangan
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTransaksi.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900 whitespace-nowrap">
                          {new Date(item.tanggal).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {item.kategori || 'Umum'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {item.keterangan}
                        </td>
                        <td className="py-3 px-4 text-sm text-right whitespace-nowrap font-medium text-green-600">
                          {formatRupiah(item.jumlah)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'Tidak ada pendapatan yang cocok dengan pencarian' : 'Belum ada pendapatan tercatat'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PendapatanPage;
