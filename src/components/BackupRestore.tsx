import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  Cloud,
  CloudUpload,
  CloudDownload,
  LogOut,
  Loader2,
  Trash2,
  FileJson,
  FolderSync,
  ExternalLink
} from 'lucide-react';
import { initAuth, googleSignIn, logout } from '../lib/firebase';
import { type User } from 'firebase/auth';

interface BackupRestoreProps {
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => boolean;
  onResetToDefault: () => void;
  onWipeAllData: () => void;
  currentDbState: {
    users: any[];
    areas: any[];
    pelanggan: any[];
    tagihan: any[];
    cashFlow: any[];
    budgets: any[];
  };
}

interface GoogleDriveFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

export default function BackupRestore({
  onExportBackup,
  onImportBackup,
  onResetToDefault,
  onWipeAllData,
  currentDbState
}: BackupRestoreProps) {
  // Local File Backup/Restore state
  const [fileText, setFileText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Google Drive Cloud state
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [activeRestoringFileId, setActiveRestoringFileId] = useState<string | null>(null);
  const [activeDeletingFileId, setActiveDeletingFileId] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState('');
  const [cloudSuccess, setCloudSuccess] = useState('');

  // Handle Auth initialization and listening
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsSignedIn(true);
        setCurrentUser(user);
        setAccessToken(token);
        loadDriveFiles(token);
      },
      () => {
        setIsSignedIn(false);
        setCurrentUser(null);
        setAccessToken(null);
        setDriveFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Get or Create Backup Folder on Google Drive
  const getOrCreateBackupFolder = async (token: string): Promise<string | null> => {
    try {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='Loket_Digital_Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (!searchRes.ok) return null;
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }

      // Create new folder
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Loket_Digital_Backups',
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });
      if (!createRes.ok) return null;
      const createData = await createRes.json();
      return createData.id;
    } catch (e) {
      console.error('Error with backup folder:', e);
      return null;
    }
  };

  // Load files from Google Drive folder
  const loadDriveFiles = async (tokenToUse?: string) => {
    const token = tokenToUse || accessToken;
    if (!token) return;

    setIsLoadingFiles(true);
    setCloudError('');
    try {
      const folderId = await getOrCreateBackupFolder(token);
      
      let url = 'https://www.googleapis.com/drive/v3/files?q=mimeType="application/json" and trashed=false';
      if (folderId) {
        url += ` and '${folderId}' in parents`;
      } else {
        url += ` and name contains "Backup_LoketDigital_"`;
      }
      url += '&fields=files(id, name, createdTime, size)&orderBy=createdTime desc';

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error('Gagal memuat daftar berkas dari Google Drive');
      }

      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      setCloudError(err.message || 'Gagal memuat daftar file dari Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Authenticate user with Google Account
  const handleGoogleSignIn = async () => {
    setCloudError('');
    setCloudSuccess('');
    try {
      const result = await googleSignIn();
      if (result) {
        setIsSignedIn(true);
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        loadDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      setCloudError('Gagal masuk ke Google Account: ' + (err.message || ''));
    }
  };

  // Sign out user
  const handleGoogleSignOut = async () => {
    setCloudError('');
    setCloudSuccess('');
    try {
      await logout();
      setIsSignedIn(false);
      setCurrentUser(null);
      setAccessToken(null);
      setDriveFiles([]);
    } catch (err: any) {
      console.error(err);
      setCloudError('Gagal keluar dari akun Google.');
    }
  };

  // Create an Instant Backup and save to Google Drive
  const handleCloudBackup = async () => {
    const token = accessToken;
    if (!token) {
      setCloudError('Silakan hubungkan Google Drive terlebih dahulu.');
      return;
    }

    setIsCloudSaving(true);
    setCloudError('');
    setCloudSuccess('');

    try {
      const folderId = await getOrCreateBackupFolder(token);
      const timestamp = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('id-ID').replace(/:/g, '-');
      const fileName = `Backup_LoketDigital_${timestamp}_${timeStr}.json`;

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: folderId ? [folderId] : undefined
      };

      const boundary = '314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const close_delim = `\r\n--${boundary}--`;

      const body = 
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(currentDbState) +
        close_delim;

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      });

      if (!res.ok) {
        throw new Error('Gagal mengunggah berkas cadangan ke Google Drive.');
      }

      setCloudSuccess(`Pencadangan berhasil! Berkas "${fileName}" telah disimpan di Google Drive.`);
      await loadDriveFiles();
    } catch (err: any) {
      console.error(err);
      setCloudError(err.message || 'Gagal melakukan pencadangan ke Google Drive.');
    } finally {
      setIsCloudSaving(false);
    }
  };

  // Restore database from Google Drive file (Mandatory Confirmation)
  const handleCloudRestore = async (fileId: string, fileName: string) => {
    const token = accessToken;
    if (!token) return;

    const confirmed = window.confirm(
      `PERINGATAN KERAS! Anda akan memulihkan data dari berkas "${fileName}" di Google Drive. Tindakan ini akan sepenuhnya menimpa seluruh data pelanggan, wilayah, transaksi, cash flow, dan rencana anggaran saat ini. Apakah Anda yakin ingin memulihkan?`
    );
    if (!confirmed) return;

    setActiveRestoringFileId(fileId);
    setCloudError('');
    setCloudSuccess('');

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Gagal mengunduh file dari Google Drive.');
      }

      const dbState = await res.json();
      const ok = onImportBackup(JSON.stringify(dbState));
      if (ok) {
        setCloudSuccess(`Pemulihan database berhasil! Seluruh data state telah dipulihkan dari "${fileName}".`);
      } else {
        throw new Error('Gagal mengimpor file. Format database di dalam file tidak valid.');
      }
    } catch (err: any) {
      console.error(err);
      setCloudError(err.message || 'Gagal memulihkan database dari Google Drive.');
    } finally {
      setActiveRestoringFileId(null);
    }
  };

  // Delete backup file from Google Drive (Mandatory Confirmation)
  const handleCloudDelete = async (fileId: string, fileName: string) => {
    const token = accessToken;
    if (!token) return;

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus berkas cadangan "${fileName}" secara permanen dari Google Drive? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    setActiveDeletingFileId(fileId);
    setCloudError('');
    setCloudSuccess('');

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Gagal menghapus file dari Google Drive.');
      }

      setCloudSuccess(`Berkas "${fileName}" berhasil dihapus dari Google Drive.`);
      await loadDriveFiles();
    } catch (err: any) {
      console.error(err);
      setCloudError(err.message || 'Gagal menghapus file dari Google Drive.');
    } finally {
      setActiveDeletingFileId(null);
    }
  };

  // Local File handler
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

  // Local File submission
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

  // Helper to format file size
  const formatBytes = (bytes?: string, decimals = 2) => {
    if (!bytes) return 'N/A';
    const bytesNum = parseInt(bytes, 10);
    if (isNaN(bytesNum) || bytesNum === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytesNum) / Math.log(k));
    return parseFloat((bytesNum / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Helper to format date
  const formatDateString = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Pencadangan & Restorasi Data</h1>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">Cadangkan database loket Anda ke file lokal atau ke Google Drive, serta pulihkan kembali cadangan Anda dengan aman.</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Column 1: Local Backup Engine */}
        <div className="glass-card p-6 rounded-2xl space-y-5 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/25 rounded-xl flex items-center justify-center text-indigo-400">
              <Download className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Cadangan Lokal (Local Backup)</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Ekspor seluruh data pelanggan, sejarah pembayaran, arus kas buku umum, serta target rencana keuangan Anda ke dalam satu berkas terenkripsi JSON di komputer lokal Anda.</p>
            </div>

            <div className="pt-2">
              <button
                id="btn-trigger-backup"
                onClick={onExportBackup}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 border border-white/10 hover:bg-white/15 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                <Database className="h-4 w-4 text-indigo-400" />
                Ekspor & Simpan File Cadangan (.json)
              </button>
            </div>
          </div>

          <div className="border-t border-white/5 pt-5 space-y-3 mt-4">
            <div>
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Reset & Pembersihan Sistem</h4>
              <p className="text-[10px] text-slate-500 leading-normal">Kembalikan data ke kondisi skenario demo bawaan atau bersihkan seluruh isi database untuk memulai operasional nyata dari nol.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-trigger-reset"
                onClick={() => {
                  if (confirm('PERINGATAN! Seluruh data perubahan Anda saat ini akan dihapus dan dikembalikan ke data simulasi default desa. Lanjutkan?')) {
                    onResetToDefault();
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-2 border border-blue-500/20 hover:bg-blue-500/10 text-blue-400 font-semibold text-[10px] rounded-xl transition duration-150 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Skenario Demo
              </button>

              <button
                id="btn-trigger-wipe"
                onClick={() => {
                  if (confirm('PERINGATAN KERAS! Tindakan ini akan menghapus seluruh pelanggan, wilayah/dusun, tagihan, sejarah pembayaran, arus kas, dan rencana anggaran (kosong total). Tindakan ini tidak dapat dibatalkan! Apakah Anda yakin ingin mengosongkan seluruh data?')) {
                    onWipeAllData();
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-2 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-semibold text-[10px] rounded-xl transition duration-150 cursor-pointer"
              >
                <AlertCircle className="h-3 w-3" />
                Kosongkan Data
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Local File Restore Engine */}
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center text-emerald-400">
            <Upload className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Pemulihan Lokal (Local Restore)</h2>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Tarik & lepas file cadangan berformat <span className="font-mono bg-white/10 text-white px-1.5 py-0.5 rounded">.json</span> ke panel interaktif di bawah untuk memulihkan seluruh database.</p>
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
                <p className="text-xs text-white font-semibold text-center">Tarik & lepas file backup di sini</p>
                <p className="text-[10px] text-slate-400 font-medium text-center">atau klik untuk menelusuri file (.json)</p>
                
                {fileText && (
                  <span className="text-[10px] mt-2 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono">
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

        {/* Column 3: Google Drive Cloud Backup & Restore */}
        <div className="glass-card p-6 rounded-2xl space-y-5 flex flex-col justify-between xl:col-span-1">
          <div className="space-y-5 w-full">
            <div className="flex justify-between items-center">
              <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center text-emerald-400">
                <Cloud className="h-5 w-5" />
              </div>
              
              {isSignedIn && currentUser && (
                <button
                  onClick={handleGoogleSignOut}
                  title="Putuskan Hubungan Google Drive"
                  className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/25 text-slate-400 hover:text-rose-400 text-[10px] font-bold rounded-lg cursor-pointer transition"
                >
                  <LogOut className="h-3 w-3" />
                  Putuskan
                </button>
              )}
            </div>

            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Sinkronisasi Cloud (Google Drive)</h2>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Hubungkan sistem ke Google Drive Anda untuk menyimpan database secara otomatis di awan, serta mengakses riwayat file backup untuk dipulihkan kapan saja.</p>
            </div>

            {/* Cloud Error & Success messages */}
            {cloudError && (
              <div className="p-3 rounded-xl text-xs bg-rose-500/15 text-rose-300 border border-rose-500/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span className="font-medium">{cloudError}</span>
              </div>
            )}

            {cloudSuccess && (
              <div className="p-3 rounded-xl text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{cloudSuccess}</span>
              </div>
            )}

            {/* Auth Block */}
            {!isSignedIn ? (
              <div className="pt-2 flex flex-col items-center justify-center gap-4 border border-dashed border-white/10 p-6 rounded-xl bg-white/5">
                <Cloud className="h-10 w-10 text-slate-500 animate-pulse" />
                <p className="text-[10px] text-slate-400 text-center leading-relaxed">Hubungkan akun Google Anda untuk mengaktifkan fitur pencadangan awan instan.</p>
                <button
                  onClick={handleGoogleSignIn}
                  className="flex items-center gap-2.5 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs rounded-xl cursor-pointer transition shadow-lg"
                >
                  <svg className="h-4 w-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                  <span>Hubungkan Google Drive</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* User Info & Actions */}
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="h-8 w-8 rounded-full border border-emerald-500" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-8 w-8 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-sm">
                      {currentUser?.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{currentUser?.displayName || 'User Google'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCloudBackup}
                    disabled={isCloudSaving}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-bold text-xs rounded-xl cursor-pointer transition"
                  >
                    {isCloudSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload className="h-3.5 w-3.5" />
                        <span>Cadangkan Sekarang</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => loadDriveFiles()}
                    disabled={isLoadingFiles}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs rounded-xl cursor-pointer transition"
                  >
                    {isLoadingFiles ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Memuat...</span>
                      </>
                    ) : (
                      <>
                        <FolderSync className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Segarkan List</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Backup History in Google Drive */}
                <div className="space-y-2 mt-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderSync className="h-3 w-3 text-emerald-400" />
                    Riwayat Backup Cloud ({driveFiles.length})
                  </p>
                  
                  {isLoadingFiles ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2 bg-white/5 rounded-xl border border-white/5">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
                      <span className="text-[10px] font-medium">Menghubungi Google Drive...</span>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 bg-white/5 rounded-xl border border-white/5 text-[10px] font-medium leading-normal">
                      Belum ada file cadangan di Google Drive Anda.<br />Tekan tombol "Cadangkan Sekarang" di atas.
                    </div>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {driveFiles.map((file) => (
                        <div key={file.id} className="flex flex-col p-2.5 bg-slate-950/40 border border-white/5 hover:border-white/10 rounded-xl space-y-1.5 transition">
                          <div className="flex items-start gap-2 justify-between">
                            <div className="flex items-start gap-1.5 min-w-0">
                              <FileJson className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-white truncate" title={file.name}>
                                  {file.name}
                                </p>
                                <div className="flex items-center gap-2 text-[8px] text-slate-400 font-medium">
                                  <span>{formatDateString(file.createdTime)}</span>
                                  <span>•</span>
                                  <span>{formatBytes(file.size)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-1 border-t border-white/5">
                            <button
                              disabled={activeRestoringFileId !== null || activeDeletingFileId !== null}
                              onClick={() => handleCloudRestore(file.id, file.name)}
                              className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/35 text-emerald-400 text-[9px] font-bold rounded-md transition disabled:opacity-50 cursor-pointer"
                            >
                              {activeRestoringFileId === file.id ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <CloudDownload className="h-2.5 w-2.5" />
                              )}
                              <span>Pulihkan</span>
                            </button>
                            <button
                              disabled={activeRestoringFileId !== null || activeDeletingFileId !== null}
                              onClick={() => handleCloudDelete(file.id, file.name)}
                              className="flex items-center gap-1 px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/35 text-rose-400 text-[9px] font-bold rounded-md transition disabled:opacity-50 cursor-pointer"
                            >
                              {activeDeletingFileId === file.id ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-2.5 w-2.5" />
                              )}
                              <span>Hapus</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {isSignedIn && (
            <div className="text-[9px] text-slate-500 font-semibold tracking-wider text-center mt-4 uppercase flex items-center justify-center gap-1">
              <Cloud className="h-2.5 w-2.5 text-emerald-500" />
              Tersambung ke Folder Loket_Digital_Backups
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
