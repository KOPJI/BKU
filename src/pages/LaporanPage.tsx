import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ArrowUpDown, Ban, ChartBar, Calendar, FileDown, Loader, Printer } from 'lucide-react';
import { getTodayIndonesia, formatDateIndonesia } from '../utils/dateHelper';
import { formatRupiah } from '../utils/formatRupiah';

interface Transaksi {
  id: string;
  tanggal: string;
  keterangan: string;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
  createdBy: string;
}

type LaporanPeriod = 'harian' | 'mingguan' | 'bulanan' | 'semua';

interface PrintableReportProps {
  transaksi: Transaksi[];
  totalPemasukan: number;
  totalPengeluaran: number;
  selectedDate: string;
  periodeTampilan: LaporanPeriod;
}

const PrintableReport = ({ transaksi, totalPemasukan, totalPengeluaran, selectedDate, periodeTampilan }: PrintableReportProps) => {
  const getPeriodLabel = () => {
    const date = new Date(selectedDate);
    
    switch (periodeTampilan) {
      case 'harian':
        return formatDateIndonesia(selectedDate);
      case 'mingguan':
        const day = date.getDay();
        const sunday = new Date(date);
        sunday.setDate(date.getDate() - day);
        
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        
        return `${formatDateIndonesia(sunday.toISOString().split('T')[0])} - ${formatDateIndonesia(saturday.toISOString().split('T')[0])}`;
      case 'bulanan':
        return new Date(date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      default:
        return '';
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center mb-6">
        <img 
          src="/images/logo-karta-cup-v.png" 
          alt="KARTA CUP V Logo" 
          className="w-16 h-auto mr-4"
        />
        <div>
          <h1 className="text-2xl font-bold mb-2">Laporan Keuangan KARTA CUP V</h1>
          <p className="text-gray-600">Periode: {getPeriodLabel()}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="mb-1">Total Pemasukan: {formatRupiah(totalPemasukan)}</p>
        <p className="mb-1">Total Pengeluaran: {formatRupiah(totalPengeluaran)}</p>
        <p className="font-bold">Saldo: {formatRupiah(totalPemasukan - totalPengeluaran)}</p>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 bg-gray-50 text-left">Tanggal</th>
            <th className="border p-2 bg-gray-50 text-left">Keterangan</th>
            <th className="border p-2 bg-gray-50 text-left">Jenis</th>
            <th className="border p-2 bg-gray-50 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {transaksi.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">{formatDateIndonesia(item.tanggal)}</td>
              <td className="border p-2">{item.keterangan}</td>
              <td className="border p-2">{item.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</td>
              <td className="border p-2 text-right">
                <span className={item.jenis === 'pemasukan' ? 'text-green-600' : 'text-red-600'}>
                  {formatRupiah(item.jumlah)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 text-sm text-gray-500">
        Dicetak pada: {formatDateIndonesia(getTodayIndonesia())} pukul {new Date().toLocaleTimeString('id-ID')}
      </div>
    </div>
  );
};

const LaporanPage = () => {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState<LaporanPeriod>('harian');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIndonesia());
  const [summary, setSummary] = useState({
    totalPemasukan: 0,
    totalPengeluaran: 0,
    saldo: 0
  });

  const fetchTransaksi = async () => {
    if (!auth.currentUser) {
      setError('Anda harus login terlebih dahulu untuk mengakses data');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let startDate = new Date(selectedDate);
      let endDate = new Date(selectedDate);
      let startDateStr = '2000-01-01'; // default value untuk 'semua'
      let endDateStr = '2100-12-31';   // default value untuk 'semua'
      
      // Sesuaikan range tanggal berdasarkan periode
      if (currentPeriod === 'harian') {
        endDate.setHours(23, 59, 59, 999);
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
      } else if (currentPeriod === 'mingguan') {
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
      } else if (currentPeriod === 'bulanan') {
        startDate.setDate(1);
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
        startDateStr = startDate.toISOString().split('T')[0];
        endDateStr = endDate.toISOString().split('T')[0];
      }
      // Jika currentPeriod === 'semua', gunakan nilai default yang sudah diset

      try {
        const transaksiRef = collection(db, "transaksi");
        let q;
        
        if (currentPeriod === 'semua') {
          // Query tanpa filter tanggal untuk periode 'semua'
          q = query(
            transaksiRef,
            where("createdBy", "==", auth.currentUser.uid),
            orderBy("tanggal", "desc")
          );
        } else {
          // Query dengan filter tanggal untuk periode lainnya
          q = query(
            transaksiRef,
            where("createdBy", "==", auth.currentUser.uid),
            orderBy("tanggal", "desc"),
            where("tanggal", ">=", startDateStr),
            where("tanggal", "<=", endDateStr)
          );
        }

        const querySnapshot = await getDocs(q);
        await processQueryResults(querySnapshot, startDateStr, endDateStr);
      } catch (indexError: any) {
        if (indexError.code === 'failed-precondition' || indexError.message?.includes('requires an index')) {
          const transaksiRef = collection(db, "transaksi");
          const simpleQuery = query(
            transaksiRef,
            where("createdBy", "==", auth.currentUser.uid),
            orderBy("tanggal", "desc")
          );
          
          const querySnapshot = await getDocs(simpleQuery);
          await processQueryResults(querySnapshot, startDateStr, endDateStr, true);
        } else {
          throw indexError;
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Terjadi kesalahan saat memuat data');
      setTransaksi([]);
      setSummary({
        totalPemasukan: 0,
        totalPengeluaran: 0,
        saldo: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const processQueryResults = async (
    querySnapshot: any,
    startDateStr: string,
    endDateStr: string,
    filterManually: boolean = false
  ) => {
    const transaksiData: Transaksi[] = [];
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    if (querySnapshot.empty) {
      setTransaksi([]);
      setSummary({
        totalPemasukan: 0,
        totalPengeluaran: 0,
        saldo: 0
      });
      return;
    }

    querySnapshot.forEach((doc: any) => {
      const data = doc.data() as Transaksi;
      if (!data.tanggal || !data.jumlah || !data.jenis) {
        return; // Skip invalid data
      }

      // Jika filterManually true, filter data berdasarkan range tanggal
      if (filterManually) {
        if (data.tanggal < startDateStr || data.tanggal > endDateStr) {
          return;
        }
      }

      transaksiData.push({ ...data, id: doc.id });
      if (data.jenis === 'pemasukan') {
        totalPemasukan += data.jumlah;
      } else {
        totalPengeluaran += data.jumlah;
      }
    });

    setTransaksi(transaksiData);
    setSummary({
      totalPemasukan,
      totalPengeluaran,
      saldo: totalPemasukan - totalPengeluaran
    });
  };

  useEffect(() => {
    setSelectedDate(getTodayIndonesia());
    
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

  // Effect untuk memperbarui tanggal setiap kali halaman dibuka
  useEffect(() => {
    setSelectedDate(getTodayIndonesia());
  }, []);

  useEffect(() => {
    if (auth.currentUser) {
      fetchTransaksi();
    }
  }, [currentPeriod, selectedDate]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Laporan Keuangan KARTA CUP V</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          </head>
          <body>
            <div id="print-content">
              ${document.getElementById('printable-content')?.innerHTML || ''}
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
  
  const handleExportCSV = () => {
    // Create CSV content
    let csvContent = "Tanggal,Keterangan,Jenis,Jumlah\n";
    
    transaksi.forEach(item => {
      const tanggal = new Date(item.tanggal).toLocaleDateString('id-ID');
      const keterangan = item.keterangan.replace(/,/g, ' '); // Remove commas to avoid CSV issues
      const jenis = item.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
      const jumlah = item.jumlah;
      
      csvContent += `${tanggal},${keterangan},${jenis},${jumlah}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_${currentPeriod}_${selectedDate}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
          <p className="text-sm sm:text-base text-gray-600">Analisis data keuangan KARTA CUP V</p>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row gap-2 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrint}
            className="w-full sm:w-auto px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-medium rounded-md flex items-center justify-center"
          >
            <Printer size={16} className="mr-1" />
            Cetak
          </button>
          <button
            onClick={handleExportCSV}
            className="w-full sm:w-auto px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-medium rounded-md flex items-center justify-center"
          >
            <FileDown size={16} className="mr-1" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-center mb-4 sm:mb-6">
          <div className="mb-4 md:mb-0 md:mr-6 w-full sm:w-auto">
            <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Tanggal
            </label>
            <input
              type="date"
              id="date-picker"
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCurrentPeriod('harian')}
              className={`flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                currentPeriod === 'harian' 
                  ? 'bg-[#ff5722] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar size={16} className="mr-1 hidden sm:inline" />
              Harian
            </button>
            <button
              onClick={() => setCurrentPeriod('mingguan')}
              className={`flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                currentPeriod === 'mingguan' 
                  ? 'bg-[#ff5722] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChartBar size={16} className="mr-1 hidden sm:inline" />
              Mingguan
            </button>
            <button
              onClick={() => setCurrentPeriod('bulanan')}
              className={`flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                currentPeriod === 'bulanan' 
                  ? 'bg-[#ff5722] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChartBar size={16} className="mr-1 hidden sm:inline" />
              Bulanan
            </button>
            <button
              onClick={() => setCurrentPeriod('semua')}
              className={`flex-1 sm:flex-none flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md ${
                currentPeriod === 'semua' 
                  ? 'bg-[#ff5722] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChartBar size={16} className="mr-1 hidden sm:inline" />
              Semua
            </button>
          </div>
        </div>

        <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
          Laporan {currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)}: {formatDateIndonesia(selectedDate)}
        </h2>

        {/* Error display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 sm:p-4 mb-4 sm:mb-6 rounded text-sm sm:text-base">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8 sm:py-12">
            <Loader className="animate-spin h-6 w-6 sm:h-8 sm:w-8 text-[#ff5722]" />
            <span className="ml-2 text-sm sm:text-base text-gray-700">Memuat data laporan...</span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 sm:p-6 border-l-4 border-green-500 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-full bg-green-500 bg-opacity-10">
                    <ArrowUpDown className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-green-500">Total Pemasukan</p>
                    <h3 className="text-base sm:text-xl font-semibold text-gray-800">{formatRupiah(summary.totalPemasukan)}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 sm:p-6 border-l-4 border-red-500 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-full bg-red-500 bg-opacity-10">
                    <ArrowUpDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-red-500">Total Pengeluaran</p>
                    <h3 className="text-base sm:text-xl font-semibold text-gray-800">{formatRupiah(summary.totalPengeluaran)}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6 border-l-4 border-blue-500 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 rounded-full bg-blue-500 bg-opacity-10">
                    <ChartBar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-blue-500">Saldo</p>
                    <h3 className="text-base sm:text-xl font-semibold text-gray-800">{formatRupiah(summary.saldo)}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                {transaksi.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Keterangan
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Jenis
                        </th>
                        <th scope="col" className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Jumlah
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transaksi.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                            {formatDateIndonesia(item.tanggal)}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900">
                            {item.keterangan}
                          </td>
                          <td className="px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-center">
                            <span
                              className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                item.jenis === 'pemasukan'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {item.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                            </span>
                          </td>
                          <td className={`px-3 sm:px-6 py-2 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-right ${
                            item.jenis === 'pemasukan' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatRupiah(item.jumlah)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-6 sm:py-8 flex flex-col items-center justify-center text-gray-500">
                    <Ban size={24} className="mb-2 text-gray-400" />
                    <p className="text-sm sm:text-base">Tidak ada transaksi pada periode ini</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div id="printable-content" className="hidden">
        <PrintableReport 
          transaksi={transaksi}
          totalPemasukan={summary.totalPemasukan}
          totalPengeluaran={summary.totalPengeluaran}
          selectedDate={selectedDate}
          periodeTampilan={currentPeriod}
        />
      </div>
    </div>
  );
};

export default LaporanPage;
