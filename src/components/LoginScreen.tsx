import React, { useState, useEffect } from 'react';
import { User, Area, Role } from '../types';
import { 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  Receipt, 
  Server, 
  Cloud, 
  Wifi, 
  Droplets, 
  Zap, 
  Users, 
  CheckCircle, 
  Sparkles,
  Lock,
  ArrowRight,
  Database,
  UserPlus,
  X,
  AlertCircle,
  Settings
} from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  areas: Area[];
  onLoginSuccess: (user: User) => void;
  onAddPetugas: (u: Omit<User, 'id'>) => void;
  cloudSyncId: string;
  onUpdateCloudSyncId: (newId: string) => Promise<void>;
  syncing: boolean;
  syncError: string | null;
}

export default function LoginScreen({ 
  users, 
  areas,
  onLoginSuccess, 
  onAddPetugas,
  cloudSyncId,
  onUpdateCloudSyncId,
  syncing,
  syncError
}: LoginScreenProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Register Petugas Modal States
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regRole, setRegRole] = useState<Role>('kasir');
  const [regAreaId, setRegAreaId] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regName.trim() || !regUsername.trim()) {
      setRegError('Nama dan Username wajib diisi.');
      return;
    }

    const cleanUsername = regUsername.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setRegError('Username hanya boleh huruf, angka, dan underscore (_).');
      return;
    }

    // Check if username already exists
    const exists = users.some(u => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      setRegError('Username sudah terdaftar! Gunakan nama unik lain.');
      return;
    }

    const newStaff: Omit<User, 'id'> = {
      name: regName.trim(),
      username: cleanUsername,
      role: regRole,
      areaId: regRole === 'kasir' ? (regAreaId || undefined) : undefined
    };

    onAddPetugas(newStaff);
    setRegSuccess(`Sukses mendaftarkan ${regRole === 'admin' ? 'Admin' : 'Kasir'} baru! Silakan pilih akun di bawah.`);
    
    // Auto populate the login field with new user
    setUsername(cleanUsername);
    setPassword('password');

    // Clean up
    setRegName('');
    setRegUsername('');
    setRegRole('kasir');
    setRegAreaId('');

    setTimeout(() => {
      setIsRegModalOpen(false);
      setRegSuccess('');
    }, 2000);
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-950/80 flex flex-col justify-center items-center p-4 lg:p-8 relative overflow-hidden select-none text-slate-100">
      {/* Mesh Background */}
      <div className="absolute inset-0 z-0 opacity-70 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/40 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/40 rounded-full blur-[140px]"></div>
        <div className="absolute top-[25%] right-[20%] w-[40%] h-[40%] bg-purple-600/30 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-6 lg:p-8 shadow-2xl">
        
        {/* Left Column: System Showcase (Hidden on Mobile) */}
        <div className="lg:col-span-7 hidden lg:flex flex-col justify-between p-6 rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-950/40 border border-white/5 relative overflow-hidden">
          {/* Subtle background abstract element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-6">
            {/* System Tag */}
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <Database className="h-3 w-3" /> Cloud Firestore Sync Active
              </span>
            </div>

            {/* Brand Title */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Receipt className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                  Loket Digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Pro</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Platform penagihan kasir & keuangan desa terpadu untuk pengelolaan tagihan WiFi internet, listrik PLN pascabayar, dan air bersih PDAM.
              </p>
            </div>

            {/* Feature Bento Grid Items */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition space-y-2">
                <div className="h-8 w-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                  <Wifi className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Tagihan WiFi Dusun</h4>
                <p className="text-[10px] text-slate-400 leading-normal">Manajemen langganan bulanan tetap WiFi internet desa secara otomatis.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition space-y-2">
                <div className="h-8 w-8 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center text-amber-400">
                  <Zap className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Tagihan PLN Pascabayar</h4>
                <p className="text-[10px] text-slate-400 leading-normal">Catat pemakaian meteran listrik PLN pascabayar dengan kalkulasi cerdas.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition space-y-2">
                <div className="h-8 w-8 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">
                  <Droplets className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Meteran Air PDAM</h4>
                <p className="text-[10px] text-slate-400 leading-normal">Pencatatan meter kubik air warga dan konversi tarif bertingkat instan.</p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition space-y-2">
                <div className="h-8 w-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                  <Cloud className="h-4 w-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Oto-Sinkronisasi</h4>
                <p className="text-[10px] text-slate-400 leading-normal">Kolektibilitas kasir tersinkronisasi multi-device ke server cloud.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login Panel */}
        <div className="lg:col-span-5 w-full flex flex-col justify-between p-2 lg:p-4">
          <div>
            {/* Mobile Header (Hidden on Large Screen) */}
            <div className="flex flex-col items-center mb-6 lg:hidden">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/10 mb-2.5">
                <Receipt className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight uppercase">
                Loket Digital <span className="text-emerald-400">Pro</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Sistem Tagihan & Kasir Desa Terpadu</p>
            </div>

            {/* Panel Title */}
            <div className="mb-6 hidden lg:block flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Otentikasi Petugas</h2>
                <p className="text-xs text-slate-400 mt-1">Silakan masuk menggunakan kredensial kasir atau admin Anda.</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 font-medium flex items-start gap-2 animate-pulse">
                <Shield className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username Petugas</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                    <Users className="h-4 w-4" />
                  </div>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    required
                    placeholder="Masukkan username"
                    className="w-full text-xs font-semibold glass-input rounded-xl py-3 pl-10 pr-3.5 focus:outline-none bg-slate-950/80 border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Kata Sandi (Password)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    required
                    placeholder="••••••••"
                    className="w-full text-xs font-semibold glass-input rounded-xl py-3 pl-10 pr-10 focus:outline-none bg-slate-950/80 border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs py-3 rounded-xl tracking-wider uppercase transition flex items-center justify-center gap-2 mt-6 cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
              >
                Masuk Ke Aplikasi <Key className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
