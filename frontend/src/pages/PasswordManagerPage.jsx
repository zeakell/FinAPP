import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CATEGORIES = ["Social Media", "Email", "Finance", "Games", "Work", "Other"];
const STATUSES = ["Active", "Inactive", "Suspended", "Old"]; // Pilihan Status

export default function PasswordManagerPage() {
  const [passwords, setPasswords] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  
  // FORM STATE (DITAMBAH STATUS)
  const [form, setForm] = useState({ account_name: '', username: '', password: '', category: 'Social Media', status: 'Active' });
  
  const [editId, setEditId] = useState(null);
  // FILTER & SEARCH
  const [filterCat, setFilterCat] = useState("All");
  const [search, setSearch] = useState("");

  // --- MODAL PIN ---
  const [showModal, setShowModal] = useState(false); // Munculkan popup?
  const [pinInput, setPinInput] = useState("");      // Input PIN user
  const [targetRevealId, setTargetRevealId] = useState(null); // ID yg mau dibuka

  // VISIBILITY STATE
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // ⚠️ Ganti IP sesuai server Anda
  const API_URL = "http://localhost:8081/api/passwordsManager";

  useEffect(() => {
    fetchData();
  }, [filterCat, search]);

  const fetchData = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    try {
      const res = await axios.get(API_URL, {
        params: { user_id: user.user_id, category: filterCat, search: search }
      });
      setPasswords(res.data || []);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));

    try {
      const payload = { ...form, user_id: user.user_id };
      
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, payload);
        alert("Data berhasil diperbarui!");
      } else {
        await axios.post(API_URL, payload);
        alert("Akun berhasil disimpan");
      }

      setForm({ account_name: '', username: '', password: '', category: 'Social Media', status: 'Active' });
      setEditId(null);
      setActiveTab('list');
      fetchData();
    } catch (err) { 
        alert("Gagal menyimpan data.");
    }
  };
  // --- LOGIC BARU: BUKA POPUP PIN ---
  const handleRequestReveal = (id) => {
    // Cek apakah password sudah terbuka? (Kalau bukan "TERKUNCI", berarti sudah open)
    const item = passwords.find(p => p.id === id);
    if (item.password !== "🔒 TERKUNCI") {
        // Kalau sudah terbuka, tutup kembali (sembunyikan)
        updatePasswordInList(id, "🔒 TERKUNCI");
        return;
    }
    // Kalau masih terkunci, buka modal
    setTargetRevealId(id);
    setPinInput("");
    setShowModal(true);
  };

  // --- LOGIC BARU: SUBMIT PIN KE BACKEND ---
  const submitPin = async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));
    
    try {
        const res = await axios.post(`${API_URL}/reveal`, {
            id: targetRevealId,
            user_id: user.user_id,
            password: pinInput // Kirim PIN
        });

        // Jika sukses, backend kirim password asli
        const realPassword = res.data.password;
        
        // Update tampilan list hanya untuk item ini
        updatePasswordInList(targetRevealId, realPassword);

        // Tutup modal
        setShowModal(false);
    } catch (err) {
        alert(err.response?.data?.error || "PIN Salah!");
        setPinInput(""); // Reset input biar ngetik ulang
    }
  };

  const updatePasswordInList = (id, newVal) => {
      setPasswords(prev => prev.map(item => 
          item.id === id ? { ...item, password: newVal } : item
      ));
  };



 // const handleEdit = (item) => {
   // setEditId(item.id);
    //setForm({
      //  account_name: item.account_name,
        //username: item.username,
        //password: item.password,
        //category: item.category,
        //status: item.status || 'Active' // Load status lama
    //});
    //setActiveTab('add');
    //window.scrollTo({ top: 0, behavior: 'smooth' });
  //};

  const handleEdit = (item) => {
    // Saat edit, kita tidak bisa load password asli karena terkunci.
    // User harus overwrite password baru, atau kita biarkan kosong.
    setEditId(item.id);
    setForm({
        account_name: item.account_name,
        username: item.username,
        password: "", // Kosongkan password demi keamanan, user input baru jika mau ganti
        category: item.category,
        status: item.status || 'Active'
    });
    setActiveTab('add');
   // alert("Mode Edit: Masukkan password baru jika ingin mengubahnya. Jika tidak, biarkan kosong (tapi logic backend harus handle ignore if empty - opsional).");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm({ account_name: '', username: '', password: '', category: 'Social Media', status: 'Active' });
    setActiveTab('list');
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus data ini selamanya?")) return;
    await axios.delete(`${API_URL}/${id}`);
    fetchData();
  };

// --- FUNGSI COPY YANG AMAN (SUPPORT HTTP & HTTPS) ---
  const handleCopy = (text) => {
    // 1. Cek validasi dasar
    if (!text || text === "🔒 TERKUNCI") {
        alert("Buka gembok dulu dengan Password Login untuk menyalin!");
        return;
    }

    // 2. Fungsi Fallback (Cara Lama - Jalan di HTTP biasa)
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
           alert("Berhasil disalin!");
        } catch (err) {
            alert("Gagal menyalin otomatis. Browser tidak mengizinkan.");
        }
        
        document.body.removeChild(textArea);
    };

    // 3. Cek apakah Browser support API Modern (HTTPS / Localhost)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => alert("Berhasil disalin!"))
            .catch(() => copyManual(text)); // Jika gagal, pakai cara manual
    } else {
        // Jika akses via IP (192.168...) langsung pakai cara manual
        copyManual(text);
    }
  };
  // Helper Warna Status
  const getStatusColor = (status) => {
      switch(status) {
          case 'Active': return 'bg-green-100 text-green-700 border-green-200';
          case 'Inactive': return 'bg-slate-100 text-slate-500 border-slate-200';
          case 'Suspended': return 'bg-rose-100 text-rose-700 border-rose-200';
          default: return 'bg-yellow-100 text-yellow-700';
      }
  };
