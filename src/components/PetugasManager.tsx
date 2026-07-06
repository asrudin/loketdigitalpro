import React, { useState } from 'react';
import { User, Area, Role } from '../types';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Edit, 
  X,
  Upload,
  AlertCircle
} from 'lucide-react';

interface PetugasManagerProps {
  users: User[];
  areas: Area[];
  onAddArea: (a: Omit<Area, 'id'>) => void;
  onUpdateArea: (a: Area) => void;
  onDeleteArea: (id: string) => void;
  onAssignUserArea: (userId: string, areaId: string | undefined) => void;
  onImportPetugas: (data: Omit<User, 'id'>[]) => void;
  onAddPetugas: (u: Omit<User, 'id'>) => void;
  onUpdatePetugas: (u: User) => void;
  onDeletePetugas: (id: string) => void;
}

export default function PetugasManager({
  users,
  areas,
  onAddArea,
  onUpdateArea,
  onDeleteArea,
  onAssignUserArea,
  onImportPetugas,
  onAddPetugas,
  onUpdatePetugas,
  onDeletePetugas
}: PetugasManagerProps) {
  // Area form states
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [areaCode, setAreaCode] = useState('');
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  // User form states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userRole, setUserRole] = useState<Role>('kasir');
  const [userAreaId, setUserAreaId] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userError, setUserError] = useState('');

  // Import states
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

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
      const parsedData: Omit<User, 'id'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        const rowObj: any = {};
        headers.forEach((h, index) => {
          rowObj[h] = values[index] || '';
        });

        const mappedUsername = rowObj['username'] || '';
        const mappedName = rowObj['nama'] || rowObj['name'] || '';
        const rawRole = (rowObj['peran'] || rowObj['role'] || 'kasir').toLowerCase();
        const mappedRole: Role = rawRole === 'admin' ? 'admin' : 'kasir';
        const mappedAreaCode = rowObj['kode_dusun'] || rowObj['area_code'] || '';

        if (!mappedUsername || !mappedName) {
          throw new Error(`Username dan Nama harus diisi pada baris ke-${i + 1}`);
        }

        // Search areaId if code provided
        let matchedAreaId: string | undefined = undefined;
        if (mappedAreaCode) {
          const matchedArea = areas.find(a => a.code.toLowerCase() === mappedAreaCode.toLowerCase() || a.name.toLowerCase().includes(mappedAreaCode.toLowerCase()));
          if (matchedArea) {
            matchedAreaId = matchedArea.id;
          }
        }

        parsedData.push({
          username: mappedUsername,
          name: mappedName,
          role: mappedRole,
          areaId: matchedAreaId
        });
      }

      if (parsedData.length === 0) {
        setImportError('Tidak ada data petugas valid yang diimpor.');
        return;
      }

      onImportPetugas(parsedData);
      setImportSuccess(`Sukses! Berhasil mengimpor ${parsedData.length} data petugas baru.`);
      setCsvText('');
      setTimeout(() => {
        setIsImportOpen(false);
        setImportSuccess('');
      }, 2000);

    } catch (err: any) {
      setImportError('Gagal memproses data: ' + err.message);
    }
  };

  const handleAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName || !areaCode) return;

    if (editingArea) {
      onUpdateArea({
        ...editingArea,
        name: areaName,
        code: areaCode.toUpperCase()
      });
    } else {
      onAddArea({
        name: areaName,
        code: areaCode.toUpperCase()
      });
    }

    setIsAreaModalOpen(false);
    setAreaName('');
    setAreaCode('');
    setEditingArea(null);
  };

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!userName.trim() || !userUsername.trim()) {
      setUserError('Nama dan Username wajib diisi.');
      return;
    }

    const cleanUsername = userUsername.trim().toLowerCase();

    // Check if username is valid alphanumeric/underscore
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      setUserError('Username hanya boleh mengandung huruf, angka, dan underscore (_).');
      return;
    }

    const userData = {
      name: userName.trim(),
      username: cleanUsername,
      role: userRole,
      areaId: userRole === 'kasir' ? (userAreaId || undefined) : undefined
    };

    if (editingUser) {
      onUpdatePetugas({
        ...editingUser,
        ...userData
      });
    } else {
      onAddPetugas(userData);
    }

    setIsUserModalOpen(false);
    setUserName('');
    setUserUsername('');
    setUserRole('kasir');
    setUserAreaId('');
    setEditingUser(null);
  };

  const startEditArea = (a: Area) => {
    setEditingArea(a);
    setAreaName(a.name);
    setAreaCode(a.code);
    setIsAreaModalOpen(true);
  };

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Petugas Lapangan & Area Desa</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Atur wilayah kerja (Dusun) dan delegasikan tugas loket kasir penagihan sesuai area</p>
        </div>
        <button
          id="btn-import-petugas-toggle"
          onClick={() => setIsImportOpen(!isImportOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5 text-emerald-400" />
          Impor Petugas
        </button>
      </div>

      {/* Import Section */}
      {isImportOpen && (
        <div className="glass-card p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="h-4 w-4 text-emerald-400" />
              Unggah / Tempel Data Petugas Baru
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Sempurnakan impor dengan CSV atau copy-paste dari Sheets. Format baris pertama wajib berupa header berikut:<br/>
              <span className="font-mono bg-white/10 text-white px-1.5 py-0.5 rounded text-[10px]">username, nama, peran, kode_dusun</span>
            </p>
          </div>

          <form onSubmit={handleImportCSVSubmit} className="space-y-3">
            <textarea
              id="csv-import-petugas"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`username,nama,peran,kode_dusun\nkasir_budi,Budi Santoso,kasir,KJT\nkasir_ani,Ani Wijaya,kasir,KRJ`}
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
                Mulai Impor Petugas
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: List of Cashiers & Assigned Areas */}
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Delegasi Petugas Pembayaran</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Tambah, edit, hapus, atau tugaskan petugas ke wilayah kerja spesifik</p>
            </div>
            <button
              id="btn-add-petugas"
              onClick={() => {
                setEditingUser(null);
                setUserName('');
                setUserUsername('');
                setUserRole('kasir');
                setUserAreaId('');
                setIsUserModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-bold transition duration-150 cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Petugas
            </button>
          </div>

          <div className="space-y-3">
            {users.map((user) => {
              return (
                <div key={user.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{user.name}</span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase border ${
                        user.role === 'admin' 
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                          : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono block mt-1">Username: {user.username}</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
                    {user.role === 'kasir' ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <select
                          id={`assign-area-${user.id}`}
                          value={user.areaId || ''}
                          onChange={(e) => onAssignUserArea(user.id, e.target.value || undefined)}
                          className="text-xs glass-input rounded-lg p-1.5 focus:outline-none w-full sm:w-auto bg-slate-900 text-white"
                        >
                          <option value="" className="bg-slate-950 text-white">-- Semua Area --</option>
                          {areas.map((a) => (
                            <option key={a.id} value={a.id} className="bg-slate-950 text-white">{a.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-400/80 font-medium italic">Akses Penuh (Admin)</span>
                    )}

                    <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                      <button
                        id={`edit-petugas-${user.id}`}
                        onClick={() => {
                          setEditingUser(user);
                          setUserName(user.name);
                          setUserUsername(user.username);
                          setUserRole(user.role);
                          setUserAreaId(user.areaId || '');
                          setIsUserModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                        title="Edit Petugas"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        id={`delete-petugas-${user.id}`}
                        onClick={() => {
                          if (confirm(`Hapus petugas ${user.name} (${user.username})?`)) {
                            onDeletePetugas(user.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition cursor-pointer"
                        title="Hapus Petugas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Manage Village Areas */}
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Daftar Wilayah (Dusun / RT / RW)</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Daftar cakupan administratif desa untuk pengelompokan pelanggan</p>
            </div>
            <button
              id="btn-add-area"
              onClick={() => {
                setEditingArea(null);
                setAreaName('');
                setAreaCode('');
                setIsAreaModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-bold transition duration-150 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Area
            </button>
          </div>

          <div className="divide-y divide-white/5 text-xs">
            {areas.map((area) => {
              return (
                <div key={area.id} className="py-3 flex justify-between items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{area.name}</span>
                      <span className="px-1.5 py-0.2 bg-white/10 text-slate-300 font-mono text-[9px] font-bold rounded uppercase border border-white/10">
                        {area.code}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`edit-area-${area.id}`}
                      onClick={() => startEditArea(area)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`delete-area-${area.id}`}
                      onClick={() => {
                        if (confirm(`Hapus wilayah ${area.name}? Pelanggan di wilayah ini perlu didelegasikan ulang.`)) {
                          onDeleteArea(area.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Area Modal */}
      {isAreaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {editingArea ? 'Edit Data Area Dusun' : 'Tambah Area Dusun Baru'}
              </h2>
              <button onClick={() => setIsAreaModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAreaSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Dusun / Area</label>
                <input
                  id="area-form-name"
                  type="text"
                  required
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="E.g. Dusun Krajan Tengah"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kode Singkat (3 Karakter)</label>
                <input
                  id="area-form-code"
                  type="text"
                  required
                  maxLength={3}
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="E.g. KJT"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none uppercase font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAreaModalOpen(false)}
                  className="px-4 py-2 bg-white/5 border border-white/5 text-slate-300 rounded-lg text-xs font-bold hover:bg-white/10 cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 glass-btn-primary rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  Simpan Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {editingUser ? 'Edit Data Petugas' : 'Tambah Petugas Baru'}
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-white transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="p-5 space-y-4">
              {userError && (
                <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Lengkap Petugas</label>
                <input
                  id="user-form-name"
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="E.g. Budi Santoso"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Username (Untuk Log In)</label>
                <input
                  id="user-form-username"
                  type="text"
                  required
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  placeholder="E.g. budi_santoso"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none lowercase font-mono bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Peran / Hak Akses</label>
                <select
                  id="user-form-role"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as Role)}
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none bg-slate-950 text-white"
                >
                  <option value="kasir">Kasir (Akses Penagihan Area)</option>
                  <option value="admin">Admin (Akses Penuh Sistem)</option>
                </select>
              </div>

              {userRole === 'kasir' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tugas Wilayah Area</label>
                  <select
                    id="user-form-area"
                    value={userAreaId}
                    onChange={(e) => setUserAreaId(e.target.value)}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none bg-slate-950 text-white"
                  >
                    <option value="">-- Multi-Wilayah (Semua Area) --</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-white/5 border border-white/5 text-slate-300 rounded-lg text-xs font-bold hover:bg-white/10 cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 glass-btn-primary rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  Simpan Petugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
