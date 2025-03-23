import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Loader, Eye, EyeOff } from 'lucide-react';

// Fungsi enkripsi sederhana
const encrypt = (text: string) => {
  return btoa(text);
};

// Fungsi dekripsi sederhana
const decrypt = (text: string) => {
  try {
    return atob(text);
  } catch {
    return '';
  }
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  // Load kredensial yang tersimpan saat komponen dimuat
  useEffect(() => {
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    setRememberMe(savedRememberMe);
    
    if (savedRememberMe) {
      const savedEmail = localStorage.getItem('email');
      const savedPassword = localStorage.getItem('password');
      
      if (savedEmail && savedPassword) {
        setEmail(decrypt(savedEmail));
        setPassword(decrypt(savedPassword));
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Set persistence berdasarkan checkbox "Ingat Saya"
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

      // Simpan atau hapus kredensial berdasarkan checkbox
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('email', encrypt(email));
        localStorage.setItem('password', encrypt(password));
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('email');
        localStorage.removeItem('password');
      }

      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      let errorMessage = 'Terjadi kesalahan saat login';
      if (err.code === 'auth/invalid-credential') {
        errorMessage = 'Email atau password salah';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Terlalu banyak percobaan login. Silakan coba lagi nanti';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image dengan brightness yang lebih terang */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/karta-cup-bg.jpg")',
          filter: 'brightness(0.8)'
        }}
      />

      {/* Overlay Gradient yang lebih gelap untuk kontras */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/30 to-black/60"
      />

      {/* Content dengan transparansi yang disesuaikan */}
      <div className="relative bg-black/20 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 border border-white/10">
        <div className="relative">
          <div className="text-center mb-8">
            <img
              className="mx-auto h-28 w-auto drop-shadow-xl transform hover:scale-105 transition-transform duration-300"
              src="/images/logo-karta-cup-v.png"
              alt="KARTA CUP V"
            />
            <h2 className="mt-6 text-3xl font-extrabold text-white drop-shadow-lg">
              BKU KARTA CUP V
            </h2>
            <p className="mt-2 text-sm text-gray-100 drop-shadow">
              Aplikasi Buku Kas Umum Digital
            </p>
          </div>

          {error && (
            <div className="bg-red-500/90 backdrop-blur-sm border border-red-600 p-4 mb-6 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-white">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white drop-shadow mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="appearance-none block w-full px-3 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg shadow-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-transparent text-white sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email anda"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white drop-shadow mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none block w-full px-3 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg shadow-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#ff5722] focus:border-transparent text-white sm:text-sm pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-300 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-[#ff5722] focus:ring-[#ff5722] border-white/20 rounded bg-white/10"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-white drop-shadow">
                Ingat Saya
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#ff5722] hover:bg-[#f4511e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5722] transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-200 drop-shadow">
              © 2025 KARTA CUP V - Aplikasi Buku Kas Umum Digital
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 