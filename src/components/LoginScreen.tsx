import React, { useState } from 'react';
import { User } from '../types';
import { Shield, Key, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ users, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase()
    );

    if (user && password === 'password') {
      onLoginSuccess(user);
    } else {
      setError('Username salah atau Password tidak valid! (Gunakan password default: password)');
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none text-slate-100">
      {/* Mesh Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] bg-purple-600 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md glass-card p-6 md:p-8 shadow-2xl relative z-10 rounded-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 text-emerald-400 shadow-md shadow-emerald-500/10">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Sistem Tagihan Desa</h1>
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mt-1">Sistem Keuangan, WiFi, PLN, & PDAM</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
            <div className="relative">
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                required
                placeholder="admin / budi / siti"
                className="w-full text-xs font-semibold glass-input rounded-lg py-2.5 px-3.5 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                className="w-full text-xs font-semibold glass-input rounded-lg py-2.5 px-3.5 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[9px] text-slate-500 mt-1.5 font-semibold">Gunakan password: <span className="font-mono text-slate-400">password</span></p>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="w-full glass-btn-primary py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            Masuk ke Sistem <Key className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Akun Demo yang Tersedia:</p>
          <div className="grid grid-cols-1 gap-2.5">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setUsername(u.username);
                  setPassword('password');
                  setError('');
                }}
                className="text-left p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition text-xs flex justify-between items-center"
              >
                <div>
                  <span className="font-bold text-white text-[11px]">{u.name}</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Username: {u.username}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                  u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}>
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
