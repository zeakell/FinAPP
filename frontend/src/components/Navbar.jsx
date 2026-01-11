import React, { useState, useEffect, useRef } from 'react';

export default function Navbar({ user }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Ref untuk mendeteksi klik di luar

  // Fungsi Logout
  const handleLogout = () => {
    if (!confirm("Yakin ingin keluar dari aplikasi?")) return;
    localStorage.removeItem("user");
    window.location.reload();
  };

  // Logic: Tutup dropdown jika user klik di luar area menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  return (
    <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm relative z-50">
      
      {/* LOGO KIRI */}
      <div className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-2">
        <span className="bg-indigo-600 text-white w-8 h-8 flex items-center justify-center rounded-lg text-sm">F</span>
        FinApp
      </div>

      {/* MENU KANAN */}
      <div className="flex gap-6 items-center">
        
        {/* 1. Dashboard */}
        <a href="/" className="text-slate-600 hover:text-indigo-600 font-bold text-sm transition">
            Dashboard
        </a>
        
        {/* Finance */}
        <a href="/finance" className="text-slate-600 hover:text-emerald-600 font-bold text-sm transition flex items-center gap-1"> 💰 Finance</a>
        {/* 2. MENU DROPDOWN "PRIVACY" (KLIK VERSION) */}
        <div className="relative" ref={dropdownRef}> 
            
            {/* Tombol Pemicu: Sekarang pakai onClick */}
            <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-1 font-bold text-sm transition py-2 select-none
                ${isDropdownOpen ? "text-indigo-600" : "text-slate-600 hover:text-indigo-600"}`}
            >
                🛡️ Privacy 
                {/* Ikon panah berputar saat diklik */}
                <span className={`text-[10px] mt-0.5 transform transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}>
                    ▼
                </span>
            </button>

            {/* Isi Dropdown */}
            {isDropdownOpen && (
                <div className="absolute top-full right-0 w-52 bg-white border border-slate-100 shadow-xl rounded-xl overflow-hidden mt-2 flex flex-col animate-fade-in-down origin-top-right">
                    
                    {/* Link TOTP */}
                    <a 
                        href="/totp" 
                        onClick={() => setIsDropdownOpen(false)} // Tutup menu saat diklik
                        className="px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 text-left transition flex items-center gap-3 border-b border-slate-50"
                    >
                        🕒 TOTP Manager
                    </a>

                    {/* Link Passwords */}
                    <a 
                        href="/passwordsManager" 
                        onClick={() => setIsDropdownOpen(false)} // Tutup menu saat diklik
                        className="px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 text-left transition flex items-center gap-3"
                    >
                        🔑 Password Manager
                    </a>
                    <a href="/generator" onClick={() => setIsDropdownOpen(false)} className="px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 text-left transition flex items-center gap-3"> 🎲 Password Generator </a>

                  
                </div>
            )}
        </div>

        {/* 3. Tombol Logout */}
        <div className="pl-4 border-l border-slate-200">
            <button 
            onClick={handleLogout} 
            className="bg-rose-50 text-rose-600 px-4 py-2 rounded-lg hover:bg-rose-100 transition font-bold text-xs"
            >
            Logout 
            </button>
        </div>

      </div>
    </nav>
  );
}
