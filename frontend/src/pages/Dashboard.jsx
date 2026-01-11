// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';

export default function Dashboard({ user }) {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [strength, setStrength] = useState("Strong");
  const [isCopied, setIsCopied] = useState(false);

  // Generate saat load
  useEffect(() => {
    generatePassword();
  }, [length, options]);

  const generatePassword = () => {
    const charset = {
      uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      lowercase: "abcdefghijklmnopqrstuvwxyz",
      numbers: "0123456789",
      symbols: "!@#$%^&*()_+~`|}{[]:;?><,./-="
    };

    let validChars = "";
    if (options.uppercase) validChars += charset.uppercase;
    if (options.lowercase) validChars += charset.lowercase;
    if (options.numbers) validChars += charset.numbers;
    if (options.symbols) validChars += charset.symbols;

    if (validChars === "") {
        setPassword("");
        setStrength("Invalid");
        return;
    }

    let generatedPassword = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * validChars.length);
      generatedPassword += validChars[randomIndex];
    }

    setPassword(generatedPassword);
    calculateStrength(generatedPassword);
    setIsCopied(false);
  };

  const calculateStrength = (pass) => {
    if (pass.length < 8) return setStrength("Weak");
    if (pass.length < 12) return setStrength("Medium");
    if (options.symbols && options.numbers && options.uppercase) return setStrength("Very Strong");
    return setStrength("Strong");
  };

  const handleCheckbox = (type) => {
    const activeCount = Object.values(options).filter(Boolean).length;
    if (activeCount === 1 && options[type]) return; 
    setOptions({ ...options, [type]: !options[type] });
  };

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getStrengthColor = () => {
      if (strength === "Weak") return "bg-red-500";
      if (strength === "Medium") return "bg-yellow-500";
      if (strength === "Strong") return "bg-green-500";
      return "bg-indigo-600";
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col items-center pt-10 px-4">
      
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Halo, {user?.username} 👋</h1>
        <p className="text-slate-500 mt-2">Selamat datang di Dashboard Keamanan Anda</p>
      </div>

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-6 text-center">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">🎲 Quick Password Generator</h1>
            <p className="text-slate-400 text-sm mt-1">Buat password kuat & acak secara instan</p>
        </div>

        <div className="p-8">
            <div className="relative mb-8">
                <div className="bg-slate-100 p-6 rounded-2xl text-center break-all border-2 border-slate-200">
                    <span className="text-3xl font-mono font-bold text-slate-800 tracking-wider">
                        {password}
                    </span>
                </div>
                
                <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs text-white px-3 py-1 rounded-full font-bold shadow-sm ${getStrengthColor()}`}>
                    {strength}
                </div>

                <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2">
                     <button onClick={generatePassword} className="p-2 bg-white rounded-full shadow hover:bg-slate-50 text-slate-500 transition" title="Regenerate">
                        🔄
                     </button>
                </div>
            </div>

            <button 
                onClick={handleCopy}
                className={`w-full py-4 rounded-xl font-bold text-lg mb-8 transition shadow-lg flex items-center justify-center gap-2
                ${isCopied ? "bg-green-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
            >
                {isCopied ? "✅ BERHASIL DISALIN" : "📋 COPY PASSWORD"}
            </button>

            <hr className="border-slate-100 mb-8" />

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="font-bold text-slate-700">Panjang: {length}</label>
                    </div>
                    <input 
                        type="range" min="4" max="50" value={length} 
                        onChange={(e) => setLength(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {Object.keys(options).map((key) => (
                        <div key={key} onClick={() => handleCheckbox(key)} className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${options[key] ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                            <span className="font-bold text-slate-700 capitalize">{key}</span>
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${options[key] ? "bg-indigo-600 text-white" : "bg-slate-200"}`}>✓</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}