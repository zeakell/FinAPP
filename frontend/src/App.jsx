// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Component
import FinanceManagerPage from './pages/FinanceManagerPage'; // IMPORT HALAMAN BARU
import Navbar from './components/Navbar'; 
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; 
import TotpPage from './pages/TotpPage';  
import PasswordManagerPage from './pages/PasswordManagerPage';

function App() {
  const [user, setUser] = useState(null);

  // Cek apakah user sudah login saat aplikasi dibuka
  useEffect(() => { 
    const s = localStorage.getItem("user"); 
    if(s) setUser(JSON.parse(s)); 
  }, []);

  const handleLogout = () => {  
    localStorage.removeItem("user"); 
    setUser(null); 
    // Redirect otomatis handled by conditional rendering di bawah
  };

  // 1. Jika User Belum Login -> Tampilkan Halaman Login Saja
  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  // 2. Jika Sudah Login -> Tampilkan Router (Navbar + Halaman)
  return (
    <Router>
      {/* Navbar Muncul Terus */}
      <Navbar /> 

      <div className="container mx-auto mt-4">
        <Routes>
          {/* Halaman Dashboard (Pass user & logout function) */}
          <Route path="/" element={<Dashboard user={user} onLogout={handleLogout} />} />
          
          {/* Halaman TOTP Baru */}
          <Route path="/totp" element={<TotpPage />} />
          <Route path="/passwordsManager" element={<PasswordManagerPage />} />
          <Route path="/finance" element={<FinanceManagerPage user={user} />} />
          {/* Redirect jika halaman tidak ditemukan */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;