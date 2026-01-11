// src/pages/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    const endpoint = isRegister ? "/register" : "/login";
    try {
      // Pastikan PORT backend sesuai (8081 atau 8081)
      const res = await axios.post(`http://localhost:8081/api${endpoint}`, formData);
      if (isRegister) {
        alert("Registrasi Berhasil! Silakan Login."); setIsRegister(false);
      } else {
        localStorage.setItem("user", JSON.stringify(res.data));
        onLoginSuccess(res.data);
      }
    } catch (err) { setError(err.response?.data?.error || "Error server"); } 
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <h1 className="text-2xl font-bold text-center text-slate-800 mb-6">{isRegister ? "Buat Akun" : "FinAPP"}</h1>
        {error && <div className="bg-rose-50 text-rose-600 p-3 rounded mb-4 text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Username" className="w-full p-3 border rounded-xl" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
          <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">{loading ? "..." : (isRegister ? "Daftar" : "Masuk")}</button>
        </form>
        <p className="text-center mt-4 text-sm text-blue-600 cursor-pointer" onClick={() => setIsRegister(!isRegister)}>{isRegister ? "Sudah punya akun? Login" : "Belum punya akun? Daftar"}</p>
      </div>
    </div>
  );
}
