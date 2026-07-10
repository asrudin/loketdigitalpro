import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  Wallet, 
  MapPin, 
  TrendingUp, 
  FileText, 
  Copy, 
  Database, 
  LogOut,
  UserCheck
} from 'lucide-react';
import { User } from '../types';

export type ActiveTab = 
  | 'dashboard'
  | 'pelanggan'
  | 'tagihan'
  | 'pembayaran'
  | 'petugas'
  | 'keuangan'
  | 'planning'
  | 'backup';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout }: SidebarProps) {
  const menuGroups = [
    {
      title: 'DASHBOARD',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'kasir'] },
      ]
    },
    {
      title: 'MASTER DATA',
      items: [
        { id: 'pelanggan', label: 'Pelanggan', icon: Users, roles: ['admin'] },
        { id: 'petugas', label: 'Akun Petugas & Area Desa', icon: MapPin, roles: ['admin'] },
      ]
    },
    {
      title: 'PEMBAYARAN & KEUANGAN',
      items: [
        { id: 'tagihan', label: 'Tagihan Belum Bayar', icon: Receipt, roles: ['admin', 'kasir'] },
        { id: 'pembayaran', label: 'Catat Pembayaran', icon: UserCheck, roles: ['admin', 'kasir'] },
        { id: 'keuangan', label: 'Arus Kas (Masuk/Keluar)', icon: Wallet, roles: ['admin'] },
        { id: 'planning', label: 'Planning Keuangan', icon: TrendingUp, roles: ['admin'] },
      ]
    },
    {
      title: 'SISTEM',
      items: [
        { id: 'backup', label: 'Backup & Restore', icon: Database, roles: ['admin'] },
      ]
    }
  ];

  return (
    <aside id="app-sidebar" className="w-64 z-10 flex flex-col backdrop-blur-xl bg-white/5 border-r border-white/10 h-screen select-none text-white">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-emerald-500/20">
            SP
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none tracking-tight">Simulti <span className="text-emerald-400 italic font-medium">Pro</span></h1>
            <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-bold">Sistem Multi Tagihan</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="p-4 mx-3 my-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-200 uppercase border border-white/10 shrink-0">
          {currentUser.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
          <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold uppercase rounded mt-1 border ${
            currentUser.role === 'admin' 
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}>
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* Navigation Menu with Grouping */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto pb-4">
        {menuGroups.map((group, groupIdx) => {
          // Filter items that are allowed for current user role
          const allowedItems = group.items.filter(item => item.roles.includes(currentUser.role));
          if (allowedItems.length === 0) return null;

          return (
            <div key={groupIdx} className="space-y-1.5 animate-in fade-in duration-300">
              {/* Category Header Label */}
              <div className="px-3 text-[9px] font-bold text-slate-400 tracking-widest uppercase">
                {group.title}
              </div>

              {/* Group Items */}
              <div className="space-y-0.5">
                {allowedItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      id={`sidebar-btn-${item.id}`}
                      key={item.id}
                      onClick={() => setActiveTab(item.id as ActiveTab)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium tracking-wide transition duration-150 cursor-pointer ${
                        isActive 
                          ? 'bg-white/20 text-white font-semibold border-l-2 border-emerald-400' 
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div className="p-4 border-t border-white/10">
        <button
          id="logout-btn"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-lg border border-white/10 transition cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-400" />
          Keluar Sesi
        </button>
      </div>
    </aside>
  );
}
