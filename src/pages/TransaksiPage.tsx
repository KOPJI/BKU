import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Plus, Search, Loader, Upload, Download } from 'lucide-react';

interface Transaksi {
  id: string;
  tanggal: string;
  keterangan: string;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
}

const TransaksiPage = () => {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
    jenis: 'pemasukan',
    jumlah: '',
  });
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransaksi = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "transaksi"), orderBy("tanggal", "desc"));
      const querySnapshot = await getDocs(q);
      
      const transaksiData: Transaksi[] = [];
      querySnapshot.forEach((doc) => {
        transaksiData.push({ id: doc.id, ...doc.data() } as Transaksi);
      });
      
      setTransaksi(transaksiData);
    } catch (error) {
      // Error handling tanpa console log
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransaksi();
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
    setError('');
    setSubmitLoading(true);

    if (!formData.keterangan || !formData.jumlah) {
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

      const transaksiData = {
        tanggal: formData.tanggal,
        keterangan: formData.keterangan,
        jenis: formData.jenis,
        jumlah: numericJumlah,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "transaksi"), transaksiData);
      setFormData({
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: '',
        jenis: 'pemasukan',
        jumlah: '',
      });
      setIsFormOpen(false);
      await fetchTransaksi();
    } catch (error) {
      // Error handling tanpa console log
      setError('Gagal menyimpan transaksi. Silakan coba lagi.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const filteredTransaksi = transaksi.filter(item => 
    item.keterangan.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatRupiah(item.jumlah).includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Buku Kas Umum</h1>
          <p className="text-gray-600">Kelola semua transaksi keuangan</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="btn-primary mt-4 sm:mt-0 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Tambah Transaksi
        </button>
      </div>

      {/* Search bar */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-[#ff5722] sm:text-sm"
            placeholder="Cari transaksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Tambah Transaksi Baru</h2>
            
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
                <label htmlFor="keterangan" className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan
                </label>
                <textarea
                  id="keterangan"
                  name="keterangan"
                  value={formData.keterangan}
                  onChange={handleInputChange}
                  className="input-field"
                  rows={3}
                  required
                  placeholder="Masukkan keterangan transaksi"
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label htmlFor="jenis" className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Transaksi
                </label>
                <select
                  id="jenis"
                  name="jenis"
                  value={formData.jenis}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                >
                  <option value="pemasukan">Pemasukan</option>
                  <option value="pengeluaran">Pengeluaran</option>
                </select>
              </div>
              
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
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="btn-primary"
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
          <span className="ml-2 text-gray-700">Memuat data transaksi...</span>
        </div>
      ) : (
        <div className="card">
          {filteredTransaksi.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keterangan
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jenis
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
                        {item.keterangan}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        {item.jenis === 'pemasukan' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Upload size={14} className="mr-1" />
                            Pemasukan
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <Download size={14} className="mr-1" />
                            Pengeluaran
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-sm text-right whitespace-nowrap font-medium ${
                        item.jenis === 'pemasukan' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatRupiah(item.jumlah)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'Tidak ada transaksi yang cocok dengan pencarian' : 'Belum ada transaksi tercatat'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TransaksiPage;
