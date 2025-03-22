import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ArrowUpDown, Ban, ChartBar, Calendar, FileDown, Loader, Printer } from 'lucide-react';

interface Transaksi {
  id: string;
  tanggal: string;
  keterangan: string;
  jenis: 'pemasukan' | 'pengeluaran';
  jumlah: number;
}

type LaporanPeriod = 'harian' | 'mingguan' | 'bulanan';

const LaporanPage = () => {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState<LaporanPeriod>('harian');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState({
    totalPemasukan: 0,
    totalPengeluaran: 0,
    saldo: 0
  });

  const fetchTransaksi = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.error("User not authenticated");
        setError('Anda harus login terlebih dahulu untuk mengakses data');
        setLoading(false);
        return;
      }
      
      let startDate = new Date(selectedDate);
      let endDate = new Date(selectedDate);
      
      // Adjust date range based on current period
      if (currentPeriod === 'harian') {
        // For daily report, use the selected date
        endDate.setHours(23, 59, 59, 999);
      } else if (currentPeriod === 'mingguan') {
        // For weekly report, get the week range (Sunday to Saturday)
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - day); // Go to Sunday
        endDate.setDate(startDate.getDate() + 6); // Go to Saturday
        endDate.setHours(23, 59, 59, 999);
      } else if (currentPeriod === 'bulanan') {
        // For monthly report, get the month range
        startDate.setDate(1); // First day of month
        endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of month
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Format dates for Firestore query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Query transactions within date range
      const q = query(
        collection(db, "transaksi"),
        where("tanggal", ">=", startDateStr),
        where("tanggal", "<=", endDateStr),
        orderBy("tanggal", "desc")
      );
      
      console.log(`Fetching ${currentPeriod} report from ${startDateStr} to ${endDateStr}`);
      
      const querySnapshot = await getDocs(q);
      
      const transaksiData: Transaksi[] = [];
      let totalPemasukan = 0;
      let totalPengeluaran = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transaksiData.push({
          id: doc.id,
          tanggal: data.tanggal,
          keterangan: data.keterangan,
          jenis: data.jenis,
          jumlah: data.jumlah
        });
        
        // Calculate totals
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
      
    } catch (error: any) {
      console.error(`Error mengambil data laporan ${currentPeriod}:`, error);
      if (error?.code === 'permission-denied') {
        setError('Anda tidak memiliki izin untuk mengakses data laporan. Silakan login ulang atau hubungi administrator.');
      } else if (error?.code === 'failed-precondition' && error?.message?.includes('index')) {
        setError('Dibutuhkan pengaturan indeks database. Silakan hubungi administrator untuk mengaktifkan fitur laporan.');
      } else {
        setError(`Gagal memuat data laporan ${currentPeriod}. Silakan coba lagi nanti.`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Confirm we have authentication before fetching data
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log(`Fetching ${currentPeriod} report data for user:`, user.uid);
        fetchTransaksi();
      } else {
        setLoading(false);
        setError('Anda harus login terlebih dahulu untuk mengakses data');
      }
    });
    
    return () => unsubscribe();
  }, [currentPeriod, selectedDate]);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };
  
  const handlePeriodChange = (period: LaporanPeriod) => {
    setCurrentPeriod(period);
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };
  
  const getPeriodLabel = () => {
    const date = new Date(selectedDate);
    
    if (currentPeriod === 'harian') {
      return new Date(selectedDate).toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else if (currentPeriod === 'mingguan') {
      const day = date.getDay();
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - day);
      
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      
      return `${sunday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} - ${saturday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    } else if (currentPeriod === 'bulanan') {
      return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    
    return '';
  };
  
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan ${currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)} - ${getPeriodLabel()}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #ddd;
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            margin: 5px 0;
          }
          .subtitle {
            font-size: 14px;
            margin: 5px 0;
          }
          .summary {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          .summary-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
          }
          .summary-item.total {
            font-weight: bold;
            border-bottom: none;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed #ccc;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .footer {
            margin-top: 30px;
            text-align: right;
            font-size: 12px;
          }
          .pemasukan {
            color: #2e7d32;
          }
          .pengeluaran {
            color: #c62828;
          }
          .logo {
            height: 60px;
            margin-bottom: 10px;
          }
          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="https://mocha-cdn.com/0195bfc4-06ff-71af-bb75-b8fd467c9d72/logo-karta-cup-v.png" alt="KARTA CUP V Logo" class="logo">
          <div class="title">LAPORAN ${currentPeriod.toUpperCase()} BKU KARTA CUP V</div>
          <div class="subtitle">${getPeriodLabel()}</div>
        </div>
        
        <div class="summary">
          <div class="summary-item">
            <span>Total Pemasukan:</span>
            <span class="pemasukan">${formatRupiah(summary.totalPemasukan)}</span>
          </div>
          <div class="summary-item">
            <span>Total Pengeluaran:</span>
            <span class="pengeluaran">${formatRupiah(summary.totalPengeluaran)}</span>
          </div>
          <div class="summary-item total">
            <span>Saldo:</span>
            <span>${formatRupiah(summary.saldo)}</span>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Keterangan</th>
              <th>Jenis</th>
              <th>Jumlah</th>
            </tr>
          </thead>
          <tbody>
            ${transaksi.map(item => `
              <tr>
                <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                <td>${item.keterangan}</td>
                <td>${item.jenis === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</td>
                <td class="${item.jenis}">${formatRupiah(item.jumlah)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
          <p className="text-gray-600">Analisis data keuangan KARTA CUP V</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md flex items-center"
          >
            <Printer size={18} className="mr-1" />
            Cetak
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md flex items-center"
          >
            <FileDown size={18} className="mr-1" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center mb-6">
          <div className="mb-4 md:mb-0 md:mr-6">
            <label htmlFor="date-picker" className="block text-sm font-medium text-gray-700 mb-1">
              Pilih Tanggal
            </label>
            <input
              type="date"
              id="date-picker"
              className="input-field"
              value={selectedDate}
              onChange={handleDateChange}
            />
          </div>
          
          <div className="flex">
            <button
              onClick={() => handlePeriodChange('harian')}
              className={`flex items-center px-4 py-2 font-medium rounded-l-md ${
                currentPeriod === 'harian' 
                  ? 'bg-[#ff5722] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar size={18} className="mr-1" />
              Harian
            </button>
            <button
              onClick={() => handlePeriodChange('mingguan')}
              className={`flex items-center px-4 py-2 font-medium ${
                currentPeriod === 'mingguan' 
                  ? 'bg-[#ff5722] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChartBar size={18} className="mr-1" />
              Mingguan
            </button>
            <button
              onClick={() => handlePeriodChange('bulanan')}
              className={`flex items-center px-4 py-2 font-medium rounded-r-md ${
                currentPeriod === 'bulanan' 
                  ? 'bg-[#ff5722] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChartBar size={18} className="mr-1" />
              Bulanan
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-6">
          Laporan {currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)}: {getPeriodLabel()}
        </h2>

        {/* Error display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="animate-spin h-8 w-8 text-[#ff5722]" />
            <span className="ml-2 text-gray-700">Memuat data laporan...</span>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-l-4 border-green-500 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-500 bg-opacity-10">
                    <ArrowUpDown className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-green-500">Total Pemasukan</p>
                    <h3 className="text-xl font-semibold text-gray-800">{formatRupiah(summary.totalPemasukan)}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border-l-4 border-red-500 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-red-500 bg-opacity-10">
                    <ArrowUpDown className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-red-500">Total Pengeluaran</p>
                    <h3 className="text-xl font-semibold text-gray-800">{formatRupiah(summary.totalPengeluaran)}</h3>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-500 bg-opacity-10">
                    <ChartBar className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-blue-500">Saldo</p>
                    <h3 className="text-xl font-semibold text-gray-800">{formatRupiah(summary.saldo)}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                {transaksi.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Keterangan
                        </th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jenis
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jumlah
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transaksi.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(item.tanggal).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {item.keterangan}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
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
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                            item.jenis === 'pemasukan' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatRupiah(item.jumlah)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-10 flex flex-col items-center justify-center text-gray-500">
                    <Ban size={40} className="mb-2 text-gray-400" />
                    <p>Tidak ada transaksi pada periode ini</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LaporanPage;
