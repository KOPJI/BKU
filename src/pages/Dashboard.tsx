import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ArrowUp10, CircleArrowDown, Loader, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Transaksi {
  id: string;
  tanggal: string;
  keterangan: string;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
}

const Dashboard = () => {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [totalPemasukan, setTotalPemasukan] = useState(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get latest transactions
        const q = query(collection(db, "transaksi"), orderBy("tanggal", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        
        const transaksiData: Transaksi[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          transaksiData.push({
            id: doc.id,
            tanggal: data.tanggal,
            keterangan: data.keterangan,
            jenis: data.jenis,
            jumlah: data.jumlah
          });
        });
        
        setTransaksi(transaksiData);
        
        // Calculate totals
        const qPemasukan = query(collection(db, "transaksi"), where("jenis", "==", "pemasukan"));
        const qPengeluaran = query(collection(db, "transaksi"), where("jenis", "==", "pengeluaran"));
        
        const pemasukanSnapshot = await getDocs(qPemasukan);
        const pengeluaranSnapshot = await getDocs(qPengeluaran);
        
        let totalMasuk = 0;
        let totalKeluar = 0;
        
        pemasukanSnapshot.forEach((doc) => {
          totalMasuk += doc.data().jumlah;
        });
        
        pengeluaranSnapshot.forEach((doc) => {
          totalKeluar += doc.data().jumlah;
        });
        
        setTotalPemasukan(totalMasuk);
        setTotalPengeluaran(totalKeluar);
        setSaldo(totalMasuk - totalKeluar);
      } catch (error) {
        console.error("Error mengambil data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format currency
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader className="animate-spin h-8 w-8 text-[#ff5722]" />
        <span className="ml-2 text-gray-700">Memuat data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center mb-6">
        <img 
          src="https://mocha-cdn.com/0195bfc4-06ff-71af-bb75-b8fd467c9d72/logo-karta-cup-v.png" 
          alt="KARTA CUP V Logo" 
          className="w-12 h-auto mr-3"
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard BKU KARTA CUP V</h1>
          <p className="text-gray-600">Ringkasan informasi keuangan Anda</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-500 bg-opacity-10">
              <ArrowUp10 className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-500">Total Pemasukan</p>
              <h3 className="text-xl font-semibold text-gray-800">{formatRupiah(totalPemasukan)}</h3>
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-500 bg-opacity-10">
              <CircleArrowDown className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-500">Total Pengeluaran</p>
              <h3 className="text-xl font-semibold text-gray-800">{formatRupiah(totalPengeluaran)}</h3>
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-500 bg-opacity-10">
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-500">Saldo</p>
              <h3 className="text-xl font-semibold text-gray-800">{formatRupiah(saldo)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Transaksi Terbaru</h2>
          <Link to="/transaksi" className="text-[#ff5722] hover:text-[#e64a19] text-sm font-medium">
            Lihat Semua
          </Link>
        </div>

        {transaksi.length > 0 ? (
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
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jenis
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transaksi.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900 whitespace-nowrap">
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {item.keterangan}
                    </td>
                    <td className="py-3 px-4 text-sm whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.jenis === 'pemasukan'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
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
          <div className="text-center py-8 text-gray-500">
            Belum ada transaksi tercatat
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
