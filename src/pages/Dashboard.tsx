import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, where, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ArrowUp10, CircleArrowDown, Loader, TrendingUp, Ban, Printer } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { getTodayIndonesia, formatDateIndonesia } from '../utils/dateHelper';
import { formatRupiah } from '../utils/formatRupiah';
import { startOfWeek, endOfWeek } from 'date-fns';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { TooltipProps } from 'recharts';

interface Transaksi {
  id: string;
  tanggal: string;
  keterangan: string;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
  createdBy: string;
}

interface ChartData {
  name: string;
  pemasukan: number;
  pengeluaran: number;
}

type PeriodeTampilan = 'harian' | 'mingguan' | 'bulanan';

interface PrintableReportProps {
  transaksi: Transaksi[];
  totalPemasukan: number;
  totalPengeluaran: number;
  selectedDate: string;
  periodeTampilan: PeriodeTampilan;
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
  }>;
  label?: string;
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

const Dashboard = () => {
  const [totalPemasukan, setTotalPemasukan] = useState(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [transaksiData, setTransaksiData] = useState<Transaksi[]>([]);
  const [periodeTampilan, setPeriodeTampilan] = useState<PeriodeTampilan>('harian');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIndonesia());
  const [totalPendapatan, setTotalPendapatan] = useState(0);

    const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (!auth.currentUser) {
        setError('Anda harus login terlebih dahulu untuk mengakses data');
        setLoading(false);
        return;
      }

      let startDate = new Date(selectedDate);
      let endDate = new Date(selectedDate);
      
      // Sesuaikan range tanggal berdasarkan periode
      if (periodeTampilan === 'harian') {
        endDate.setHours(23, 59, 59, 999);
      } else if (periodeTampilan === 'mingguan') {
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day); // Ke hari Minggu
        endDate.setDate(startDate.getDate() + 6); // Ke hari Sabtu
        endDate.setHours(23, 59, 59, 999);
      } else if (periodeTampilan === 'bulanan') {
        startDate.setDate(1); // Hari pertama bulan
        endDate.setMonth(endDate.getMonth() + 1, 0); // Hari terakhir bulan
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Format tanggal untuk query Firestore
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      try {
        // Coba query dengan composite index terlebih dahulu
        const transaksiRef = collection(db, "transaksi");
        const q = query(
          transaksiRef,
          where("createdBy", "==", auth.currentUser.uid),
          orderBy("tanggal", "desc"),
          where("tanggal", ">=", startDateStr),
          where("tanggal", "<=", endDateStr)
        );
        
        const querySnapshot = await getDocs(q);
        await processQueryResults(querySnapshot, startDateStr, endDateStr);
      } catch (indexError: any) {
        // Jika terjadi error karena index, gunakan query sederhana dengan filter manual
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
      if (error.code === 'permission-denied') {
        setError('Anda tidak memiliki akses untuk melihat data ini');
      } else if (error.code === 'failed-precondition') {
        setError('Terjadi kesalahan pada pengaturan database');
      } else if (error.code === 'unavailable') {
        setError('Koneksi ke server terputus. Periksa koneksi internet Anda');
      } else {
        setError('Gagal memuat data. Silakan coba lagi nanti');
      }
      // Reset data jika terjadi error
      setChartData([]);
      setTotalPemasukan(0);
      setTotalPengeluaran(0);
      setSaldo(0);
    } finally {
      setLoading(false);
    }
  };

  const processQueryResults = async (
    querySnapshot: QuerySnapshot<DocumentData>,
    startDateStr: string,
    endDateStr: string,
    filterManually: boolean = false
  ) => {
        const transaksiData: Transaksi[] = [];
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    if (querySnapshot.empty) {
      setChartData([]);
      setTotalPemasukan(0);
      setTotalPengeluaran(0);
      setSaldo(0);
      return;
    }

        querySnapshot.forEach((doc) => {
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

    setTotalPemasukan(totalPemasukan);
    setTotalPengeluaran(totalPengeluaran);
    setSaldo(totalPemasukan - totalPengeluaran);

    const processedChartData = processChartData(transaksiData, periodeTampilan);
    setChartData(processedChartData);
    setTransaksiData(transaksiData);
    setTotalPendapatan(totalPemasukan);
  };

  const processChartData = (data: Transaksi[], periode: PeriodeTampilan): ChartData[] => {
    const groupedData = new Map<string, { pemasukan: number; pengeluaran: number }>();
    
    data.forEach((item) => {
      const date = new Date(item.tanggal);
      let key = '';
      
      switch (periode) {
        case 'harian':
          key = formatDateIndonesia(date);
          break;
        case 'mingguan':
          const weekStart = startOfWeek(date);
          key = `${formatDateIndonesia(weekStart)} - ${formatDateIndonesia(endOfWeek(date))}`;
          break;
        case 'bulanan':
          key = format(date, 'MMMM yyyy', { locale: id });
          break;
      }
      
      if (!groupedData.has(key)) {
        groupedData.set(key, { pemasukan: 0, pengeluaran: 0 });
      }
      
      const current = groupedData.get(key)!;
      if (item.jenis === 'pemasukan') {
        current.pemasukan += item.jumlah;
      } else {
        current.pengeluaran += item.jumlah;
      }
    });

    return Array.from(groupedData.entries()).map(([name, data]) => ({
      name,
      pemasukan: data.pemasukan,
      pengeluaran: data.pengeluaran
    }));
  };

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-white p-4 rounded shadow-lg border">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className={entry.dataKey === 'pemasukan' ? 'text-green-600' : 'text-red-600'}>
            {entry.dataKey === 'pemasukan' ? 'Pemasukan: ' : 'Pengeluaran: '}
            {formatRupiah(entry.value)}
          </p>
        ))}
      </div>
    );
  };

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

  useEffect(() => {
    fetchData();
  }, [periodeTampilan, selectedDate]);

  // Effect untuk memperbarui tanggal saat komponen dimount
  useEffect(() => {
    setSelectedDate(getTodayIndonesia());
  }, []);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard BKU KARTA CUP V</h1>
          <p className="text-gray-600">Periode: {getPeriodLabel()}</p>
        </div>
        <button
          onClick={handlePrint}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center"
        >
          <Printer size={18} className="mr-1" />
          Cetak
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Area Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Trend Transaksi
          </h2>

          <div className="flex flex-col md:flex-row md:items-center mb-6">
            <div className="mb-4 md:mb-0 md:mr-6">
              <input
                type="date"
                className="input-field"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
        </div>

            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              <button
                onClick={() => setPeriodeTampilan('harian')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  periodeTampilan === 'harian' 
                    ? 'bg-[#ff5722] text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Harian
              </button>
              <button
                onClick={() => setPeriodeTampilan('mingguan')}
                className={`px-4 py-2 text-sm font-medium border-l border-r border-gray-200 transition-colors duration-150 ${
                  periodeTampilan === 'mingguan' 
                    ? 'bg-[#ff5722] text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Mingguan
              </button>
              <button
                onClick={() => setPeriodeTampilan('bulanan')}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                  periodeTampilan === 'bulanan' 
                    ? 'bg-[#ff5722] text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Ban className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-500 text-center">
                Tidak ada data transaksi
                <br />
                <span className="text-sm">Silakan pilih periode lain</span>
              </p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4CAF50" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f44336" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickFormatter={(value) => value}
                    axisLine={{ stroke: '#E0E0E0' }}
                  />
                  <YAxis
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickFormatter={(value) => `${formatRupiah(value)}`}
                    axisLine={{ stroke: '#E0E0E0' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="pemasukan"
                    name="Pemasukan"
                    stroke="#4CAF50"
                    fill="url(#colorPemasukan)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="pengeluaran"
                    name="Pengeluaran"
                    stroke="#f44336"
                    fill="url(#colorPengeluaran)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Perbandingan Transaksi
          </h2>
          
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Ban className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-500 text-center">
                Tidak ada data transaksi
                <br />
                <span className="text-sm">Silakan pilih periode lain</span>
              </p>
          </div>
        ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickFormatter={(value) => value}
                    axisLine={{ stroke: '#E0E0E0' }}
                  />
                  <YAxis
                    tick={{ fill: '#666', fontSize: 12 }}
                    tickFormatter={(value) => `${formatRupiah(value)}`}
                    axisLine={{ stroke: '#E0E0E0' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="pemasukan"
                    name="Pemasukan"
                    fill="#4CAF50"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pengeluaran"
                    name="Pengeluaran"
                    fill="#f44336"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
          </div>
        )}
        </div>
      </div>

      <div id="printable-content" className="hidden">
        <PrintableReport 
          transaksi={transaksiData}
          totalPemasukan={totalPendapatan}
          totalPengeluaran={totalPengeluaran}
          selectedDate={selectedDate}
          periodeTampilan={periodeTampilan}
        />
      </div>
    </div>
  );
};

export default Dashboard;