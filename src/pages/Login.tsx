import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    // Mengambil nilai rememberMe dari localStorage saat komponen dimuat
    const saved = localStorage.getItem('rememberMe');
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Menyimpan preferensi rememberMe ke localStorage setiap kali nilainya berubah
    localStorage.setItem('rememberMe', JSON.stringify(rememberMe));
  }, [rememberMe]);

  useEffect(() => {
    // Cek status autentikasi saat komponen dimuat
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Set persistence berdasarkan checkbox "Ingat Saya"
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      // Login dengan email dan password
      await signInWithEmailAndPassword(auth, email, password);
      
      // Redirect ke dashboard setelah login berhasil
      navigate('/');
    } catch (err: any) {
      let errorMessage = 'Login gagal: ';
      
      // Menerjemahkan pesan error Firebase ke Bahasa Indonesia
      switch (err.code) {
        case 'auth/invalid-email':
          errorMessage += 'Format email tidak valid';
          break;
        case 'auth/user-disabled':
          errorMessage += 'Akun ini telah dinonaktifkan';
          break;
        case 'auth/user-not-found':
          errorMessage += 'Email tidak terdaftar';
          break;
        case 'auth/wrong-password':
          errorMessage += 'Password salah';
          break;
        case 'auth/too-many-requests':
          errorMessage += 'Terlalu banyak percobaan login. Silakan coba lagi nanti';
          break;
        default:
          errorMessage += 'Periksa email dan password Anda';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#ffeb3b] via-[#ff9800] to-[#ff5722] p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              className="mx-auto h-24 w-auto"
              src="/images/logo-karta-cup-v.png"
              alt="KARTA CUP V Logo"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">BKU KARTA CUP V</h1>
          <p className="text-gray-600">Aplikasi Buku Kas Umum Digital</p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan alamat email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                className="input-field pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 text-[#ff5722] focus:ring-[#ff5722] border-gray-300 rounded"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Ingat Saya
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center"
            >
              {loading ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
              ) : (
                <>
                  <LogIn size={20} className="mr-2" />
                  Masuk
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Aplikasi Buku Kas Umum untuk KARTA CUP V</p>
          <p className="mt-1">© 2025 KARTA CUP V</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
