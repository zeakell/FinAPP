// src/pages/FinanceManagerPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

// Import Chart Components
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

// Register Plugin Chart
ChartJS.register(ArcElement, Tooltip, Legend);

// --- KONSTANTA ---
const CATEGORIES = [
  "Homecare", "Dating", "Personal Care", "Withdraw Money", 
  "Transportation", "Bills",  "Salary", "Food & Beverage", "Wedding/Special Event", "Other"
];

// GANTI IP INI SESUAI SERVER ANDA
//const API_URL = `${API_BASE_URL}/transactions`;
const API_URL = "http://localhost:8081/api";
const MONTHS = [
  {v:"01",n:"Januari"},{v:"02",n:"Februari"},{v:"03",n:"Maret"},{v:"04",n:"April"},
  {v:"05",n:"Mei"},{v:"06",n:"Juni"},{v:"07",n:"Juli"},{v:"08",n:"Agustus"},
  {v:"09",n:"September"},{v:"10",n:"Oktober"},{v:"11",n:"November"},{v:"12",n:"Desember"}
];

const YEARS = [2024, 2025, 2026, 2027, 2028];

// --- GANTI NAMA FUNCTION DARI Dashboard KE FinanceManagerPage ---
export default function FinanceManagerPage({ user }) {
  // 1. STATE MANAGEMENT
  const [currentTime, setCurrentTime] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
  
  // State Filter Waktu
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1).padStart(2, '0')); 
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  
  // State Chart & Form
  const [chartType, setChartType] = useState("expense"); 
  const [form, setForm] = useState({ 
    title: "", amount: "", type: "expense", category: "Other", date: new Date().toISOString().split('T')[0] 
  });

  // State Modal Password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passForm, setPassForm] = useState({ old: "", new: "" });

  // 2. EFFECT (JAM & FETCH DATA)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { 
    if(user) fetchTransactions(); 
  }, [selectedMonth, selectedYear, user]);

  // 3. LOGIC & FUNCTIONS
  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_URL}/transactions`, {
        params: { user_id: user.user_id, month: selectedMonth, year: selectedYear }
      });
      setTransactions(res.data);
      calculateSummary(res.data);
    } catch (error) { 
      console.error("Error fetching transactions", error); 
    }
  };

  const calculateSummary = (data) => {
    let inc = 0, exp = 0;
    data.forEach((t) => t.type === "income" ? inc += t.amount : exp += t.amount);
    setSummary({ income: inc, expense: exp, balance: inc - exp });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) return;
    try {
      await axios.post(`${API_URL}/transactions`, {
        ...form, amount: parseFloat(form.amount), user_id: user.user_id
      });
      setForm({ ...form, title: "", amount: "" }); 
      fetchTransactions();
    } catch (error) { 
      alert("Gagal menyimpan transaksi"); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await axios.delete(`${API_URL}/transactions/${id}`);
      fetchTransactions();
    } catch (error) {
      alert("Gagal menghapus");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      // Perbaikan URL sedikit agar aman
      const baseUrl = API_URL.replace(/\/api$/, ''); 
      await axios.put(`${baseUrl}/api/change-password`, {
        user_id: user.user_id,
        old_password: passForm.old,
        new_password: passForm.new
      });
      alert("Password berhasil diubah!");
      setShowPasswordModal(false);
      setPassForm({ old: "", new: "" });
    } catch (err) {
      alert(err.response?.data?.error || "Gagal mengganti password");
    }
  };

  const formatRupiah = (num) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num);
  const dateStr = currentTime.toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = currentTime.toLocaleTimeString("id-ID");

  // 4. CHART DATA LOGIC
  const chartData = useMemo(() => {
    const filteredData = transactions.filter(t => t.type === chartType);
    const totals = {};
    
    filteredData.forEach(t => {
      const cat = t.category || "Other";
      totals[cat] = (totals[cat] || 0) + t.amount;
    });

    return {
      labels: Object.keys(totals),
      datasets: [
        {
          data: Object.values(totals),
          backgroundColor: chartType === 'expense' 
            ? ['#ef4444', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1'] 
            : ['#10b981', '#3b82f6', '#06b6d4', '#14b8a6', '#84cc16'],
          borderWidth: 1,
        },
      ],
    };
  }, [transactions, chartType]);

  // 5. RENDER JSX (Sama persis seperti sebelumnya)
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative pb-20">
      
      {/* MODAL GANTI PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h3 className="font-bold text-lg mb-4">Ganti Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <input type="password" placeholder="Password Lama" className="w-full p-2 border rounded" 
                value={passForm.old} onChange={e => setPassForm({...passForm, old: e.target.value})} required />
              <input type="password" placeholder="Password Baru" className="w-full p-2 border rounded" 
                value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} required />
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 bg-slate-200 rounded font-bold">Batal</button>
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b px-4 py-3 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-40">
        <div className="flex flex-col">
          <h2 className="font-bold text-lg text-slate-800">💰 Finance Manager</h2>
          <div className="text-xs text-slate-500 font-mono">{dateStr} • {timeStr}</div>
        </div>
        
        <div className="flex gap-2 items-center flex-wrap justify-center">
          <div className="text-right hidden sm:block mr-2">
            <p className="text-sm font-bold text-slate-700">Halo, {user?.username}</p>
            <button onClick={() => setShowPasswordModal(true)} className="text-xs text-blue-600 hover:underline">Ganti Password</button>
          </div>
          
          <select className="bg-slate-100 p-2 rounded text-sm outline-none border" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
          </select>
          
          <select className="bg-white border text-sm font-semibold text-slate-700 p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-blue-50 transition" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}> 
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded shadow-sm border-l-4 border-emerald-500">
            <p className="text-sm text-slate-500">Pemasukan</p>
            <h3 className="text-xl font-bold text-emerald-600">{formatRupiah(summary.income)}</h3>
          </div>
          <div className="bg-white p-4 rounded shadow-sm border-l-4 border-rose-500">
            <p className="text-sm text-slate-500">Pengeluaran</p>
            <h3 className="text-xl font-bold text-rose-600">{formatRupiah(summary.expense)}</h3>
          </div>
          <div className="bg-slate-800 p-4 rounded shadow-sm text-white">
            <p className="text-sm text-slate-400">Sisa Saldo</p>
            <h3 className="text-xl font-bold">{formatRupiah(summary.balance)}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* BAGIAN KIRI: CHART & INPUT */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col items-center relative">
               <div className="w-full flex justify-between items-center mb-6">
                  <h2 className="font-bold text-slate-700">📊 Statistik</h2>
                  <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-bold">
                    <button onClick={() => setChartType('income')} className={`px-3 py-1.5 rounded-md transition ${chartType === 'income' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>Masuk</button>
                    <button onClick={() => setChartType('expense')} className={`px-3 py-1.5 rounded-md transition ${chartType === 'expense' ? 'bg-rose-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>Keluar</button>
                  </div>
               </div>
               {chartData.labels.length > 0 ? (
                 <div className="w-64 h-64">
                    <Doughnut data={chartData} options={{ maintainAspectRatio: false }} />
                 </div>
               ) : (
                 <div className="h-40 flex items-center text-slate-400 text-sm italic">Belum ada data</div>
               )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h2 className="font-bold mb-4">Input Transaksi</h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-500">Tanggal</label>
                  <input type="date" className="w-full p-2 border rounded" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Kategori</label>
                  <select className="w-full p-2 border rounded bg-white" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Judul</label>
                  <input type="text" className="w-full p-2 border rounded" placeholder="Contoh: Gaji / Grab" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">Nominal</label>
                  <input type="number" className="w-full p-2 border rounded" placeholder="0" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} required />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setForm({...form, type: 'expense'})} className={`flex-1 py-2 text-sm font-bold border rounded ${form.type === 'expense' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-white'}`}>Pengeluaran</button>
                  <button type="button" onClick={() => setForm({...form, type: 'income'})} className={`flex-1 py-2 text-sm font-bold border rounded ${form.type === 'income' ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white'}`}>Pemasukan</button>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 mt-2">Simpan</button>
              </form>
            </div>
          </div>

          {/* BAGIAN KANAN: LIST RIWAYAT */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border overflow-hidden h-fit">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="font-bold text-slate-700">Riwayat {MONTHS.find(m => m.v === selectedMonth)?.n}</h2>
              <span className="text-xs bg-white border px-2 py-1 rounded-full">{transactions.length} Data</span>
            </div>
            <div className="divide-y">
              {transactions.length === 0 ? <p className="text-center py-10 text-slate-400">Belum ada data</p> : transactions.map(t => (
                <div key={t.id} className="p-4 hover:bg-slate-50 flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${t.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                      {t.type === 'income' ? '💰' : '🛒'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{t.title}</p>
                      <div className="flex gap-2 text-xs text-slate-500">
                        <span className="bg-slate-100 px-1.5 rounded text-slate-600 font-medium">{t.category || "Other"}</span>
                        <span>• {t.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'} {formatRupiah(t.amount)}
                    </p>
                    <button onClick={() => handleDelete(t.id)} className="text-xs text-rose-400 opacity-0 group-hover:opacity-100 hover:underline">Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}