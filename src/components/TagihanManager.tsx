import React, { useState } from 'react';
import { Tagihan, Pelanggan, Area, User, BillType } from '../types';
import { 
  Search, 
  Filter, 
  Plus, 
  Wifi, 
  Zap, 
  Droplet,
  UserCheck,
  Calendar,
  X,
  Edit,
  Trash2,
  Upload,
  AlertCircle
} from 'lucide-react';

interface TagihanManagerProps {
  tagihan: Tagihan[];
  pelanggan: Pelanggan[];
  areas: Area[];
  users: User[];
  currentUser: User;
  onAddTagihan: (t: Omit<Tagihan, 'id' | 'status'>) => void;
  onUpdateTagihan: (t: Tagihan) => void;
  onDeleteTagihan: (id: string) => void;
  onPayTagihanDirectly: (tagihanId: string) => void;
  onImportPembayaran: (imported: {
    pelangganCodeOrName: string;
    type: BillType;
    month: string;
    amount: number;
    paidAt: string;
    referenceNo: string;
    officerUsername?: string;
  }[]) => void;
}

export default function TagihanManager({
  tagihan,
  pelanggan,
  areas,
  users,
  currentUser,
  onAddTagihan,
  onUpdateTagihan,
  onDeleteTagihan,
  onPayTagihanDirectly,
  onImportPembayaran
}: TagihanManagerProps) {
  // Local states
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedOfficer, setSelectedOfficer] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTagihan, setEditingTagihan] = useState<Tagihan | null>(null);

  // Bill Creator Form
  const [targetPelangganId, setTargetPelangganId] = useState('');
  const [billType, setBillType] = useState<BillType>('wifi');
  const [billAmount, setBillAmount] = useState('150000');
  const [billMonth, setBillMonth] = useState('2026-07');
  const [dueDate, setDueDate] = useState('2026-07-20');

  // Import states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Sync state for "petugas area desa sesuaikan kasir pembayaran"
  useState(() => {
    if (currentUser.role === 'kasir' && currentUser.areaId) {
      setSelectedArea(currentUser.areaId);
    }
  });

  const handleCreateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPelangganId || !billAmount || !billMonth) return;

    if (editingTagihan) {
      onUpdateTagihan({
        ...editingTagihan,
        pelangganId: targetPelangganId,
        type: billType,
        amount: Number(billAmount),
        month: billMonth,
        dueDate: dueDate || '2026-07-20',
      });
    } else {
      onAddTagihan({
        pelangganId: targetPelangganId,
        type: billType,
        amount: Number(billAmount),
        month: billMonth,
        dueDate: dueDate || '2026-07-20',
      });
    }

    setIsModalOpen(false);
    setTargetPelangganId('');
    setEditingTagihan(null);
  };

  const handleImportCSVSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess('');

    if (!csvText.trim()) {
      setImportError('Teks data kosong. Silakan tempel atau unggah file.');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        setImportError('Format salah. Butuh setidaknya satu baris header dan satu baris data.');
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const parsedData: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        const rowObj: any = {};
        headers.forEach((h, index) => {
          rowObj[h] = values[index] || '';
        });

        // Resolve customer identification (code or name)
        const mappedPelanggan = rowObj['id_pelanggan'] || rowObj['pelanggan'] || rowObj['nama_pelanggan'] || '';
        
        // Resolve bill type
        const rawType = (rowObj['jenis_tagihan'] || rowObj['jenis_layanan'] || rowObj['type'] || 'wifi').toLowerCase();
        const mappedType = rawType.includes('wifi') ? 'wifi' : rawType.includes('pln') ? 'pln' : 'pdam';

        // Resolve billing month / period
        const mappedMonth = rowObj['periode_bulan'] || rowObj['periode'] || rowObj['month'] || '2026-07';

        // Resolve amount paid
        const mappedAmount = Number(rowObj['jumlah_bayar'] || rowObj['jumlah'] || rowObj['amount'] || 0);

        // Resolve transaction references & metadata
        const mappedRef = rowObj['no_referensi'] || rowObj['id_transaksi'] || rowObj['reference_no'] || '';
        const mappedPaidAt = rowObj['tanggal_bayar'] || rowObj['paid_at'] || new Date().toISOString();
        const mappedOfficer = rowObj['petugas_kasir'] || rowObj['kasir_username'] || '';

        if (!mappedPelanggan) {
          throw new Error(`Data Pelanggan (ID atau Nama) wajib diisi pada baris ke-${i + 1}`);
        }
        if (mappedAmount <= 0) {
          throw new Error(`Jumlah bayar harus berupa angka positif pada baris ke-${i + 1}`);
        }

        parsedData.push({
          pelangganCodeOrName: mappedPelanggan,
          type: mappedType,
          month: mappedMonth,
          amount: mappedAmount,
          paidAt: mappedPaidAt,
          referenceNo: mappedRef,
          officerUsername: mappedOfficer
        });
      }

      if (parsedData.length === 0) {
        setImportError('Tidak ada data pembayaran valid yang diimpor.');
        return;
      }

      onImportPembayaran(parsedData);
      setImportSuccess(`Sukses! Berhasil memproses ${parsedData.length} transaksi pembayaran selesai ke dalam sistem.`);
      setCsvText('');
      setTimeout(() => {
        setIsImportOpen(false);
        setImportSuccess('');
      }, 2000);

    } catch (err: any) {
      setImportError('Gagal memproses data: ' + err.message);
    }
  };

  const getBillIcon = (type: BillType) => {
    switch (type) {
      case 'wifi': return <Wifi className="h-4 w-4 text-blue-400" />;
      case 'pln': return <Zap className="h-4 w-4 text-amber-400" />;
      case 'pdam': return <Droplet className="h-4 w-4 text-cyan-400" />;
    }
  };

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  // Filter bills list (only unpaid bills as requested: "menu tagihan bagi yang belum bayar")
  const unpaidBillsList = tagihan.filter(t => t.status === 'unpaid');

  const filteredUnpaidBills = unpaidBillsList.filter(t => {
    const plg = pelanggan.find(p => p.id === t.pelangganId);
    if (!plg) return false;

    // Search by customer name or code
    const matchesSearch = plg.name.toLowerCase().includes(search.toLowerCase()) || plg.code.toLowerCase().includes(search.toLowerCase());
    
    // Filter by Area
    const matchesArea = selectedArea === 'all' || plg.areaId === selectedArea;

    // Filter by Bill Type
    const matchesType = selectedType === 'all' || t.type === selectedType;

    // Sync according to Officer/Kasir area (petugas area desa)
    let matchesOfficer = true;
    if (selectedOfficer !== 'all') {
      const officerObj = users.find(u => u.id === selectedOfficer);
      if (officerObj && officerObj.areaId) {
        matchesOfficer = plg.areaId === officerObj.areaId;
      } else {
        matchesOfficer = false; // No area linked to this officer
      }
    }

    return matchesSearch && matchesArea && matchesType && matchesOfficer;
  });

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Tagihan Belum Bayar (Menunggak)</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Pantau daftar piutang pelanggan, disinkronkan berdasarkan wilayah dusun dan petugas penagih</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            id="btn-import-pembayaran-toggle-unpaid"
            onClick={() => setIsImportOpen(!isImportOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-400" />
            Impor Pembayaran
          </button>

          {currentUser.role === 'admin' && (
            <button
              id="btn-open-add-bill"
              onClick={() => {
                setEditingTagihan(null);
                setTargetPelangganId(pelanggan[0]?.id || '');
                setBillType('wifi');
                setBillAmount('150000');
                setBillMonth('2026-07');
                setDueDate('2026-07-20');
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Buat Tagihan Manual
            </button>
          )}
        </div>
      </div>

      {/* Import Panel */}
      {isImportOpen && (
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-emerald-400" />
              Unggah / Tempel Data Pembayaran Berhasil
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Dukung copy-paste dari Sheets atau unggah CSV. Header yang direkomendasikan wajib diletakkan di baris pertama:<br/>
              <span className="font-mono bg-white/10 text-white px-1.5 py-0.5 rounded text-[10px]">id_pelanggan, jenis_tagihan, periode_bulan, jumlah_bayar, no_referensi, tanggal_bayar, petugas_kasir</span>
            </p>
          </div>

          <form onSubmit={handleImportCSVSubmit} className="space-y-3">
            <textarea
              id="csv-import-pembayaran"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`id_pelanggan,jenis_tagihan,periode_bulan,jumlah_bayar,no_referensi,tanggal_bayar,petugas_kasir\nPLG-KJT-001,wifi,2026-06,150000,REF-883719,2026-06-15T08:30:00Z,kasir_budi\nPLG-KRJ-002,pln,2026-06,45000,REF-192837,2026-06-16T11:15:00Z,kasir_ani`}
              className="w-full h-28 text-xs font-mono bg-slate-950/60 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/40 text-slate-300"
            />

            {importError && (
              <div className="flex items-start gap-2 text-rose-400 text-xs bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="flex items-start gap-2 text-emerald-400 text-xs bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{importSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-3 py-1.5 border border-white/10 text-slate-400 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Mulai Impor Transaksi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sync Status / Territory Warning for Cashier */}
      {currentUser.role === 'kasir' && currentUser.areaId && (
        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl flex items-start gap-3">
          <UserCheck className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-extrabold text-indigo-300 block uppercase tracking-wider">Sesi Kasir Aktif: Wilayah Anda Terproteksi</span>
            <p className="text-[11px] text-indigo-200 mt-1 leading-relaxed">
              Sistem mendeteksi Anda bertugas di <span className="font-bold text-white">{areas.find(a => a.id === currentUser.areaId)?.name}</span>. Daftar tagihan di bawah disaring otomatis sesuai teritori tanggung jawab Anda untuk meminimalisir kesalahan pelaporan.
            </p>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="glass-card p-4 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            id="search-unpaid"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pelanggan / ID..."
            className="w-full text-xs glass-input rounded-lg py-2 pl-8 pr-3 focus:outline-none transition"
          />
        </div>

        {/* Filter Area */}
        <div>
          <select
            id="filter-unpaid-area"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            disabled={currentUser.role === 'kasir' && !!currentUser.areaId}
            className="w-full text-xs glass-input rounded-lg p-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="all" className="bg-slate-950 text-white">Semua Dusun / Wilayah</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id} className="bg-slate-950 text-white">{a.name}</option>
            ))}
          </select>
        </div>

        {/* Filter Petugas */}
        <div>
          <select
            id="filter-unpaid-officer"
            value={selectedOfficer}
            onChange={(e) => setSelectedOfficer(e.target.value)}
            className="w-full text-xs glass-input rounded-lg p-2 focus:outline-none"
          >
            <option value="all" className="bg-slate-950 text-white">Semua Petugas Lapangan</option>
            {users.filter(u => u.role === 'kasir').map((u) => (
              <option key={u.id} value={u.id} className="bg-slate-950 text-white">{u.name} ({areas.find(a => a.id === u.areaId)?.name || 'Multi-Area'})</option>
            ))}
          </select>
        </div>

        {/* Filter Jenis */}
        <div>
          <select
            id="filter-unpaid-type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full text-xs glass-input rounded-lg p-2 focus:outline-none"
          >
            <option value="all" className="bg-slate-950 text-white">Semua Utilitas</option>
            <option value="wifi" className="bg-slate-950 text-white">WiFi Internet</option>
            <option value="pln" className="bg-slate-950 text-white">Listrik PLN</option>
            <option value="pdam" className="bg-slate-950 text-white">PDAM Air Bersih</option>
          </select>
        </div>
      </div>

      {/* Bill List Grid/Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Jenis & Bulan</th>
                <th className="py-3 px-4">Kode ID Meter / Pelanggan</th>
                <th className="py-3 px-4 text-right">Nominal Tagihan</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4 text-center">Aksi Loket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredUnpaidBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 italic font-medium">
                    Semua tagihan lunas! Tidak ada tagihan menunggak yang sesuai filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredUnpaidBills.map((t) => {
                  const plg = pelanggan.find(p => p.id === t.pelangganId);
                  if (!plg) return null;

                  const areaName = areas.find(a => a.id === plg.areaId)?.name || 'N/A';
                  const meterId = t.type === 'pln' ? plg.plnId : t.type === 'pdam' ? plg.pdamId : plg.code;

                  return (
                    <tr key={t.id} className="hover:bg-white/5 transition duration-150">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white block">{plg.name}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block font-semibold">{areaName} • {plg.phone}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-white uppercase">
                          {getBillIcon(t.type)}
                          {t.type}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Periode {t.month}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px] font-semibold">
                        {meterId || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-rose-400 text-sm">
                        {formatRupiah(t.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          {t.dueDate}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`btn-pay-${t.id}`}
                            onClick={() => {
                              if (confirm(`Proses pembayaran tagihan ${t.type.toUpperCase()} sebesar ${formatRupiah(t.amount)} atas nama ${plg.name}?`)) {
                                onPayTagihanDirectly(t.id);
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-[10px] font-bold uppercase cursor-pointer tracking-wide transition duration-150"
                          >
                            Bayar Loket
                          </button>
                          
                          {currentUser.role === 'admin' && (
                            <>
                              <button
                                id={`edit-tag-${t.id}`}
                                onClick={() => {
                                  setEditingTagihan(t);
                                  setTargetPelangganId(t.pelangganId);
                                  setBillType(t.type);
                                  setBillAmount(String(t.amount));
                                  setBillMonth(t.month);
                                  setDueDate(t.dueDate);
                                  setIsModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                                title="Edit Tagihan"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                id={`delete-tag-${t.id}`}
                                onClick={() => {
                                  if (confirm(`Hapus tagihan ${t.type.toUpperCase()} sebesar ${formatRupiah(t.amount)} atas nama ${plg.name}?`)) {
                                    onDeleteTagihan(t.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition cursor-pointer"
                                title="Hapus Tagihan"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Bill Creator Modal (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {editingTagihan ? 'Edit Tagihan Pelanggan' : 'Buat Tagihan Manual Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pilih Pelanggan</label>
                <select
                  id="form-bill-pelanggan"
                  required
                  value={targetPelangganId}
                  onChange={(e) => setTargetPelangganId(e.target.value)}
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                >
                  {pelanggan.map((p) => {
                    const areaName = areas.find(a => a.id === p.areaId)?.name || '';
                    return (
                      <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.name} ({areaName})</option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Jenis Utilitas</label>
                  <select
                    id="form-bill-type"
                    value={billType}
                    onChange={(e) => {
                      const type = e.target.value as BillType;
                      setBillType(type);
                      if (type === 'wifi') setBillAmount('150000');
                      else if (type === 'pln') setBillAmount('185000');
                      else setBillAmount('45000');
                    }}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  >
                    <option value="wifi" className="bg-slate-950 text-white">WiFi Internet</option>
                    <option value="pln" className="bg-slate-950 text-white">Listrik PLN</option>
                    <option value="pdam" className="bg-slate-950 text-white">PDAM Air Bersih</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nominal Rupiah (Rp)</label>
                  <input
                    id="form-bill-amount"
                    type="number"
                    required
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="150000"
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Periode Bulan</label>
                  <input
                    id="form-bill-month"
                    type="month"
                    required
                    value={billMonth}
                    onChange={(e) => setBillMonth(e.target.value)}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Jatuh Tempo</label>
                  <input
                    id="form-bill-due"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/5 border border-white/5 text-slate-300 rounded-lg text-xs font-bold hover:bg-white/10 cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 glass-btn-primary rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  {editingTagihan ? 'Simpan Perubahan' : 'Buat Tagihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
