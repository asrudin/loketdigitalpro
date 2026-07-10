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

  // Print Report Dialog States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMonth, setPrintMonth] = useState<number>(new Date().getMonth());
  const [printYear, setPrintYear] = useState<number>(new Date().getFullYear());
  const [treasurerName, setTreasurerName] = useState('Siti Rahma, S.E.');
  const [villageHeadName, setVillageHeadName] = useState('H. Ahmad Fauzi');
  const [printDate, setPrintDate] = useState(new Date().toISOString().split('T')[0]);

  const monthsList = [
    { value: 0, label: 'Januari' },
    { value: 1, label: 'Februari' },
    { value: 2, label: 'Maret' },
    { value: 3, label: 'April' },
    { value: 4, label: 'Mei' },
    { value: 5, label: 'Juni' },
    { value: 6, label: 'Juli' },
    { value: 7, label: 'Agustus' },
    { value: 8, label: 'September' },
    { value: 9, label: 'Oktober' },
    { value: 10, label: 'November' },
    { value: 11, label: 'Desember' }
  ];

  const yearsList = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // Filter flows for print
  const reportFlows = cashFlow.filter(cf => {
    const d = new Date(cf.date);
    return d.getMonth() === printMonth && d.getFullYear() === printYear;
  });

  const reportTotalMasuk = reportFlows.filter(cf => cf.type === 'masuk').reduce((sum, cf) => sum + cf.amount, 0);
  const reportTotalKeluar = reportFlows.filter(cf => cf.type === 'keluar').reduce((sum, cf) => sum + cf.amount, 0);
  const reportSaldoNetto = reportTotalMasuk - reportTotalKeluar;

  // Aggregate by Category for summary inside report
  const reportIncomingByCat = reportFlows.filter(cf => cf.type === 'masuk').reduce((acc, cf) => {
    acc[cf.category] = (acc[cf.category] || 0) + cf.amount;
    return acc;
  }, {} as Record<string, number>);

  const reportOutgoingByCat = reportFlows.filter(cf => cf.type === 'keluar').reduce((acc, cf) => {
    acc[cf.category] = (acc[cf.category] || 0) + cf.amount;
    return acc;
  }, {} as Record<string, number>);

  const formatIndonesianDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${monthsList[monthIdx]?.label || ''} ${year}`;
  };

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

  const downloadCSVEnergyTemplate = () => {
    const csvContent = "\uFEFF" + "tanggal,tipe,kategori,nominal,keterangan\n" +
      "2026-07-01,masuk,Pembayaran WiFi,150000,Pembayaran WiFi pelanggan Budi Setiawan\n" +
      "2026-07-02,keluar,Operasional,350000,Pembelian ATK dan cetak kwitansi fisik\n" +
      "2026-07-05,masuk,Iuran Air Bersih,45000,Iuran PDAM pelanggan Siti Aisyah\n" +
      "2026-07-10,keluar,Pemeliharaan,750000,Perbaikan pipa pompa air utama dusun krajan";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "template_arus_kas_loket.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      setImportSuccess(`File "${file.name}" berhasil diunggah! Silakan klik tombol "Mulai Impor Kas" di bawah untuk memproses.`);
    };
    reader.onerror = () => {
      setImportError("Gagal membaca file.");
    };
    reader.readAsText(file);
  };

  const handleImportCSVSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess('');

    if (!csvText.trim()) {
      setImportError('Teks data kosong. Silakan tempel teks atau unggah file.');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        setImportError('Format salah. Butuh setidaknya satu baris header dan satu baris data.');
        return;
      }

      // Auto-detect delimiter (comma or semicolon)
      const firstLine = lines[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      
      const headers = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, '').replace(/^\uFEFF/, ''));
      const parsedData: Omit<CashFlow, 'id'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // Regexp splitting based on detected delimiter, respecting quotes
        const regex = delimiter === ';'
          ? /;(?=(?:(?:[^"]*"){2})*[^"]*$)/
          : /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

        const values = lines[i].split(regex).map(v => v.trim().replace(/^"|"$/g, ''));
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

        if (isNaN(mappedAmount) || mappedAmount <= 0) {
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
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-bold cursor-pointer transition"
          >
            <Printer className="h-3.5 w-3.5" />
            Cetak Laporan Bulanan
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
              Impor Massal Catatan Arus Kas Keuangan
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Dukung impor data cepat secara massal menggunakan file Excel (.csv) atau copy-paste dari spreadsheet Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Interactive File Picker Card */}
            <div className="border border-dashed border-white/10 hover:border-emerald-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-white/5 hover:bg-white/10 transition duration-200 relative cursor-pointer group">
              <input
                type="file"
                id="csv-file-input"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <Upload className="h-7 w-7 text-emerald-400 mb-2 group-hover:scale-110 transition duration-200" />
              <span className="text-xs font-bold text-slate-200 group-hover:text-white transition duration-200">
                Pilih atau Seret File Excel (CSV)
              </span>
              <span className="text-[10px] text-slate-400 mt-1">Mendukung file .csv atau .txt</span>
            </div>

            {/* Template Download Guide */}
            <div className="glass-card p-4 rounded-2xl flex flex-col justify-between border border-white/5 bg-white/2">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Format Template Kas</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Kolom wajib baris pertama: <code className="text-[10px] font-mono bg-white/10 px-1 py-0.5 rounded text-white">tanggal, tipe, kategori, nominal, keterangan</code>
                </p>
              </div>
              <button
                type="button"
                onClick={downloadCSVEnergyTemplate}
                className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Unduh Template Excel (CSV)
              </button>
            </div>
          </div>

          <form onSubmit={handleImportCSVSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Atau Tempel / Sunting Teks CSV
              </label>
              <textarea
                id="csv-import-kas"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`tanggal,tipe,kategori,nominal,keterangan\n2026-07-01,masuk,Pembayaran WiFi,150000,Pembayaran WiFi pelanggan Budi Setiawan\n2026-07-02,keluar,Operasional,350000,Sewa server cloud loket digital`}
                className="w-full h-28 text-xs font-mono bg-slate-950/60 border border-white/10 rounded-xl p-3 focus:outline-none focus:border-emerald-500/40 text-slate-300"
              />
            </div>

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

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsImportOpen(false);
                  setCsvText('');
                  setImportError('');
                  setImportSuccess('');
                }}
                className="px-4 py-2 border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition cursor-pointer shadow-md shadow-emerald-500/15"
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

      {/* Cetak Laporan Bulanan Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel-heavy w-full max-w-5xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col my-8">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cetak Laporan Bulanan Resmi</h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Konfigurasi data, nama penandatangan, dan cetak laporan arus kas bulanan</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto max-h-[calc(100vh-180px)]">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-4 space-y-4">
                <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Filter Periode</h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Bulan Laporan</label>
                    <select
                      value={printMonth}
                      onChange={(e) => setPrintMonth(Number(e.target.value))}
                      className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                    >
                      {monthsList.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tahun Laporan</label>
                    <select
                      value={printYear}
                      onChange={(e) => setPrintYear(Number(e.target.value))}
                      className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Pengesahan (Tanda Tangan)</h3>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Bendahara</label>
                    <input
                      type="text"
                      value={treasurerName}
                      onChange={(e) => setTreasurerName(e.target.value)}
                      placeholder="Siti Rahma, S.E."
                      className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Owner</label>
                    <input
                      type="text"
                      value={villageHeadName}
                      onChange={(e) => setVillageHeadName(e.target.value)}
                      placeholder="H. Ahmad Fauzi"
                      className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Cetak Dokumen</label>
                    <input
                      type="date"
                      value={printDate}
                      onChange={(e) => setPrintDate(e.target.value)}
                      className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/5 text-slate-300 rounded-xl text-xs font-bold hover:bg-white/10 cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 cursor-pointer transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                  >
                    <Printer className="h-4 w-4" />
                    Cetak Fisik / PDF
                  </button>
                </div>
              </div>

              {/* Right Column: Live High-fidelity Print Preview */}
              <div className="lg:col-span-8 flex flex-col space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Pratinjau Kertas Resmi (A4)
                </span>
                
                <div className="flex-1 max-h-[520px] overflow-y-auto bg-white p-8 rounded-2xl shadow-inner text-black border border-slate-300/40 relative font-serif">
                  {/* Kop Surat Desa */}
                  <div className="text-center border-b-[3px] border-double border-black pb-4 mb-5">
                    <h4 className="text-base font-extrabold tracking-wide uppercase text-black leading-tight">PENGELOLA LAYANAN AIR BERSIH</h4>
                    <h5 className="text-sm font-extrabold tracking-wide uppercase text-black leading-tight">LOKET DIGITAL PRO • KEMBLENGAN</h5>
                    <p className="text-[9px] text-gray-700 italic mt-0.5">Kemblengan, Jawa Timur | Telp: 0812-3456-7890</p>
                  </div>

                  {/* Judul Laporan */}
                  <div className="text-center mb-6">
                    <h3 className="text-xs font-bold tracking-wider uppercase text-black underline">LAPORAN PERTANGGUNGJAWABAN REALISASI ARUS KAS BULANAN</h3>
                    <p className="text-[10px] font-medium text-black uppercase mt-1">Periode: {monthsList[printMonth]?.label} {printYear}</p>
                  </div>

                  {/* Ringkasan Finansial */}
                  <div className="grid grid-cols-3 border border-black rounded divide-x divide-black mb-6 bg-slate-50 text-[10px]">
                    <div className="p-3 text-center">
                      <span className="font-bold block text-gray-700 uppercase text-[8px] tracking-wide mb-1">TOTAL PEMASUKAN</span>
                      <span className="font-mono text-xs font-bold text-black">{formatRupiah(reportTotalMasuk)}</span>
                    </div>
                    <div className="p-3 text-center">
                      <span className="font-bold block text-gray-700 uppercase text-[8px] tracking-wide mb-1">TOTAL PENGELUARAN</span>
                      <span className="font-mono text-xs font-bold text-black">{formatRupiah(reportTotalKeluar)}</span>
                    </div>
                    <div className="p-3 text-center bg-gray-100">
                      <span className="font-bold block text-gray-700 uppercase text-[8px] tracking-wide mb-1">SURPLUS / DEFISIT BERSIH</span>
                      <span className={`font-mono text-xs font-bold ${reportSaldoNetto >= 0 ? 'text-black' : 'text-red-700'}`}>
                        {formatRupiah(reportSaldoNetto)}
                      </span>
                    </div>
                  </div>

                  {/* Kategori Breakdown */}
                  <div className="grid grid-cols-2 gap-4 mb-6 text-[9px] font-sans">
                    {/* Rekap Pemasukan */}
                    <div className="border border-black p-2 rounded">
                      <p className="font-extrabold uppercase bg-gray-100 text-black px-2 py-1 border-b border-black text-center mb-2">REKAPITULASI PEMASUKAN</p>
                      {Object.keys(reportIncomingByCat).length === 0 ? (
                        <p className="text-[9px] text-gray-500 text-center py-2 italic">Tidak ada pendapatan</p>
                      ) : (
                        <table className="w-full">
                          <tbody>
                            {Object.entries(reportIncomingByCat).map(([cat, amt]) => (
                              <tr key={cat} className="border-b border-gray-100 last:border-0">
                                <td className="py-1 text-gray-800">{cat}</td>
                                <td className="py-1 text-right font-bold text-black font-mono">{formatRupiah(amt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Rekap Pengeluaran */}
                    <div className="border border-black p-2 rounded">
                      <p className="font-extrabold uppercase bg-gray-100 text-black px-2 py-1 border-b border-black text-center mb-2">REKAPITULASI PENGELUARAN</p>
                      {Object.keys(reportOutgoingByCat).length === 0 ? (
                        <p className="text-[9px] text-gray-500 text-center py-2 italic">Tidak ada pengeluaran</p>
                      ) : (
                        <table className="w-full">
                          <tbody>
                            {Object.entries(reportOutgoingByCat).map(([cat, amt]) => (
                              <tr key={cat} className="border-b border-gray-100 last:border-0">
                                <td className="py-1 text-gray-800">{cat}</td>
                                <td className="py-1 text-right font-bold text-black font-mono">{formatRupiah(amt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Rincian Transaksi */}
                  <div className="mb-8 font-sans">
                    <p className="text-[9px] font-extrabold uppercase mb-2">RINCIAN JURNAL TRANSAKSI KAS MASUK-KELUAR :</p>
                    <table className="w-full text-left border-collapse border border-black text-[8px]">
                      <thead>
                        <tr className="border-b border-black bg-gray-100 font-bold uppercase text-black text-[7.5px]">
                          <th className="py-1.5 px-2 border-r border-black w-14">Tanggal</th>
                          <th className="py-1.5 px-2 border-r border-black w-24">Kategori</th>
                          <th className="py-1.5 px-2 border-r border-black">Keterangan</th>
                          <th className="py-1.5 px-2 border-r border-black text-right w-20">Debet (Masuk)</th>
                          <th className="py-1.5 px-2 text-right w-20">Kredit (Keluar)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/80">
                        {reportFlows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center italic text-gray-500">
                              Tidak ada catatan transaksi keuangan pada periode ini.
                            </td>
                          </tr>
                        ) : (
                          reportFlows.map((cf) => (
                            <tr key={cf.id} className="align-top">
                              <td className="py-1.5 px-2 border-r border-black font-mono font-bold text-gray-700">{cf.date}</td>
                              <td className="py-1.5 px-2 border-r border-black font-bold uppercase">{cf.category}</td>
                              <td className="py-1.5 px-2 border-r border-black text-gray-800">{cf.description}</td>
                              <td className="py-1.5 px-2 border-r border-black text-right font-mono font-bold text-black">
                                {cf.type === 'masuk' ? formatRupiah(cf.amount) : '-'}
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono font-bold text-black">
                                {cf.type === 'keluar' ? formatRupiah(cf.amount) : '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Tanda Tangan Pengesahan */}
                  <div className="grid grid-cols-2 text-center text-[9px] font-sans gap-8 mt-12 pt-4">
                    <div>
                      <p className="font-bold mb-12">
                        Mengetahui,<br/>
                        Owner
                      </p>
                      <p className="font-bold text-black underline uppercase">{villageHeadName || 'H. Ahmad Fauzi'}</p>
                      <p className="text-[8px] text-gray-500 mt-0.5">Kemblengan</p>
                    </div>

                    <div>
                      <p className="font-bold mb-12 text-gray-900">
                        Kemblengan, {formatIndonesianDate(printDate)}<br/>
                        Dibuat Oleh,<br/>
                        Bendahara
                      </p>
                      <p className="font-bold text-black underline uppercase">{treasurerName || 'Siti Rahma, S.E.'}</p>
                      <p className="text-[8px] text-gray-500 mt-0.5">Kemblengan</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 
        This is a hidden, print-only wrapper.
        The styles in the injected CSS block make this block display: block !important ONLY during media-print execution.
      */}
      <div id="printable-monthly-report-container" className="hidden font-serif">
        {/* Kop Surat Desa */}
        <div className="text-center border-b-[4px] border-double border-black pb-4 mb-6">
          <h1 className="text-lg font-extrabold tracking-wide uppercase text-black leading-tight">PENGELOLA LAYANAN AIR BERSIH</h1>
          <h2 className="text-base font-extrabold tracking-wide uppercase text-black leading-tight">LOKET DIGITAL PRO • KEMBLENGAN</h2>
          <p className="text-[10px] text-gray-800 italic mt-0.5">Kemblengan, Jawa Timur | Telp: 0812-3456-7890</p>
        </div>

        {/* Judul Laporan */}
        <div className="text-center mb-6">
          <h2 className="text-sm font-extrabold tracking-wider uppercase text-black underline">LAPORAN PERTANGGUNGJAWABAN REALISASI ARUS KAS BULANAN</h2>
          <p className="text-[11px] font-bold text-black uppercase mt-1">Periode: {monthsList[printMonth]?.label} {printYear}</p>
        </div>

        {/* Ringkasan Finansial */}
        <div className="grid grid-cols-3 border border-black divide-x divide-black mb-6 bg-gray-50 text-[10px]">
          <div className="p-3 text-center">
            <span className="font-extrabold block text-gray-700 uppercase text-[8px] tracking-wide mb-1">TOTAL PEMASUKAN</span>
            <span className="font-mono text-xs font-bold text-black">{formatRupiah(reportTotalMasuk)}</span>
          </div>
          <div className="p-3 text-center">
            <span className="font-extrabold block text-gray-700 uppercase text-[8px] tracking-wide mb-1">TOTAL PENGELUARAN</span>
            <span className="font-mono text-xs font-bold text-black">{formatRupiah(reportTotalKeluar)}</span>
          </div>
          <div className="p-3 text-center bg-gray-100">
            <span className="font-extrabold block text-gray-700 uppercase text-[8px] tracking-wide mb-1">SURPLUS / DEFISIT BERSIH</span>
            <span className={`font-mono text-xs font-bold ${reportSaldoNetto >= 0 ? 'text-black' : 'text-red-700'}`}>
              {formatRupiah(reportSaldoNetto)}
            </span>
          </div>
        </div>

        {/* Kategori Breakdown */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-[9px] font-sans">
          {/* Rekap Pemasukan */}
          <div className="border border-black p-3 rounded">
            <p className="font-extrabold uppercase bg-gray-100 text-black px-2 py-1 border-b border-black text-center mb-2">REKAPITULASI PEMASUKAN</p>
            {Object.keys(reportIncomingByCat).length === 0 ? (
              <p className="text-[9px] text-gray-500 text-center py-2 italic">Tidak ada pendapatan</p>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {Object.entries(reportIncomingByCat).map(([cat, amt]) => (
                    <tr key={cat} className="border-b border-gray-200 last:border-0">
                      <td className="py-1 text-gray-800">{cat}</td>
                      <td className="py-1 text-right font-bold text-black font-mono">{formatRupiah(amt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Rekap Pengeluaran */}
          <div className="border border-black p-3 rounded">
            <p className="font-extrabold uppercase bg-gray-100 text-black px-2 py-1 border-b border-black text-center mb-2">REKAPITULASI PENGELUARAN</p>
            {Object.keys(reportOutgoingByCat).length === 0 ? (
              <p className="text-[9px] text-gray-500 text-center py-2 italic">Tidak ada pengeluaran</p>
            ) : (
              <table className="w-full border-collapse">
                <tbody>
                  {Object.entries(reportOutgoingByCat).map(([cat, amt]) => (
                    <tr key={cat} className="border-b border-gray-200 last:border-0">
                      <td className="py-1 text-gray-800">{cat}</td>
                      <td className="py-1 text-right font-bold text-black font-mono">{formatRupiah(amt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Rincian Transaksi */}
        <div className="mb-8 font-sans">
          <p className="text-[9px] font-extrabold uppercase mb-2">RINCIAN JURNAL TRANSAKSI KAS MASUK-KELUAR :</p>
          <table className="w-full text-left border-collapse border border-black text-[8px]">
            <thead>
              <tr className="border-b border-black bg-gray-100 font-bold uppercase text-black text-[7.5px]">
                <th className="py-1.5 px-2 border-r border-black w-14">Tanggal</th>
                <th className="py-1.5 px-2 border-r border-black w-24">Kategori</th>
                <th className="py-1.5 px-2 border-r border-black">Keterangan</th>
                <th className="py-1.5 px-2 border-r border-black text-right w-20">Debet (Masuk)</th>
                <th className="py-1.5 px-2 text-right w-20">Kredit (Keluar)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {reportFlows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center italic text-gray-500">
                    Tidak ada catatan transaksi keuangan pada periode ini.
                  </td>
                </tr>
              ) : (
                reportFlows.map((cf) => (
                  <tr key={cf.id} className="align-top">
                    <td className="py-1.5 px-2 border-r border-black font-mono font-bold text-gray-700">{cf.date}</td>
                    <td className="py-1.5 px-2 border-r border-black font-bold uppercase">{cf.category}</td>
                    <td className="py-1.5 px-2 border-r border-black text-gray-800">{cf.description}</td>
                    <td className="py-1.5 px-2 border-r border-black text-right font-mono font-bold text-black">
                      {cf.type === 'masuk' ? formatRupiah(cf.amount) : '-'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-black">
                      {cf.type === 'keluar' ? formatRupiah(cf.amount) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan Pengesahan */}
        <div className="grid grid-cols-2 text-center text-[10px] font-sans gap-8 mt-12 pt-4">
          <div>
            <p className="font-bold mb-14">
              Mengetahui,<br/>
              Owner
            </p>
            <p className="font-bold text-black underline uppercase">{villageHeadName}</p>
            <p className="text-[8px] text-gray-500 mt-0.5">Kemblengan</p>
          </div>

          <div>
            <p className="font-bold mb-14 text-gray-900">
              Kemblengan, {formatIndonesianDate(printDate)}<br/>
              Dibuat Oleh,<br/>
              Bendahara
            </p>
            <p className="font-bold text-black underline uppercase">{treasurerName}</p>
            <p className="text-[8px] text-gray-500 mt-0.5">Kemblengan</p>
          </div>
        </div>
      </div>

      {/* CSS overrides specifically for printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide screen contents */
          #root, .fixed, .glass-card, header, nav, aside, button, select, input, textarea, .modal {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
          }
          /* Style only printable section */
          #printable-monthly-report-container {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
          #printable-monthly-report-container * {
            visibility: visible !important;
            color: black !important;
            background-color: transparent !important;
          }
        }
      `}} />
    </div>
  );
}
