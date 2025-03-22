import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { CirclePlus, FileText, Loader, Printer, Search } from 'lucide-react';

interface Kwitansi {
  id: string;
  nomor: string;
  tanggal: string;
  namaTim: string;
  nominal: number;
  keterangan: string;
}

const KwitansiPage = () => {
  const [kwitansi, setKwitansi] = useState<Kwitansi[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    nomor: '',
    tanggal: new Date().toISOString().split('T')[0],
    namaTim: '',
    nominal: '',
    keterangan: 'Pendaftaran KARTA CUP V',
  });
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchKwitansi = async () => {
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
      
      const q = query(collection(db, "kwitansi"), orderBy("tanggal", "desc"));
      const querySnapshot = await getDocs(q);
      
      const kwitansiData: Kwitansi[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        kwitansiData.push({
          id: doc.id,
          nomor: data.nomor,
          tanggal: data.tanggal,
          namaTim: data.namaTim,
          nominal: data.nominal,
          keterangan: data.keterangan
        });
      });
      
      setKwitansi(kwitansiData);
    } catch (error) {
      console.error("Error mengambil data kwitansi:", error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        setError('Anda tidak memiliki izin untuk mengakses data kwitansi. Silakan login ulang atau hubungi administrator.');
      } else {
        setError('Gagal memuat data kwitansi. Silakan coba lagi nanti.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Confirm we have authentication before fetching data
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("Fetching kwitansi data for user:", user.uid);
        fetchKwitansi();
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

  // Fungsi untuk mengubah angka menjadi terbilang dalam Bahasa Indonesia
  const terbilangIndonesia = (angka: number): string => {
    if (angka === 0) {
      return 'Nol';
    }

    const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    
    const konversiBilangan = (nilai: number): string => {
      if (nilai < 12) {
        return bilangan[nilai];
      } else if (nilai < 20) {
        return bilangan[nilai - 10] + ' Belas';
      } else if (nilai < 100) {
        return bilangan[Math.floor(nilai / 10)] + ' Puluh ' + bilangan[nilai % 10];
      } else if (nilai < 200) {
        return 'Seratus ' + konversiBilangan(nilai - 100);
      } else if (nilai < 1000) {
        return bilangan[Math.floor(nilai / 100)] + ' Ratus ' + konversiBilangan(nilai % 100);
      } else if (nilai < 2000) {
        return 'Seribu ' + konversiBilangan(nilai - 1000);
      } else if (nilai < 1000000) {
        return konversiBilangan(Math.floor(nilai / 1000)) + ' Ribu ' + konversiBilangan(nilai % 1000);
      } else if (nilai < 1000000000) {
        return konversiBilangan(Math.floor(nilai / 1000000)) + ' Juta ' + konversiBilangan(nilai % 1000000);
      } else if (nilai < 1000000000000) {
        return konversiBilangan(Math.floor(nilai / 1000000000)) + ' Milyar ' + konversiBilangan(nilai % 1000000000);
      } else if (nilai < 1000000000000000) {
        return konversiBilangan(Math.floor(nilai / 1000000000000)) + ' Trilyun ' + konversiBilangan(nilai % 1000000000000);
      }
      return '';
    };

    let result = konversiBilangan(angka);
    return result.replace(/\s+/g, ' ').trim();
  };

  const generateNomorKwitansi = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `KRTCUP-${year}${month}${day}-${random}`;
  };

  const formatTanggalIndonesia = (tanggal: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    };
    return new Date(tanggal).toLocaleDateString('id-ID', options);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const openForm = () => {
    setFormData({
      ...formData,
      nomor: generateNomorKwitansi(),
      tanggal: new Date().toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    if (!formData.nomor || !formData.namaTim || !formData.nominal) {
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

      const numericNominal = parseFloat(formData.nominal.replace(/[^\d]/g, ''));
      
      if (isNaN(numericNominal) || numericNominal <= 0) {
        setError('Nominal harus berupa angka positif');
        setSubmitLoading(false);
        return;
      }

      // Create kwitansi document with user ID
      const kwitansiData = {
        nomor: formData.nomor,
        tanggal: formData.tanggal,
        namaTim: formData.namaTim,
        nominal: numericNominal,
        keterangan: formData.keterangan,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };

      console.log("Attempting to add kwitansi to Firestore:", kwitansiData);

      // Tambahkan ke firestore
      const kwitansiRef = await addDoc(collection(db, "kwitansi"), kwitansiData);
      console.log("Kwitansi added successfully with ID:", kwitansiRef.id);

      // Tambahkan juga ke transaksi sebagai pendapatan
      await addDoc(collection(db, "transaksi"), {
        tanggal: formData.tanggal,
        keterangan: `Pendaftaran: ${formData.namaTim}`,
        jenis: "pemasukan",
        jumlah: numericNominal,
        nomor_kwitansi: formData.nomor,
        createdBy: auth.currentUser.uid,
        kwitansiId: kwitansiRef.id,
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({
        nomor: '',
        tanggal: new Date().toISOString().split('T')[0],
        namaTim: '',
        nominal: '',
        keterangan: 'Pendaftaran KARTA CUP V',
      });
      
      setIsFormOpen(false);
      fetchKwitansi(); // Refresh data
    } catch (error) {
      console.error("Error menambahkan kwitansi:", error);
      if (error instanceof Error && error.message.includes('permission-denied')) {
        setError('Anda tidak memiliki izin untuk menambahkan kwitansi. Silakan login ulang atau hubungi administrator.');
      } else {
        setError('Gagal menyimpan kwitansi. Silakan coba lagi.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handlePrintKwitansi = (item: Kwitansi) => {
    // Generate kwitansi kedua (dummy) untuk layout 2 kwitansi sekaligus
    const dummyKwitansi = {...item, nomor: `${item.nomor}-COPY`};
    
    // Membuat konten kwitansi yang akan dicetak
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kwitansi Pembayaran - ${item.nomor}</title>
        <style>
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: white;
          }
          
          .page {
            width: 210mm;
            height: 148.5mm; /* Half A4 height */
            page-break-after: always;
            box-sizing: border-box;
            background-color: white;
            position: relative;
            overflow: hidden;
            display: flex;
          }
          
          .kwitansi {
            width: 50%;
            height: 100%;
            box-sizing: border-box;
            padding: 12mm;
            position: relative;
            border-right: 1px dashed #333;
          }
          
          .kwitansi:last-child {
            border-right: none;
          }
          
          /* Guilloche pattern background - security feature */
          .guilloche-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.05;
            z-index: -1;
            pointer-events: none;
            background-image: repeating-radial-gradient(circle at 10% 20%, rgba(255,87,34,1), rgba(255,152,0,0.7) 10%, rgba(255,193,7,0.5) 20%, rgba(76,175,80,0.3) 30%, rgba(33,150,243,0.2) 40%);
            background-size: 40% 40%;
            mix-blend-mode: multiply;
          }
          
          /* Micro text - security feature */
          .micro-text {
            position: absolute;
            height: 100%;
            width: 100%;
            top: 0;
            left: 0;
            font-size: 3pt;
            line-height: 3pt;
            overflow: hidden;
            pointer-events: none;
            z-index: -1;
            opacity: 0.1;
            color: #000;
          }
          
          /* Watermark - security feature */
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 40pt;
            font-weight: bold;
            opacity: 0.06;
            color: #ff5722;
            pointer-events: none;
            white-space: nowrap;
            z-index: -1;
          }

          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 8px;
            position: relative;
          }
          
          .logo-container {
            display: flex;
            justify-content: center;
            margin-bottom: 6px;
          }
          
          .logo {
            width: 50px;
            height: auto;
          }
          
          .title {
            font-size: 16px;
            font-weight: bold;
            margin: 3px 0;
            position: relative;
          }
          
          .subtitle {
            font-size: 12px;
            margin: 3px 0;
          }
          
          .nomor {
            text-align: right;
            font-weight: bold;
            margin: 6px 0;
            font-size: 11px;
          }
          
          .content {
            margin: 12px 0;
            font-size: 11px;
          }
          
          .row {
            display: flex;
            margin-bottom: 6px;
          }
          
          .label {
            width: 110px;
            font-weight: bold;
          }
          
          .value {
            flex: 1;
          }
          
          .amount {
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            border: 1px dashed #333;
            padding: 6px;
            margin: 12px 0;
            position: relative;
            background-color: rgba(255, 255, 255, 0.9);
          }
          
          .terbilang {
            font-size: 10px;
            font-style: italic;
            text-align: center;
            margin: 0 0 12px 0;
          }
          
          .footer {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
          }
          
          .signature {
            width: 45%;
            text-align: center;
          }
          
          .sign-area {
            margin-top: 40px;
          }
          
          /* Hidden element for serialization - security feature */
          .hidden-serial {
            position: absolute;
            right: 5mm;
            bottom: 5mm;
            font-size: 6pt;
            color: #333;
            opacity: 0.5;
          }
          
          @media print {
            html, body {
              width: 210mm;
            }
            button, .no-print {
              display: none;
            }
            .page {
              margin: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Kwitansi pertama -->
          <div class="kwitansi">
            <!-- Security features -->
            <div class="guilloche-bg"></div>
            <div class="micro-text">${'KARTA CUP V TOURNAMENT OFFICIAL RECEIPT '.repeat(1000)}</div>
            <div class="watermark">KARTA CUP V</div>
            
            <div class="header">
              <div class="logo-container">
                <img src="https://mocha-cdn.com/0195bfc4-06ff-71af-bb75-b8fd467c9d72/logo-karta-cup-v.png" alt="Logo KARTA CUP V" class="logo">
              </div>
              <div class="title">KWITANSI PEMBAYARAN</div>
              <div class="subtitle">KARTA CUP V - TOURNAMENT</div>
            </div>
            
            <div class="nomor">No: ${item.nomor}</div>
            
            <div class="content">
              <div class="row">
                <div class="label">Telah diterima dari:</div>
                <div class="value">${item.namaTim}</div>
              </div>
              <div class="row">
                <div class="label">Tanggal:</div>
                <div class="value">${formatTanggalIndonesia(item.tanggal)}</div>
              </div>
              <div class="row">
                <div class="label">Uang sejumlah:</div>
                <div class="value">${formatRupiah(item.nominal)}</div>
              </div>
              <div class="row">
                <div class="label">Untuk pembayaran:</div>
                <div class="value">${item.keterangan}</div>
              </div>
            </div>
            
            <div class="amount">
              ${formatRupiah(item.nominal)}
            </div>
            
            <div class="terbilang">
              Terbilang: <strong>${terbilangIndonesia(item.nominal)} Rupiah</strong>
            </div>
            
            <div class="footer">
              <div class="signature">
                <div>Penyetor,</div>
                <div class="sign-area"></div>
                <div>(............................)</div>
              </div>
              <div class="signature">
                <div>Penerima,</div>
                <div class="sign-area"></div>
                <div>Panitia KARTA CUP V</div>
              </div>
            </div>
            
            <div class="hidden-serial">SN: KC5-${new Date().getTime().toString(36)}</div>
          </div>
          
          <!-- Kwitansi kedua (copy) -->
          <div class="kwitansi">
            <!-- Security features -->
            <div class="guilloche-bg"></div>
            <div class="micro-text">${'KARTA CUP V TOURNAMENT OFFICIAL RECEIPT '.repeat(1000)}</div>
            <div class="watermark">KARTA CUP V</div>
            
            <div class="header">
              <div class="logo-container">
                <img src="https://mocha-cdn.com/0195bfc4-06ff-71af-bb75-b8fd467c9d72/logo-karta-cup-v.png" alt="Logo KARTA CUP V" class="logo">
              </div>
              <div class="title">KWITANSI PEMBAYARAN</div>
              <div class="subtitle">KARTA CUP V - TOURNAMENT</div>
            </div>
            
            <div class="nomor">No: ${dummyKwitansi.nomor}</div>
            
            <div class="content">
              <div class="row">
                <div class="label">Telah diterima dari:</div>
                <div class="value">${dummyKwitansi.namaTim}</div>
              </div>
              <div class="row">
                <div class="label">Tanggal:</div>
                <div class="value">${formatTanggalIndonesia(dummyKwitansi.tanggal)}</div>
              </div>
              <div class="row">
                <div class="label">Uang sejumlah:</div>
                <div class="value">${formatRupiah(dummyKwitansi.nominal)}</div>
              </div>
              <div class="row">
                <div class="label">Untuk pembayaran:</div>
                <div class="value">${dummyKwitansi.keterangan}</div>
              </div>
            </div>
            
            <div class="amount">
              ${formatRupiah(dummyKwitansi.nominal)}
            </div>
            
            <div class="terbilang">
              Terbilang: <strong>${terbilangIndonesia(dummyKwitansi.nominal)} Rupiah</strong>
            </div>
            
            <div class="footer">
              <div class="signature">
                <div>Penyetor,</div>
                <div class="sign-area"></div>
                <div>(............................)</div>
              </div>
              <div class="signature">
                <div>Penerima,</div>
                <div class="sign-area"></div>
                <div>Panitia KARTA CUP V</div>
              </div>
            </div>
            
            <div class="hidden-serial">SN: KC5-${new Date().getTime().toString(36) + 1}</div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;
    
    // Membuka jendela baru untuk mencetak
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const filteredKwitansi = kwitansi.filter(item => 
    item.namaTim.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.nomor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatRupiah(item.nominal).includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kwitansi Pembayaran</h1>
          <p className="text-gray-600">Kelola kwitansi pendaftaran KARTA CUP V</p>
        </div>
        <button
          onClick={openForm}
          className="btn-primary mt-4 sm:mt-0 flex items-center"
        >
          <CirclePlus size={20} className="mr-2" />
          Buat Kwitansi Baru
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error}</p>
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
            placeholder="Cari kwitansi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Buat Kwitansi Baru</h2>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="nomor" className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Kwitansi
                </label>
                <input
                  type="text"
                  id="nomor"
                  name="nomor"
                  value={formData.nomor}
                  onChange={handleInputChange}
                  className="input-field bg-gray-100"
                  required
                  readOnly
                />
              </div>
              
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
                <p className="mt-1 text-xs text-gray-500">Format tanggal: {formData.tanggal ? formatTanggalIndonesia(formData.tanggal) : ''}</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="namaTim" className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Tim/Peserta
                </label>
                <input
                  type="text"
                  id="namaTim"
                  name="namaTim"
                  value={formData.namaTim}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                  placeholder="Masukkan nama tim/peserta"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="nominal" className="block text-sm font-medium text-gray-700 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="text"
                  id="nominal"
                  name="nominal"
                  value={formData.nominal}
                  onChange={handleInputChange}
                  className="input-field"
                  required
                  placeholder="Contoh: 100000"
                />
                {formData.nominal && !isNaN(parseFloat(formData.nominal.replace(/[^\d]/g, ''))) && (
                  <p className="mt-1 text-xs text-gray-500">
                    Terbilang: {terbilangIndonesia(parseFloat(formData.nominal.replace(/[^\d]/g, '')))} Rupiah
                  </p>
                )}
              </div>
              
              <div className="mb-6">
                <label htmlFor="keterangan" className="block text-sm font-medium text-gray-700 mb-1">
                  Keterangan
                </label>
                <textarea
                  id="keterangan"
                  name="keterangan"
                  value={formData.keterangan}
                  onChange={handleInputChange}
                  className="input-field"
                  rows={2}
                  required
                  placeholder="Masukkan keterangan pembayaran"
                ></textarea>
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
          <span className="ml-2 text-gray-700">Memuat data kwitansi...</span>
        </div>
      ) : (
        <div className="card">
          {filteredKwitansi.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nomor Kwitansi
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Tim/Peserta
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nominal
                    </th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredKwitansi.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText size={16} className="text-[#ff5722] mr-2" />
                          {item.nomor}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 whitespace-nowrap">
                        {formatTanggalIndonesia(item.tanggal)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {item.namaTim}
                      </td>
                      <td className="py-3 px-4 text-sm text-right whitespace-nowrap font-medium text-green-600">
                        {formatRupiah(item.nominal)}
                      </td>
                      <td className="py-3 px-4 text-sm text-center">
                        <button
                          onClick={() => handlePrintKwitansi(item)}
                          className="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ff5722] hover:bg-[#e64a19] focus:outline-none"
                        >
                          <Printer size={16} className="mr-1" />
                          Cetak
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'Tidak ada kwitansi yang cocok dengan pencarian' : 'Belum ada kwitansi tercatat'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KwitansiPage;
