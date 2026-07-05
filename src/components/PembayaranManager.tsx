import React, { useState } from 'react';
import { Tagihan, Pelanggan, Area, User, BillType } from '../types';
import { 
  Printer, 
  Search, 
  X, 
  CheckCircle,
  Upload,
  AlertCircle
} from 'lucide-react';

interface PembayaranManagerProps {
  tagihan: Tagihan[];
  pelanggan: Pelanggan[];
  areas: Area[];
  users: User[];
  currentUser: User;
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

export default function PembayaranManager({
  tagihan,
  pelanggan,
  areas,
  users,
  currentUser,
  onImportPembayaran
}: PembayaranManagerProps) {
  // Search and filter
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Tagihan | null>(null);

  // Import states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
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
      setImportSuccess(`Sukses! Berhasil memulihkan ${parsedData.length} transaksi pembayaran selesai ke dalam sistem.`);
      setCsvText('');
      setTimeout(() => {
        setIsImportOpen(false);
        setImportSuccess('');
      }, 2000);

    } catch (err: any) {
      setImportError('Gagal memproses data: ' + err.message);
    }
  };

  // Only paid bills count as payment history
  const paidBills = tagihan.filter(t => t.status === 'paid');

  const filteredPayments = paidBills.filter(t => {
    const plg = pelanggan.find(p => p.id === t.pelangganId);
    if (!plg) return false;
    
    const matchesSearch = plg.name.toLowerCase().includes(search.toLowerCase()) || 
                          plg.code.toLowerCase().includes(search.toLowerCase()) ||
                          (t.referenceNo || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Riwayat Pembayaran & Cetak Kuitansi</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Lihat seluruh transaksi selesai dan cetak bukti pembayaran sah pelanggan</p>
        </div>
        <button
          id="btn-import-pembayaran-toggle"
          onClick={() => setIsImportOpen(!isImportOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5 text-emerald-400" />
          Impor Pembayaran
        </button>
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

      {/* Search and Filters */}
      <div className="glass-card p-4 rounded-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="search-payments"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama pelanggan, No. Referensi, atau Kode..."
            className="w-full text-xs glass-input rounded-lg py-2 pl-9 pr-3 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Completed Payments Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-3 px-4">No. Referensi / Tgl</th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Jenis Layanan</th>
                <th className="py-3 px-4">Periode</th>
                <th className="py-3 px-4 text-right">Jumlah Terbayar</th>
                <th className="py-3 px-4 text-center">Petugas Kasir</th>
                <th className="py-3 px-4 text-center">Kuitansi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 italic font-medium">
                    Belum ada riwayat pembayaran yang tercatat atau cocok.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((t) => {
                  const plg = pelanggan.find(p => p.id === t.pelangganId);
                  if (!plg) return null;

                  const cashierObj = users.find(u => u.id === t.officerId);
                  const cashierName = cashierObj ? cashierObj.name : 'Sistem Otomatis';
                  const dateStr = t.paidAt ? new Date(t.paidAt).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : 'Selesai';

                  return (
                    <tr key={t.id} className="hover:bg-white/5 transition duration-150">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white text-[11px] block">{t.referenceNo || 'REF-AUTO'}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">{dateStr}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{plg.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{plg.code}</span>
                      </td>
                      <td className="py-3 px-4 uppercase font-extrabold text-white">
                        {t.type}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-300">
                        {t.month}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono text-sm">
                        {formatRupiah(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-white/10 border border-white/10 rounded text-slate-300 text-[10px] font-bold">
                          {cashierName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          id={`btn-receipt-${t.id}`}
                          onClick={() => setSelectedReceipt(t)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold transition duration-150 cursor-pointer"
                        >
                          <Printer className="h-3 w-3" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {selectedReceipt && (() => {
        const plg = pelanggan.find(p => p.id === selectedReceipt.pelangganId);
        if (!plg) return null;
        const areaName = areas.find(a => a.id === plg.areaId)?.name || 'N/A';
        const cashierName = users.find(u => u.id === selectedReceipt.officerId)?.name || 'Petugas Lapangan';
        const dateStr = selectedReceipt.paidAt ? new Date(selectedReceipt.paidAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID');

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel-heavy w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col">
              {/* Header actions */}
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Kuitansi Pembayaran Sah</span>
                <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-white transition cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Printable Area Container */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-950/20">
                {/* Physical thermal receipt wrapper styling */}
                <div id="thermal-receipt" className="bg-white border border-slate-200/60 p-5 rounded-lg shadow-sm font-mono text-xs text-slate-800 space-y-4 relative">
                  {/* Decorative receipt cuts */}
                  <div className="absolute -top-1 left-0 right-0 h-1 bg-[radial-gradient(circle_at_center,_transparent_4px,_#f1f5f9_4px)] bg-[length:12px_8px] pointer-events-none" />

                  <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">KASIR BUMDES LOKET DIGITAL</h2>
                    <p className="text-[9px] text-slate-500">Pusat Layanan Tagihan Pelanggan</p>
                    <p className="text-[9px] text-slate-400">Dusun {areaName}</p>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">No. Ref:</span>
                      <span className="font-bold text-slate-900">{selectedReceipt.referenceNo || 'REF-AUTO'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tanggal:</span>
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kasir:</span>
                      <span>{cashierName}</span>
                    </div>
                  </div>

                  <div className="border-t border-b border-dashed border-slate-300 py-3.5 space-y-2">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900">{plg.name}</p>
                      <p className="text-[10px] text-slate-500">No. ID: {plg.code}</p>
                      {selectedReceipt.type === 'pln' && <p className="text-[10px] text-slate-500">Meter Listrik: {plg.plnId}</p>}
                      {selectedReceipt.type === 'pdam' && <p className="text-[10px] text-slate-500">Sambungan Air: {plg.pdamId}</p>}
                    </div>

                    <div className="flex justify-between items-center pt-2 text-xs font-bold text-slate-800 uppercase">
                      <span>Tagihan {selectedReceipt.type}</span>
                      <span>{selectedReceipt.month}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-bold text-slate-900 uppercase">
                      <span>Subtotal</span>
                      <span>{formatRupiah(selectedReceipt.amount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Biaya Admin</span>
                      <span>Rp 0</span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                      <span>TOTAL BAYAR</span>
                      <span>{formatRupiah(selectedReceipt.amount)}</span>
                    </div>
                  </div>

                  <div className="text-center pt-5 border-t border-dashed border-slate-300 space-y-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      PEMBAYARAN LUNAS
                    </span>
                    <p className="text-[9px] text-slate-400 mt-2">Simpan kuitansi ini sebagai bukti sah.</p>
                    <p className="text-[9px] text-slate-400">Terima kasih atas partisipasi Anda.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-white/10 flex gap-2 bg-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 py-2 bg-white/5 border border-white/5 text-slate-300 rounded-lg text-xs font-bold hover:bg-white/10 cursor-pointer transition text-center"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2 glass-btn-primary rounded-lg text-xs font-bold cursor-pointer transition flex items-center justify-center gap-2"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Cetak (Print Out)
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
