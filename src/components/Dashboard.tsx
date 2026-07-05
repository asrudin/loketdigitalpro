import { 
  Users, 
  Wifi, 
  TrendingUp, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Clock,
  CircleDollarSign,
  Zap,
  Droplet
} from 'lucide-react';
import { Pelanggan, Tagihan, CashFlow, Area } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  pelanggan: Pelanggan[];
  tagihan: Tagihan[];
  cashFlow: CashFlow[];
  areas: Area[];
  onAddSampleBills: () => void;
}

export default function Dashboard({ pelanggan, tagihan, cashFlow, areas, onAddSampleBills }: DashboardProps) {
  // 1. Calculations
  const totalPelanggan = pelanggan.length;
  const activeWifi = pelanggan.filter(p => p.wifiStatus === 'active').length;
  
  const unpaidBills = tagihan.filter(t => t.status === 'unpaid');
  const totalUnpaidAmount = unpaidBills.reduce((acc, t) => acc + t.amount, 0);
  
  const paidBills = tagihan.filter(t => t.status === 'paid');
  const totalCollectedAmount = paidBills.reduce((acc, t) => acc + t.amount, 0);

  // Cashflow total masuk & keluar
  const cashIn = cashFlow.filter(cf => cf.type === 'masuk').reduce((acc, cf) => acc + cf.amount, 0);
  const cashOut = cashFlow.filter(cf => cf.type === 'keluar').reduce((acc, cf) => acc + cf.amount, 0);
  const netBalance = cashIn - cashOut;

  // 2. Chfart data: Income by Category (WiFi, PLN, PDAM)
  const categoryData = [
    { name: 'WiFi Internet', value: paidBills.filter(t => t.type === 'wifi').reduce((acc, t) => acc + t.amount, 0), color: '#3b82f6' }, // blue-500
    { name: 'Listrik PLN', value: paidBills.filter(t => t.type === 'pln').reduce((acc, t) => acc + t.amount, 0), color: '#eab308' }, // yellow-500
    { name: 'Air PDAM', value: paidBills.filter(t => t.type === 'pdam').reduce((acc, t) => acc + t.amount, 0), color: '#06b6d4' }, // cyan-500
  ];

  // 3. Chart data: Unpaid vs Paid counts by Area
  const areaChartData = areas.map(area => {
    const areaPelangganIds = pelanggan.filter(p => p.areaId === area.id).map(p => p.id);
    const areaPaid = tagihan.filter(t => areaPelangganIds.includes(t.pelangganId) && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
    const areaUnpaid = tagihan.filter(t => areaPelangganIds.includes(t.pelangganId) && t.status === 'unpaid').reduce((acc, t) => acc + t.amount, 0);

    return {
      name: area.name.replace('Dusun ', ''),
      'Lunas': areaPaid,
      'Tertunggak': areaUnpaid,
    };
  });

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6 z-10 relative">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Ringkasan Dasbor</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Pantau status pembayaran pelanggan dan arus kas desa secara real-time</p>
        </div>
        <button
          id="btn-generate-bills"
          onClick={onAddSampleBills}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
        >
          <Clock className="h-4 w-4 text-emerald-400" />
          Simulasi Generate Tagihan Baru
        </button>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pelanggan */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold tracking-wider uppercase text-[10px]">Total Pelanggan</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{totalPelanggan} Pelanggan</span>
            <span className="text-[10px] text-blue-400 font-bold mt-0.5 block">{activeWifi} Langganan WiFi</span>
          </div>
        </div>

        {/* Total Terkumpul */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold tracking-wider uppercase text-[10px]">Tagihan Lunas</span>
            <span className="text-lg font-extrabold text-emerald-400 mt-1 block">{formatRupiah(totalCollectedAmount)}</span>
            <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">Dari {paidBills.length} lembar tagihan</span>
          </div>
        </div>

        {/* Belum Terbayar */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold tracking-wider uppercase text-[10px]">Total Tunggakan</span>
            <span className="text-lg font-extrabold text-rose-400 mt-1 block">{formatRupiah(totalUnpaidAmount)}</span>
            <span className="text-[10px] text-rose-400/80 font-bold mt-0.5 block">{unpaidBills.length} Tagihan Pending</span>
          </div>
        </div>

        {/* Kas Bersih */}
        <div className="glass-card glass-card-hover p-5 rounded-2xl flex items-center gap-4">
          <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
            <CircleDollarSign className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-semibold tracking-wider uppercase text-[10px]">Saldo Kas Bersih</span>
            <span className="text-lg font-extrabold text-white mt-1 block">{formatRupiah(netBalance)}</span>
            <span className="text-[9px] text-slate-400 font-bold mt-0.5 block truncate">M: {formatRupiah(cashIn)} | K: {formatRupiah(cashOut)}</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bar Chart (Area Breakdown) */}
        <div className="glass-card p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider mb-1">Grafik Pembayaran & Tunggakan per Dusun</h2>
            <p className="text-[10px] text-slate-400 mb-4 font-medium">Realisasi transaksi kas lunas versus piutang tertunggak masing-masing area</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={areaChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `Rp ${val/1000}k`} />
                <Tooltip 
                  formatter={(value: any) => [formatRupiah(Number(value)), '']}
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.9)', 
                    backdropFilter: 'blur(10px)', 
                    borderRadius: '12px', 
                    color: '#fff', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    fontSize: '11px' 
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', marginTop: '10px', color: '#f1f5f9' }} />
                <Bar dataKey="Lunas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Tertunggak" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Pie Chart (Bill Category Breakdown) */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider mb-1">Proporsi Pendapatan Masuk</h2>
            <p className="text-[10px] text-slate-400 mb-4 font-medium">Distribusi realisasi pembayaran tagihan berdasarkan kategori utilitas</p>
          </div>
          
          <div className="h-44 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatRupiah(Number(value)), '']}
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.9)', 
                    backdropFilter: 'blur(10px)', 
                    borderRadius: '12px', 
                    color: '#fff', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    fontSize: '11px' 
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute text-center">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Total</span>
              <span className="text-xs font-extrabold text-white block mt-0.5">{formatRupiah(totalCollectedAmount)}</span>
            </div>
          </div>

          <div className="space-y-2.5 mt-4 border-t border-white/5 pt-4">
            {categoryData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-300 font-semibold">{cat.name}</span>
                </div>
                <span className="font-bold text-white">{formatRupiah(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monitoring Pelanggan Bayar & Belum Bayar */}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xs font-extrabold text-white uppercase tracking-wider mb-0.5">Monitoring Kepatuhan Pembayaran Pelanggan</h2>
            <p className="text-[10px] text-slate-400 font-medium">Daftar pelanggan lunas vs menunggak di bulan berjalan</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Area / Dusun</th>
                <th className="py-3 px-4 text-center">WiFi (Internet)</th>
                <th className="py-3 px-4 text-center">PLN (Listrik)</th>
                <th className="py-3 px-4 text-center">PDAM (Air)</th>
                <th className="py-3 px-4 text-right">Tunggakan Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {pelanggan.slice(0, 5).map(plg => {
                const areaName = areas.find(a => a.id === plg.areaId)?.name || 'N/A';
                
                // Get month's status for each type
                const getStatusBadge = (type: 'wifi' | 'pln' | 'pdam') => {
                  const bill = tagihan.find(t => t.pelangganId === plg.id && t.type === type && t.month === '2026-07');
                  if (!bill) {
                    if (type === 'wifi' && plg.wifiStatus === 'inactive') return <span className="text-[10px] text-slate-500">- (Nonaktif)</span>;
                    return <span className="text-[10px] text-slate-500">-</span>;
                  }
                  
                  if (bill.status === 'paid') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold text-[9px]">
                        Lunas
                      </span>
                    );
                  } else {
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold text-[9px]">
                        Belum Bayar
                      </span>
                    );
                  }
                };

                // Total unpaid amount for this particular customer
                const plgUnpaidAmount = tagihan
                  .filter(t => t.pelangganId === plg.id && t.status === 'unpaid')
                  .reduce((sum, t) => sum + t.amount, 0);

                return (
                  <tr key={plg.id} className="hover:bg-white/5 transition duration-150">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white">{plg.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{plg.code}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{areaName}</td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge('wifi')}</td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge('pln')}</td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge('pdam')}</td>
                    <td className="py-3.5 px-4 text-right">
                      {plgUnpaidAmount > 0 ? (
                        <span className="font-bold text-rose-400">{formatRupiah(plgUnpaidAmount)}</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">Lunas Semuanya</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {pelanggan.length > 5 && (
          <p className="text-[10px] text-slate-400 italic text-center mt-3 font-medium">Menampilkan 5 pelanggan teratas. Kelola pelanggan sepenuhnya di Menu Pelanggan.</p>
        )}
      </div>
    </div>
  );
}
