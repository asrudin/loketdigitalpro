import React, { useState } from 'react';
import { CashFlow } from '../types';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  FileText,
  X,
  Briefcase,
  Upload,
  AlertCircle
} from 'lucide-react';

interface KeuanganManagerProps {
  cashFlow: CashFlow[];
  onAddCashFlow: (cf: Omit<CashFlow, 'id'>) => void;
  onUpdateCashFlow: (cf: CashFlow) => void;
  onDeleteCashFlow: (id: string) => void;
  onImportCashFlow: (flows: Omit<CashFlow, 'id'>[]) => void;
}

export default function KeuanganManager({
  cashFlow,
  onAddCashFlow,
  onUpdateCashFlow,
  onDeleteCashFlow,
  onImportCashFlow
}: KeuanganManagerProps) {
  // Local states
  const [reportPeriod, setReportPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('bulanan');
  const [selectedDateFilter, setSelectedDateFilter] = useState(''); // for custom date filter
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingCashFlow, setEditingCashFlow] = useState<CashFlow | null>(null);

  // Cashflow Form states
  const [type, setType] = useState<'masuk' | 'keluar'>('masuk');
  const [category, setCategory] = useState('Operasional');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Import states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

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
      const parsedData: Omit<CashFlow, 'id'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        const rowObj: any = {};
        headers.forEach((h, index) => {
          rowObj[h] = values[index] || '';
        });

        const mappedDate = rowObj['tanggal'] || rowObj['date'] || new Date().toISOString().split('T')[0];
        const rawType = (rowObj['tipe'] || rowObj['type'] || 'masuk').toLowerCase();
        const mappedType: 'masuk' | 'keluar' = rawType.includes('keluar') || rawType === 'out' ? 'keluar' : 'masuk';
        const mappedCategory = rowObj['kategori'] || rowObj['category'] || 'Operasional';
        const mappedAmount = Number(rowObj['nominal'] || rowObj['amount'] || rowObj['jumlah'] || 0);
        const mappedDesc = rowObj['keterangan'] || rowObj['description'] || '';

        if (mappedAmount <= 0) {
          throw new Error(`Jumlah nominal harus berupa angka positif pada baris ke-${i + 1}`);
        }

        parsedData.push({
          type: mappedType,
          category: mappedCategory,
          amount: mappedAmount,
          date: mappedDate,
          description: mappedDesc
        });
      }

      if (parsedData.length === 0) {
        setImportError('Tidak ada baris data kas valid yang diimpor.');
        return;
      }

      onImportCashFlow(parsedData);
      setImportSuccess(`Sukses! Berhasil mengimpor ${parsedData.length} catatan keuangan kas keluar-masuk baru.`);
      setCsvText('');
      setTimeout(() => {
        setIsImportOpen(false);
        setImportSuccess('');
      }, 2000);

    } catch (err: any) {
      setImportError('Gagal memproses data kas: ' + err.message);
    }
  };

  // Calculations
  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const handleAddFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;

    if (editingCashFlow) {
      onUpdateCashFlow({
        ...editingCashFlow,
        type,
        category,
        amount: Number(amount),
        date,
        description
      });
    } else {
      onAddCashFlow({
        type,
        category,
        amount: Number(amount),
        date,
        description
      });
    }

    setIsModalOpen(false);
    setAmount('');
    setDescription('');
    setCategory('Operasional');
    setEditingCashFlow(null);
  };

  // Filter & Report Engine
  const filteredCashFlows = cashFlow.filter(cf => {
    const matchesSearch = cf.category.toLowerCase().includes(search.toLowerCase()) || 
                          cf.description.toLowerCase().includes(search.toLowerCase());
    
    // Period filter
    if (selectedDateFilter) {
      return matchesSearch && cf.date === selectedDateFilter;
    }

    // Default filter harian, mingguan, bulanan
    const cfDate = new Date(cf.date);
    const today = new Date();
    
    if (reportPeriod === 'harian') {
      const todayStr = today.toISOString().split('T')[0];
      return matchesSearch && cf.date === todayStr;
    } else if (reportPeriod === 'mingguan') {
      // within 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);
      return matchesSearch && cfDate >= oneWeekAgo && cfDate <= today;
    } else {
      // Bulanan (within current month)
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      return matchesSearch && cfDate.getMonth() === currentMonth && cfDate.getFullYear() === currentYear;
    }
  });

  const totalMasuk = filteredCashFlows.filter(cf => cf.type === 'masuk').reduce((sum, cf) => sum + cf.amount, 0);
  const totalKeluar = filteredCashFlows.filter(cf => cf.type === 'keluar').reduce((sum, cf) => sum + cf.amount, 0);
  const saldoNetto = totalMasuk - totalKeluar;

  // Export ledger to CSV (Excel)
  const handleExportCSV = () => {
    const headers = ['ID_TRANSAKSI', 'TANGGAL', 'TIPE', 'KATEGORI', 'DEBET_MASUK', 'KREDIT_KELUAR', 'KETERANGAN'];
    const rows = filteredCashFlows.map(cf => {
      return [
        cf.id,
        cf.date,
        cf.type.toUpperCase(),
        `"${cf.category}"`,
        cf.type === 'masuk' ? cf.amount : 0,
        cf.type === 'keluar' ? cf.amount : 0,
        `"${cf.description.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Keuangan_Desa_${reportPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Out Report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Arus Kas & Pembukuan Desa</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Pantau likuiditas kas masuk dari pembayaran dan kas keluar operasional</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            id="btn-import-kas-toggle"
            onClick={() => setIsImportOpen(!isImportOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold cursor-pointer transition"
          >
            <Upload className="h-3.5 w-3.5 text-emerald-400" />
            Impor Kas
          </button>
          <button
            id="btn-print-report"
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-bold border border-white/10 cursor-pointer transition"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak Laporan
          </button>
          <button
            id="btn-export-kas"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-bold border border-white/10 cursor-pointer transition"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor Excel (CSV)
          </button>
          <button
            id="btn-add-cashflow"
            onClick={() => {
              setEditingCashFlow(null);
              setType('masuk');
              setCategory('Pembayaran WiFi');
              setAmount('');
              setDescription('');
              setDate(new Date().toISOString().split('T')[0]);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-bold cursor-pointer transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Catat Aliran Kas
          </button>
        </div>
      </div>

      {/* Import Section */}
      {isImportOpen && (
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-emerald-400" />
              Unggah / Tempel Catatan Keuangan Arus Kas
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Dukung impor massal dari Excel atau Google Sheets. Kolom baris pertama wajib diletakkan di baris pertama:<br/>
              <span className="font-mono bg-white/10 text-white px-1.5 py-0.5 rounded text-[10px]">tanggal, tipe, kategori, nominal, keterangan</span>
            </p>
          </div>

          <form onSubmit={handleImportCSVSubmit} className="space-y-3">
            <textarea
              id="csv-import-kas"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`tanggal,tipe,kategori,nominal,keterangan\n2026-06-01,masuk,Pembayaran WiFi,150000,Pembayaran WiFi Wifi_01 pelanggan A\n2026-06-02,keluar,Operasional,350000,Sewa server cloud loket digital`}
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
                Mulai Impor Kas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reports Filters bar (Harian, Mingguan, Bulanan) */}
      <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-lg w-full md:w-auto">
          {(['harian', 'mingguan', 'bulanan'] as const).map((period) => (
            <button
              id={`tab-period-${period}`}
              key={period}
              onClick={() => {
                setReportPeriod(period);
                setSelectedDateFilter('');
              }}
              className={`flex-1 md:flex-initial text-center px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider cursor-pointer transition ${
                reportPeriod === period && !selectedDateFilter
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Date Picker Custom Filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto justify-end items-center">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Tanggal Spesifik:</span>
            <input
              id="filter-date-custom"
              type="date"
              value={selectedDateFilter}
              onChange={(e) => {
                setSelectedDateFilter(e.target.value);
              }}
              className="text-xs glass-input rounded-lg p-2 focus:outline-none w-full sm:w-auto"
            />
          </div>

          <div className="relative w-full sm:w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              id="search-ledger"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari deskripsi..."
              className="w-full text-xs glass-input rounded-lg py-2 pl-8 pr-3 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Report Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Pemasukan */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Pemasukan ({reportPeriod})</span>
            <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">{formatRupiah(totalMasuk)}</span>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <TrendingDown className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Pengeluaran ({reportPeriod})</span>
            <span className="text-base font-extrabold text-rose-400 mt-0.5 block">{formatRupiah(totalKeluar)}</span>
          </div>
        </div>

        {/* Saldo Netto */}
        <div className="glass-card p-4 rounded-xl flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Briefcase className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Surplus / Defisit Kas</span>
            <span className={`text-base font-extrabold mt-0.5 block ${saldoNetto >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatRupiah(saldoNetto)}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div id="ledger-printable-table" className="glass-card rounded-2xl overflow-hidden shadow-lg border border-white/10">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-400" />
            Buku Kas Umum Desa (Bulan Berjalan)
          </span>
          <span className="text-[10px] font-semibold text-slate-400 italic">Format Cetak Laporan Sah</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Kategori Aliran</th>
                <th className="py-3 px-4">Keterangan Transaksi</th>
                <th className="py-3 px-4 text-right">Debet (Masuk)</th>
                <th className="py-3 px-4 text-right">Kredit (Keluar)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredCashFlows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 italic font-medium">
                    Belum ada pencatatan arus kas pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredCashFlows.map((cf) => {
                  return (
                    <tr key={cf.id} className="hover:bg-white/5 transition duration-150">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400 whitespace-nowrap">
                        {cf.date}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          cf.type === 'masuk'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          {cf.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {cf.description}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-white">
                        {cf.type === 'masuk' ? formatRupiah(cf.amount) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-white">
                        {cf.type === 'keluar' ? formatRupiah(cf.amount) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {cf.referenceId ? (
                          <span className="text-[10px] text-slate-500 italic">Sistem Tagihan</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              id={`edit-cashflow-${cf.id}`}
                              onClick={() => {
                                setEditingCashFlow(cf);
                                setType(cf.type);
                                setCategory(cf.category);
                                setAmount(String(cf.amount));
                                setDate(cf.date);
                                setDescription(cf.description);
                                setIsModalOpen(true);
                              }}
                              className="text-[10px] text-slate-400 hover:text-white cursor-pointer transition font-bold"
                            >
                              Edit
                            </button>
                            <span className="text-white/10">|</span>
                            <button
                              id={`delete-cashflow-${cf.id}`}
                              onClick={() => {
                                if (confirm('Hapus transaksi pembukuan ini?')) {
                                  onDeleteCashFlow(cf.id);
                                }
                              }}
                              className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer transition font-bold"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cashflow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {editingCashFlow ? 'Edit Catatan Arus Kas' : 'Catat Aliran Arus Kas Buku'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddFlow} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Arah Arus Kas</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setType('masuk');
                      setCategory('Pembayaran WiFi');
                    }}
                    className={`flex-1 text-[11px] font-bold py-2 px-3 rounded-lg border text-center cursor-pointer transition ${
                      type === 'masuk'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border-white/5'
                    }`}
                  >
                    Dana Masuk (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('keluar');
                      setCategory('Operasional');
                    }}
                    className={`flex-1 text-[11px] font-bold py-2 px-3 rounded-lg border text-center cursor-pointer transition ${
                      type === 'keluar'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-white/5 text-slate-400 border-white/5'
                    }`}
                  >
                    Dana Keluar (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori Aliran</label>
                {type === 'masuk' ? (
                  <select
                    id="cf-form-cat-in"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  >
                    <option value="Pembayaran WiFi">Pembayaran WiFi</option>
                    <option value="Pembayaran Listrik">Pembayaran Listrik</option>
                    <option value="Pembayaran PDAM">Pembayaran PDAM</option>
                    <option value="Penerimaan Hibah">Penerimaan Hibah / Subsidi</option>
                    <option value="Lain-lain">Pendapatan Lain-lain</option>
                  </select>
                ) : (
                  <select
                    id="cf-form-cat-out"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  >
                    <option value="Operasional">Operasional Kantor</option>
                    <option value="Pemeliharaan Alat">Pemeliharaan Alat (Kabel/Pipa)</option>
                    <option value="Gaji Petugas">Gaji Petugas / Insentif</option>
                    <option value="Konsumsi Rapat">Konsumsi Rapat / Keperluan</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nominal (Rp)</label>
                  <input
                    id="cf-form-amount"
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="250000"
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal</label>
                  <input
                    id="cf-form-date"
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Deskripsi Keterangan</label>
                <textarea
                  id="cf-form-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Pembelian kabel Dropcore FO 2 rol..."
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                />
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
                  {editingCashFlow ? 'Simpan Transaksi' : 'Catat Aliran Kas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
