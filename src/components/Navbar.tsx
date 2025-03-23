import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Receipt, CreditCard, BarChart3, LogOut, FileCheck, Menu, X, ArrowUpCircle, BarChart } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-gradient-to-r from-[#ff5722] to-[#ff9800] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center" onClick={closeMenu}>
                <img
                  src="/images/logo-karta-cup-v.png"
                  alt="KARTA CUP V Logo"
                  className="h-8 w-auto"
                />
                <span className="ml-2 text-xl font-semibold text-gray-800">BKU KARTA CUP V</span>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isActive('/')
                      ? 'bg-[#e64a19] text-white'
                      : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
                  }`}
                  onClick={closeMenu}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <Link
                  to="/pendapatan"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isActive('/pendapatan')
                      ? 'bg-[#e64a19] text-white'
                      : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
                  }`}
                  onClick={closeMenu}
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Pendapatan
                </Link>
                <Link
                  to="/pengeluaran"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isActive('/pengeluaran')
                      ? 'bg-[#e64a19] text-white'
                      : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
                  }`}
                  onClick={closeMenu}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pengeluaran
                </Link>
                <Link
                  to="/kwitansi"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isActive('/kwitansi')
                      ? 'bg-[#e64a19] text-white'
                      : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
                  }`}
                  onClick={closeMenu}
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Kwitansi
                </Link>
                <Link
                  to="/tanda-terima-wasit"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isActive('/tanda-terima-wasit')
                      ? 'bg-[#e64a19] text-white'
                      : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
                  }`}
                  onClick={closeMenu}
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Tanda Terima Wasit
                </Link>
                <Link
                  to="/laporan"
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    isActive('/laporan')
                      ? 'bg-[#e64a19] text-white'
                      : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
                  }`}
                  onClick={closeMenu}
                >
                  <BarChart className="w-4 h-4 mr-2" />
                  Laporan
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-[#e64a19] hover:bg-opacity-90 flex items-center"
            >
              <LogOut size={18} className="mr-1" />
              Keluar
            </button>
          </div>
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-[#e64a19] focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute z-50 w-full bg-[#ff5722] shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/"
              className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                isActive('/')
                  ? 'bg-[#e64a19] text-white'
                  : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
              }`}
              onClick={closeMenu}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
            <Link
              to="/pendapatan"
              className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                isActive('/pendapatan')
                  ? 'bg-[#e64a19] text-white'
                  : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
              }`}
              onClick={closeMenu}
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Pendapatan
            </Link>
            <Link
              to="/pengeluaran"
              className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                isActive('/pengeluaran')
                  ? 'bg-[#e64a19] text-white'
                  : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
              }`}
              onClick={closeMenu}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pengeluaran
            </Link>
            <Link
              to="/kwitansi"
              className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                isActive('/kwitansi')
                  ? 'bg-[#e64a19] text-white'
                  : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
              }`}
              onClick={closeMenu}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Kwitansi
            </Link>
            <Link
              to="/tanda-terima-wasit"
              className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                isActive('/tanda-terima-wasit')
                  ? 'bg-[#e64a19] text-white'
                  : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
              }`}
              onClick={closeMenu}
            >
              <FileCheck className="w-4 h-4 mr-2" />
              Tanda Terima Wasit
            </Link>
            <Link
              to="/laporan"
              className={`block px-3 py-2 rounded-md text-base font-medium flex items-center ${
                isActive('/laporan')
                  ? 'bg-[#e64a19] text-white'
                  : 'text-white hover:bg-[#e64a19] hover:bg-opacity-75'
              }`}
              onClick={closeMenu}
            >
              <BarChart className="w-4 h-4 mr-2" />
              Laporan
            </Link>
            <button
              onClick={handleLogout}
              className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white hover:bg-[#e64a19] hover:bg-opacity-75 flex items-center"
            >
              <LogOut size={18} className="mr-2" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
