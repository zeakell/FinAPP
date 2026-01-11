import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as OTPAuth from 'otpauth';

export default function TotpPage() {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'manager'
  const [totps, setTotps] = useState([]);
  
  // --- STATE SEARCH & DROPDOWN ---
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Untuk mendeteksi klik di luar

  // --- STATE GENERATOR ---
  const [selectedItem, setSelectedItem] = useState(null); // Object lengkap (id, name, secret)
  const [token, setToken] = useState("------");
  const [timeLeft, setTimeLeft] = useState(30);
  const [progress, setProgress] = useState(100);

  // --- STATE MANAGER (CREATE) ---
  const [form, setForm] = useState({ service_name: '', secret_code: '' });
  const [loading, setLoading] = useState(false);

  // GANTI IP INI SESUAI SERVER ANDA
  const API_URL = "http://localhost:8081/api/totp"; 

  // 1. Fetch Data dengan Debounce Search
  useEffect(() => {
    // Logic: Jika dropdown terbuka atau di tab manager, lakukan pencarian live
    const delayDebounceFn = setTimeout(() => {
      fetchData(searchTerm);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // 2. Logic Timer & Generator
  useEffect(() => {
    if (activeTab !== 'generator' || !selectedItem) return;

    const timer = setInterval(() => {
      const seconds = new Date().getSeconds(); 
      const currentSeconds = 30 - (seconds % 30);
      
      setTimeLeft(currentSeconds);
      setProgress((currentSeconds / 30) * 100);

      generateToken(selectedItem);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab, selectedItem]);

  // 3. Close Dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);


  // --- FUNCTIONS ---

  const fetchData = async (search = "") => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    try {
      const res = await axios.get(API_URL, {
        params: { 
            user_id: user.user_id,
            search: search // Kirim parameter search ke Go
        }
      });
      setTotps(res.data || []);
    } catch (err) { console.error("Error fetching data", err); }
  };

  const generateToken = (item) => {
    if (!item || !item.secret_code) return;
    try {
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(item.secret_code.replace(/\s/g, ''))
      });
      setToken(totp.generate());
    } catch (error) {
      setToken("Invalid Key");
    }
  };

  const handleSelectService = (item) => {
    setSelectedItem(item);
    setSearchTerm(item.service_name); // Set text input jadi nama yg dipilih
    setIsDropdownOpen(false); // Tutup dropdown
    generateToken(item); // Langsung generate
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user"));

    try {
      await axios.post(API_URL, {
          ...form,
          user_id: user.user_id // Wajib kirim ID User
      });
      
      setForm({ service_name: '', secret_code: '' });
      fetchData(); // Refresh list
      alert("Layanan berhasil ditambahkan!");
      setActiveTab('manager'); 
    } catch (err) {
      alert("Gagal menyimpan. " + (err.response?.data?.error || "Cek koneksi DB"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus layanan ini?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchData();
      if(selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
        setToken("------");
        setSearchTerm("");
      }
    } catch (err) { alert("Gagal menghapus"); }
  };

// --- FUNGSI COPY YANG AMAN (SUPPORT HTTP & HTTPS) ---
  const handleCopy = async () => {
    // Cek apakah token valid
    if (!token || token === "------" || token === "Invalid Key") {
        alert("Tidak ada token untuk disalin!");
        return;
    }

    // Fungsi Fallback (Cara Manual - Jalan di HTTP biasa)
    const copyManual = (str) => {
        const textArea = document.createElement("textarea");
        textArea.value = str;
        
        // Sembunyikan element agar tidak merusak tampilan
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            alert("Token disalin!");
        } catch (err) {
            alert("Gagal menyalin otomatis. Browser tidak mengizinkan.");
        }
        
        document.body.removeChild(textArea);
    };

    // Cek apakah Browser support API Modern (HTTPS / Localhost)
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(token);
            alert("Token disalin!");
        } catch (err) {
            // Jika gagal (misal permission denied), coba cara manual
            copyManual(token);
        }
    } else {
        // Jika akses via IP (192.168...) langsung pakai cara manual
        copyManual(token);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">🔐 TOTP Manager</h1>
          <p className="text-slate-500 mt-2">Generate Token & Kelola Keamanan 2FA</p>
        </div>

        {/* TAB NAVIGATION */}
        <div className="bg-white p-1 rounded-xl shadow-sm border flex mb-6">
          <button 
            onClick={() => setActiveTab('generator')}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'generator' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            🕒 Generator TOTP
          </button>
          <button 
            onClick={() => { setActiveTab('manager'); fetchData(""); setSearchTerm(""); }}
            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'manager' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            ⚙️ Kelola Data
          </button>
        </div>

        {/* === VIEW 1: GENERATOR (SEARCHABLE) === */}
        {activeTab === 'generator' && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-visible relative min-h-[400px]">
            <div className="p-8 text-center">
              
              <label className="block text-sm font-bold text-slate-400 mb-2 text-left uppercase tracking-wider">
                Cari & Pilih Layanan
              </label>

              {/* --- CUSTOM SEARCHABLE DROPDOWN --- */}
              <div className="relative mb-8" ref={dropdownRef}>
                {/* Input Field */}
                <input
                  type="text"
                  placeholder="Ketik nama layanan (misal: Google)..."
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={searchTerm}
                  onFocus={() => { setIsDropdownOpen(true); fetchData(""); }}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                />
                {/* Search Icon */}
                <div className="absolute top-1/2 left-4 transform -translate-y-1/2 text-slate-400">
                    🔍
                </div>

                {/* Dropdown List (Muncul saat diketik/diklik) */}
                {isDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {totps.length === 0 ? (
                        <div className="p-4 text-slate-400 text-sm italic">Tidak ditemukan...</div>
                    ) : (
                        totps.map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => handleSelectService(item)}
                                className="p-4 text-left hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center gap-3 transition"
                            >
                                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                                  {item.service_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700">{item.service_name}</p>
                                    <p className="text-xs text-slate-400 truncate w-48">
                                        ID: {item.id} • Secret: {item.secret_code.substring(0,6)}...
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                  </div>
                )}
              </div>

              {/* --- TAMPILAN TOKEN --- */}
              <div className="mb-4 relative py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                 {selectedItem ? (
                   <>
                     <div className="text-6xl font-mono font-bold text-blue-600 tracking-[0.2em] transition-all">
                       {token}
                     </div>
                     <p className="text-slate-400 text-sm mt-4 font-mono">
                        {selectedItem.service_name} • Berubah dalam {timeLeft}s
                     </p>
                     
                     {/* Progress Bar */}
                     <div className="absolute bottom-0 left-0 h-1.5 bg-blue-500 transition-all duration-1000 ease-linear rounded-b-2xl" style={{ width: `${progress}%` }}></div>
                     
                     <button 
                      onClick={handleCopy}
                      className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 text-xs font-bold border bg-white px-2 py-1 rounded shadow-sm"
                     >
                       COPY
                     </button>
                   </>
                 ) : (
                   <div className="text-slate-400 italic py-4">
                      👆 Cari layanan di atas untuk melihat kode
                   </div>
                 )}
              </div>

            </div>
          </div>
        )}

        {/* === VIEW 2: MANAGER === */}
        {activeTab === 'manager' && (
          <div className="space-y-6">
            {/* Form Create */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-1 rounded">➕</span> Tambah Layanan
              </h3>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Nama Layanan</label>
                  <input 
                    required
                    placeholder="Contoh: Gmail, Facebook" 
                    className="w-full border border-slate-300 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.service_name}
                    onChange={e => setForm({...form, service_name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Secret Key (Base32)</label>
                  <input 
                    required
                    placeholder="JBSWY3DPEHPK3PXP" 
                    className="w-full border border-slate-300 p-3 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.secret_code}
                    onChange={e => setForm({...form, secret_code: e.target.value})} 
                  />
                </div>
                <button disabled={loading} className="bg-slate-800 text-white p-3 rounded-xl font-bold hover:bg-slate-900 transition shadow-lg mt-2">
                  {loading ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </form>
            </div>
            
            {/* List Simple untuk Manager */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
               <h3 className="font-bold text-lg text-slate-800 mb-4">Semua Data</h3>
               <div className="space-y-2">
                 {totps.map((item) => (
                    <div key={item.id} className="border p-3 rounded-lg flex justify-between items-center hover:bg-slate-50">
                        <span className="font-bold text-slate-700">{item.service_name}</span>
                        <button onClick={() => handleDelete(item.id)} className="text-xs text-rose-500 font-bold hover:underline">Hapus</button>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}