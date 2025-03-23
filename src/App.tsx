import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PendapatanPage from './pages/PendapatanPage';
import PengeluaranPage from './pages/PengeluaranPage';
import LaporanPage from './pages/LaporanPage';
import KwitansiPage from './pages/KwitansiPage';
import TandaTerimaWasit from './pages/TandaTerimaWasit';
import ReloadPrompt from './components/ReloadPrompt'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <>
                <Navbar />
                <Dashboard />
              </>
            </PrivateRoute>
          } />
          <Route path="/pendapatan" element={
            <PrivateRoute>
              <>
                <Navbar />
                <PendapatanPage />
              </>
            </PrivateRoute>
          } />
          <Route path="/pengeluaran" element={
            <PrivateRoute>
              <>
                <Navbar />
                <PengeluaranPage />
              </>
            </PrivateRoute>
          } />
          <Route path="/laporan" element={
            <PrivateRoute>
              <>
                <Navbar />
                <LaporanPage />
              </>
            </PrivateRoute>
          } />
          <Route path="/kwitansi" element={
            <PrivateRoute>
              <>
                <Navbar />
                <KwitansiPage />
              </>
            </PrivateRoute>
          } />
          <Route path="/tanda-terima-wasit" element={
            <PrivateRoute>
              <>
                <Navbar />
                <TandaTerimaWasit />
              </>
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <ReloadPrompt />
      </div>
    </AuthProvider>
  );
}

export default App;
