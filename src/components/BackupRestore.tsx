import React, { useState } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface BackupRestoreProps {
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => boolean;
  onResetToDefault: () => void;
  onWipeAllData: () => void;
}

export default function BackupRestore({
  onExportBackup,
  onImportBackup,
  onResetToDefault,
  onWipeAllData
}: BackupRestoreProps) {
  const [fileText, setFileText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileText(text);
      setSuccess(`Berkas "${file.name}" berhasil dimuat! Tekan tombol "Mulai Sinkronisasi" untuk memulihkan.`);
    };
    reader.onerror = () => {
      setError('Gagal membaca berkas unggahan.');
    };
    reader.readAsText(file);
  };

  const handleRestoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fileText.trim()) {
      setError('Silakan tarik & lepas atau pilih file backup (.json) terlebih dahulu.');
      return;
    }

    const ok = onImportBackup(fileText);
    if (ok) {
      setSuccess('Restorasi database berhasil! Seluruh data state telah dipulihkan.');
      setFileText('');
    } else {
      setError('Format data tidak valid! Pastikan berkas .json tersebut berasal dari ekspor cadangan loket digital.');
    }
  };

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Pencadangan & Restorasi Data</h1>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">Cadangkan database loket Anda ke file lokal atau pulihkan cadangan lama untuk pencegahan kehilangan data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Backup Engine */}
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/25 rounded-xl flex items-center justify-center text-indigo-400">
            <Download className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Unduh Cadangan Database (Backup)</h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Ekspor seluruh data pelanggan, sejarah pembayaran, arus kas buku umum, serta target rencana keuangan Anda ke dalam satu berkas terenkripsi JSON.</p>
          </div>

          <div className="pt-2">
            <button
              id="btn-trigger-backup"
              onClick={onExportBackup}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 border border-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              <Database className="h-4 w-4 text-emerald-400" />
              Ekspor & Simpan File Cadangan (.json)
            </button>
          </div>

          <div className="border-t border-white/5 pt-5 space-y-3">
            <div>
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Reset & Pembersihan Sistem</h4>
              <p className="text-[10px] text-slate-500 leading-normal">Pilih opsi reset di bawah untuk mengembalikan data ke kondisi demo awal atau menghapus seluruh database untuk mulai dari awal.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="btn-trigger-reset"
                onClick={() => {
                  if (confirm('PERINGATAN! Seluruh data perubahan Anda saat ini akan dihapus dan dikembalikan ke data simulasi default desa. Lanjutkan?')) {
                    onResetToDefault();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-blue-500/20 hover:bg-blue-500/10 text-blue-400 font-semibold text-xs rounded-xl transition duration-150 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Skenario Demo Default
              </button>

              <button
                id="btn-trigger-wipe"
                onClick={() => {
                  if (confirm('PERINGATAN KERAS! Tindakan ini akan menghapus seluruh pelanggan, wilayah/dusun, tagihan, sejarah pembayaran, arus kas, dan rencana anggaran (kosong total). Tindakan ini tidak dapat dibatalkan! Apakah Anda yakin ingin mengosongkan seluruh data?')) {
                    onWipeAllData();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-semibold text-xs rounded-xl transition duration-150 cursor-pointer"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Kosongkan Seluruh Data
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Restore Engine */}
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center text-emerald-400">
            <Upload className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Unggah & Pulihkan Data (Restore)</h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Tarik & lepas file cadangan berformat <span className="font-mono bg-white/10 text-white px-1.5 py-0.5 rounded">.json</span> ke panel interaktif di bawah untuk memulihkan database.</p>
          </div>

          <form onSubmit={handleRestoreSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih File Cadangan:</label>
              
              <div 
                className={`border-2 border-dashed rounded-xl p-6 transition flex flex-col items-center justify-center gap-2 cursor-pointer ${
                  isDragOver 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' 
                    : 'border-white/10 hover:border-white/20 bg-white/5 text-slate-400'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  setError('');
                  setSuccess('');
                  const file = e.dataTransfer.files?.[0];
                  if (!file) return;
                  
                  if (!file.name.endsWith('.json')) {
                    setError('Hanya mendukung berkas cadangan berformat JSON (.json)');
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    setFileText(text);
                    setSuccess(`Berkas "${file.name}" berhasil dimuat! Tekan tombol "Mulai Sinkronisasi" untuk memulihkan.`);
                  };
                  reader.onerror = () => {
                    setError('Gagal membaca berkas unggahan.');
                  };
                  reader.readAsText(file);
                }}
                onClick={() => {
                  document.getElementById('restore-file-picker')?.click();
                }}
              >
                <Upload className={`h-8 w-8 transition ${isDragOver ? 'text-emerald-400 animate-bounce' : 'text-slate-400'}`} />
                <p className="text-xs text-white font-semibold">Tarik & lepas file backup di sini</p>
                <p className="text-[10px] text-slate-400 font-medium">atau klik untuk menelusuri file (.json)</p>
                
                {fileText && (
                  <span className="text-[10px] mt-2 px-2 py-0.5 rounded bg-white/10 border border-white/10 text-slate-300 font-mono">
                    File Cadangan Siap
                  </span>
                )}
              </div>

              <input
                id="restore-file-picker"
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl text-xs bg-rose-500/15 text-rose-300 border border-rose-500/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-xl text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{success}</span>
              </div>
            )}

            <button
              id="btn-restore-submit"
              type="submit"
              className="w-full glass-btn-primary py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Mulai Sinkronisasi Pemulihan (Restore)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