return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans relative">  
    {/* --- MODAL POPUP --- */}
      {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-bounce-short">
                  <h3 className="text-lg font-bold text-center mb-2">🔒 Verifikasi Identitas</h3>
                  
                  {/* UBAH TEXT INI */}
                  <p className="text-center text-slate-500 text-sm mb-4">
                      Masukkan <b>Password Login</b> Anda untuk membuka gembok.
                  </p>
                  
                  <form onSubmit={submitPin}>
                      <input 
                        type="password" 
                        autoFocus
                        placeholder="Password Login..."  // Ubah Placeholder
                        className="w-full text-center text-xl tracking-wide font-bold border-2 border-indigo-100 focus:border-indigo-500 rounded-xl p-3 outline-none mb-4"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                      />
                      <div className="flex gap-2">
                          <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
                          <button type="submit" className="flex-1 py-2 font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-lg">Buka</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">🛡️ Password Vault</h1>
        
        {/* TABS */}
        <div className="bg-white p-1 rounded-xl shadow-sm border flex mb-6">
          <button onClick={() => { setActiveTab('list'); setEditId(null); }} className={`flex-1 py-3 font-bold rounded-lg transition ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>📂 Data Tersimpan</button>
          <button onClick={() => setActiveTab('add')} className={`flex-1 py-3 font-bold rounded-lg transition ${activeTab === 'add' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>{editId ? '✏️ Edit Data' : '➕ Tambah Baru'}</button>
        </div>

        {/* --- FORM VIEW --- */}
        {activeTab === 'add' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border relative">
            <h3 className="font-bold text-lg mb-4 flex justify-between items-center">
                <span>{editId ? "Edit Akun" : "Input Data Akun"}</span>
                {editId && <button onClick={handleCancelEdit} className="text-xs bg-slate-200 px-3 py-1 rounded">Batal</button>}
            </h3>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid md:grid-cols-3 gap-4">
                 <div className="md:col-span-1">
                    <label className="text-xs font-bold text-slate-500">Kategori</label>
                    <select className="w-full border p-3 rounded-xl mt-1 bg-white" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="md:col-span-1">
                    <label className="text-xs font-bold text-slate-500">Status</label>
                    <select className="w-full border p-3 rounded-xl mt-1 bg-white" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div className="md:col-span-1">
                    <label className="text-xs font-bold text-slate-500">Nama Akun</label>
                    <input required placeholder="Contoh: Facebook" className="w-full border p-3 rounded-xl mt-1" value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} />
                 </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-slate-500">Username / Email</label>
                    <input required className="w-full border p-3 rounded-xl mt-1" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500">Password</label>
                    <input type="text" placeholder={editId ? "Isi jika ingin mengubah..." : "Password..."} className="w-full border p-3 rounded-xl mt-1" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                 </div>
              </div>
              <button className={`w-full py-3 rounded-xl font-bold mt-2 text-white shadow-lg ${editId ? 'bg-orange-500' : 'bg-slate-800'}`}>
                 {editId ? '💾 Simpan Perubahan' : '🔒 Enkripsi & Simpan'}
              </button>
            </form>
          </div>
        )}

        {/* --- LIST VIEW --- */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button onClick={() => setFilterCat("All")} className={`px-4 py-1 rounded-full text-sm font-bold border whitespace-nowrap ${filterCat === "All" ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}>All</button>
                {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setFilterCat(cat)} className={`px-4 py-1 rounded-full text-sm font-bold border whitespace-nowrap ${filterCat === cat ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "bg-white text-slate-600"}`}>{cat}</button>
                ))}
            </div>
            
            <input placeholder="Cari akun..." className="w-full p-3 border rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />

            <div className="grid gap-3">
                {passwords.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:shadow-md transition">
                        
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 bg-slate-100`}>
                                {item.category === 'Social Media' ? '🌐' : item.category === 'Email' ? '📧' : item.category === 'Finance' ? '💰' : '🔑'}
                            </div>
                            <div className="overflow-hidden">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-slate-800 truncate">{item.account_name}</h4>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${getStatusColor(item.status)}`}>{item.status || 'Active'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span className="truncate max-w-[150px]">{item.username}</span>
                                    <button onClick={() => handleCopy(item.username)} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border">📋</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            <div className="bg-slate-50 px-3 py-2 rounded-lg border flex items-center gap-2 min-w-[180px] justify-between">
                                {/* TAMPILAN PASSWORD */}
                                <span className={`font-mono text-sm ${item.password !== "🔒 TERKUNCI" ? "text-slate-800" : "text-slate-400 italic"}`}>
                                    {item.password !== "🔒 TERKUNCI" ? item.password : "••••••••"}
                                </span>
                                
                                <div className="flex gap-1">
                                    {/* TOMBOL MATA - MEMICU MODAL */}
                                    <button onClick={() => handleRequestReveal(item.id)} className="p-1 hover:text-indigo-600 transition" title="Buka Password">
                                        {item.password !== "🔒 TERKUNCI" ? "🙈" : "👁️"}
                                    </button>
                                    <button onClick={() => handleCopy(item.password)} className="p-1 hover:text-green-600 transition" title="Copy">📋</button>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(item)} className="bg-orange-50 text-orange-500 p-2 rounded-lg hover:bg-orange-100">✏️</button>
                                <button onClick={() => handleDelete(item.id)} className="bg-rose-50 text-rose-500 p-2 rounded-lg hover:bg-rose-100">🗑️</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}