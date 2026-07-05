import React, { useState } from 'react';
import { Pelanggan, Area } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  AlertCircle
} from 'lucide-react';

interface PelangganManagerProps {
  pelanggan: Pelanggan[];
  areas: Area[];
  onAddPelanggan: (p: Omit<Pelanggan, 'id' | 'code'>) => void;
  onUpdatePelanggan: (p: Pelanggan) => void;
  onDeletePelanggan: (id: string) => void;
  onImportPelanggan: (data: Omit<Pelanggan, 'id' | 'code'>[]) => void;
}

export default function PelangganManager({
  pelanggan,
  areas,
  onAddPelanggan,
  onUpdatePelanggan,
  onDeletePelanggan,
  onImportPelanggan,
}: PelangganManagerProps) {
  // Filters and state
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPelanggan, setEditingPelanggan] = useState<Pelanggan | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState('');
  const [wifiStatus, setWifiStatus] = useState<'active' | 'inactive'>('active');
  const [plnId, setPlnId] = useState('');
  const [pdamId, setPdamId] = useState('');

  // Import panel state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Set default form values when opening for adding
  const openAddModal = () => {
    setEditingPelanggan(null);
    setName('');
    setPhone('');
    setAddress('');
    setAreaId(areas[0]?.id || '');
    setWifiStatus('active');
    setPlnId('');
    setPdamId('');
    setIsModalOpen(true);
  };

  // Set values when opening for editing
  const openEditModal = (p: Pelanggan) => {
    setEditingPelanggan(p);
    setName(p.name);
    setPhone(p.phone);
    setAddress(p.address);
    setAreaId(p.areaId);
    setWifiStatus(p.wifiStatus);
    setPlnId(p.plnId);
    setPdamId(p.pdamId);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !areaId) return;

    if (editingPelanggan) {
      onUpdatePelanggan({
        ...editingPelanggan,
        name,
        phone,
        address,
        areaId,
        wifiStatus,
        plnId,
        pdamId,
      });
    } else {
      onAddPelanggan({
        name,
        phone,
        address,
        areaId,
        wifiStatus,
        plnId,
        pdamId,
      });
    }
    setIsModalOpen(false);
  };

  // Export Customer List to CSV format
  const handleExportCSV = () => {
    // Filter list according to the active area selection to fulfill "export sesuai area"
    const filteredToExport = pelanggan.filter(p => {
      if (selectedArea !== 'all' && p.areaId !== selectedArea) return false;
      return true;
    });

    const headers = ['KODE_PELANGGAN', 'NAMA_PELANGGAN', 'NO_TELP', 'ALAMAT', 'AREA_DESA', 'STATUS_WIFI', 'ID_METER_PLN', 'ID_SAMBUNGAN_PDAM'];
    const rows = filteredToExport.map(p => {
      const areaName = areas.find(a => a.id === p.areaId)?.name || 'N/A';
      return [
        p.code,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.phone}"`,
        `"${p.address.replace(/"/g, '""')}"`,
        `"${areaName}"`,
        p.wifiStatus,
        `"${p.plnId}"`,
        `"${p.pdamId}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const areaSuffix = selectedArea !== 'all' ? `_area_${areas.find(a => a.id === selectedArea)?.code}` : '';
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Data_Pelanggan${areaSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import Customer CSV logic
  const handleImportCSVSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError('');
    setImportSuccess('');

    if (!csvText.trim()) {
      setImportError('Teks CSV kosong. Silakan paste baris data.');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        setImportError('Format CSV salah. Butuh setidaknya satu baris header dan satu baris data.');
        return;
      }

      // Parse headers
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const parsedData: Omit<Pelanggan, 'id' | 'code'>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Split handling values inside quotes correctly
        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        
        const rowObj: any = {};
        headers.forEach((h, index) => {
          rowObj[h] = values[index] || '';
        });

        // Map keys to match schema
        const mappedName = rowObj['nama_warga'] || rowObj['nama_pelanggan'] || rowObj['nama'] || '';
        const mappedPhone = rowObj['no_telp'] || rowObj['no_telepon'] || rowObj['phone'] || '';
        const mappedAddress = rowObj['alamat'] || rowObj['address'] || '';
        const mappedAreaCode = rowObj['area_code'] || rowObj['area_desa'] || '';
        const mappedWifi = (rowObj['status_wifi'] || 'active').toLowerCase() === 'active' || (rowObj['status_wifi'] || '').toLowerCase() === 'aktif' ? 'active' : 'inactive';
        const mappedPln = rowObj['id_meter_pln'] || rowObj['pln_id'] || '';
        const mappedPdam = rowObj['id_sambungan_pdam'] || rowObj['pdam_id'] || '';

        // Match area based on code or name
        let matchedArea = areas.find(a => a.code.toLowerCase() === mappedAreaCode.toLowerCase() || a.name.toLowerCase().includes(mappedAreaCode.toLowerCase()));
        
        if (!matchedArea) {
          matchedArea = areas[0]; // fallback to first area
        }

        if (!mappedName) {
          throw new Error(`Nama kosong pada baris ke-${i + 1}`);
        }

        parsedData.push({
          name: mappedName,
          phone: mappedPhone,
          address: mappedAddress,
          areaId: matchedArea.id,
          wifiStatus: mappedWifi as 'active' | 'inactive',
          plnId: mappedPln,
          pdamId: mappedPdam
        });
      }

      if (parsedData.length === 0) {
        setImportError('Tidak ada baris data valid yang diimpor.');
        return;
      }

      onImportPelanggan(parsedData);
      setImportSuccess(`Sukses! Berhasil mengimpor ${parsedData.length} data pelanggan baru.`);
      setCsvText('');
      setTimeout(() => {
        setIsImportOpen(false);
        setImportSuccess('');
      }, 2000);

    } catch (err: any) {
      setImportError('Gagal memproses CSV: ' + err.message);
    }
  };

  // Filter list
  const filteredPelanggan = pelanggan.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesArea = selectedArea === 'all' || p.areaId === selectedArea;
    return matchesSearch && matchesArea;
  });

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Kelola Pelanggan</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Daftarkan pelanggan, kelompokkan berdasarkan dusun, dan sesuaikan data utilitas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            id="btn-import-panel"
            onClick={() => setIsImportOpen(!isImportOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-bold border border-white/10 cursor-pointer transition"
          >
            <Upload className="h-3.5 w-3.5" />
            Impor Data Pelanggan
          </button>
          <button
            id="btn-export-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-bold border border-white/10 cursor-pointer transition"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV (Sesuai Area)
          </button>
          <button
            id="btn-add-pelanggan"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-xs font-bold cursor-pointer transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Pelanggan Baru
          </button>
        </div>
      </div>

      {/* Import CSV Panel Expandable */}
      {isImportOpen && (
        <div className="glass-card rounded-2xl p-5 shadow-inner space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-400" />
              Metode Impor Cepat Data Pelanggan via Paste CSV
            </h3>
            <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
            Format kolom baris pertama (Header): <code className="bg-white/10 text-emerald-300 px-1 py-0.5 rounded font-mono font-bold">nama_pelanggan,no_telp,alamat,area_code,status_wifi,id_meter_pln,id_sambungan_pdam</code>.
            Gunakan kode area desa yang valid (e.g. <span className="font-bold text-white font-mono">KRJ</span>, <span className="font-bold text-white font-mono">MLY</span>, <span className="font-bold text-white font-mono">KRG</span>) pada kolom <code className="font-mono bg-white/10 px-1 rounded text-white">area_code</code>.
          </p>

          <form onSubmit={handleImportCSVSubmit} className="space-y-3">
            <textarea
              id="import-csv-text"
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder='nama_pelanggan,no_telp,alamat,area_code,status_wifi,id_meter_pln,id_sambungan_pdam
Agus Mulyono,081223344,Krajan RT01,KRJ,Aktif,531102948999,PDAM-KRJ-999
Siti Aminah,085734455,Mulyorejo RT02,MLY,Nonaktif,531102948888,'
              className="w-full font-mono text-xs glass-input rounded-lg p-3 focus:outline-none"
            />

            {importError && (
              <div className="p-2.5 rounded text-xs bg-rose-500/15 text-rose-300 border border-rose-500/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <span className="font-medium">{importError}</span>
              </div>
            )}

            {importSuccess && (
              <div className="p-2.5 rounded text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="font-medium">{importSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCsvText('nama_pelanggan,no_telp,alamat,area_code,status_wifi,id_meter_pln,id_sambungan_pdam\nRatna Sari,0813000999,Karanganyar RT 01,KRG,Aktif,531102948777,PDAM-KRG-777')}
                className="px-3 py-1.5 bg-white/5 border border-white/5 text-[10px] font-bold text-slate-300 hover:bg-white/10 rounded-lg cursor-pointer transition"
              >
                Gunakan Contoh Template
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 glass-btn-primary text-xs rounded-lg cursor-pointer transition"
              >
                Mulai Proses Impor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search controls */}
      <div className="glass-card p-4 rounded-xl flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="search-pelanggan"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pelanggan (Nama / Kode)..."
            className="w-full text-xs glass-input rounded-lg py-2 pl-9 pr-3 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            id="filter-area"
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="text-xs glass-input rounded-lg p-2 focus:outline-none"
          >
            <option value="all" className="bg-slate-950 text-white">Semua Area Desa / Dusun</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id} className="bg-slate-950 text-white">{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-3 px-4">Kode & Nama</th>
                <th className="py-3 px-4">Dusun / Area</th>
                <th className="py-3 px-4">No. Telp / Alamat</th>
                <th className="py-3 px-4 text-center">WiFi</th>
                <th className="py-3 px-4">No. Meter PLN</th>
                <th className="py-3 px-4">No. Sambungan PDAM</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredPelanggan.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 italic font-medium">
                    Tidak ada data pelanggan yang sesuai dengan kriteria pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredPelanggan.map((p) => {
                  const areaName = areas.find((a) => a.id === p.areaId)?.name || 'N/A';
                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition duration-150">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{p.code}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-bold">{areaName}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{p.phone}</span>
                        <span className="text-[10px] text-slate-400 block max-w-[150px] truncate font-medium mt-0.5">{p.address}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          p.wifiStatus === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold' 
                            : 'bg-white/5 text-slate-500 border-white/5'
                        }`}>
                          {p.wifiStatus === 'active' ? 'Aktif' : 'Off'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 text-[11px] font-bold">{p.plnId || '-'}</td>
                      <td className="py-3 px-4 font-mono text-slate-300 text-[11px] font-bold">{p.pdamId || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`edit-plg-${p.id}`}
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`delete-plg-${p.id}`}
                            onClick={() => {
                              if (confirm(`Hapus pelanggan ${p.name}? Semua data tagihan juga akan terdampak.`)) {
                                onDeletePelanggan(p.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-white/10 rounded transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {editingPelanggan ? 'Edit Data Pelanggan' : 'Daftarkan Pelanggan Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Lengkap Pelanggan</label>
                <input
                  id="form-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Supardi Purwanto"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">No. Handphone (WA)</label>
                  <input
                    id="form-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dusun / Area Desa</label>
                  <select
                    id="form-area"
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id} className="bg-slate-950 text-white">{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alamat Rumah Lengkap</label>
                <textarea
                  id="form-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Merdeka No. 12, RT 01 RW 02"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div className="border-t border-white/5 pt-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Integrasi Utilitas & Tagihan</span>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Status WiFi Internet</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWifiStatus('active')}
                        className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-lg border text-center cursor-pointer transition ${
                          wifiStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        Aktif
                      </button>
                      <button
                        type="button"
                        onClick={() => setWifiStatus('inactive')}
                        className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-lg border text-center cursor-pointer transition ${
                          wifiStatus === 'inactive'
                            ? 'bg-white/5 text-slate-300 border-white/10'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        Nonaktif
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">No. Sambungan PDAM</label>
                    <input
                      id="form-pdam"
                      type="text"
                      value={pdamId}
                      onChange={(e) => setPdamId(e.target.value)}
                      placeholder="PDAM-KRJ-000"
                      className="w-full text-xs glass-input rounded-lg p-2 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">ID Pelanggan Listrik PLN (12 Digit)</label>
                  <input
                    id="form-pln"
                    type="text"
                    value={plnId}
                    onChange={(e) => setPlnId(e.target.value)}
                    placeholder="5311xxxxxxxx"
                    className="w-full text-xs glass-input rounded-lg p-2 focus:outline-none"
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
                  {editingPelanggan ? 'Simpan Perubahan' : 'Daftarkan Pelanggan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
