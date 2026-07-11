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
  AlertCircle,
  FileSpreadsheet,
  UploadCloud
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PelangganManagerProps {
  pelanggan: Pelanggan[];
  areas: Area[];
  onAddPelanggan: (p: Omit<Pelanggan, 'id' | 'code'> & { code?: string }) => void;
  onUpdatePelanggan: (p: Pelanggan) => void;
  onDeletePelanggan: (id: string) => void;
  onDeleteMultiplePelanggan?: (ids: string[]) => void;
  onImportPelanggan: (data: (Omit<Pelanggan, 'id' | 'code'> & { code?: string })[]) => void;
}

export default function PelangganManager({
  pelanggan,
  areas,
  onAddPelanggan,
  onUpdatePelanggan,
  onDeletePelanggan,
  onDeleteMultiplePelanggan,
  onImportPelanggan,
}: PelangganManagerProps) {
  // Filters and state
  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPelanggan, setEditingPelanggan] = useState<Pelanggan | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState('');
  const [wifiStatus, setWifiStatus] = useState<'active' | 'inactive'>('active');
  const [plnId, setPlnId] = useState('');
  const [pdamId, setPdamId] = useState('');
  const [nominalBulanan, setNominalBulanan] = useState<string>('');
  const [jatuhTempo, setJatuhTempo] = useState<string>('');
  const [billType, setBillType] = useState<'wifi' | 'pln' | 'pdam'>('wifi');

  // Import panel state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [importTab, setImportTab] = useState<'excel' | 'paste'>('excel');
  const [isDragOver, setIsDragOver] = useState(false);

  // Set default form values when opening for adding
  const openAddModal = () => {
    setEditingPelanggan(null);
    setCode('');
    setName('');
    setPhone('');
    setAddress('');
    setAreaId(areas[0]?.id || '');
    setWifiStatus('active');
    setPlnId('');
    setPdamId('');
    setNominalBulanan('150000');
    setJatuhTempo('10');
    setBillType('wifi');
    setIsModalOpen(true);
  };

  // Set values when opening for editing
  const openEditModal = (p: Pelanggan) => {
    setEditingPelanggan(p);
    setCode(p.code);
    setName(p.name);
    setPhone(p.phone);
    setAddress(p.address);
    setAreaId(p.areaId);
    setWifiStatus(p.wifiStatus);
    setPlnId(p.plnId);
    setPdamId(p.pdamId);
    setNominalBulanan(p.nominalBulanan !== undefined ? String(p.nominalBulanan) : '');
    setJatuhTempo(p.jatuhTempo !== undefined ? String(p.jatuhTempo) : '');
    setBillType(p.billType || 'wifi');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !areaId) return;

    const monthlyAmt = nominalBulanan ? parseFloat(nominalBulanan) : undefined;
    const dueDay = jatuhTempo ? parseInt(jatuhTempo) : undefined;

    if (editingPelanggan) {
      onUpdatePelanggan({
        ...editingPelanggan,
        code: code.trim() || editingPelanggan.code,
        name,
        phone,
        address,
        areaId,
        wifiStatus,
        plnId,
        pdamId,
        nominalBulanan: monthlyAmt,
        jatuhTempo: dueDay,
        billType,
      });
    } else {
      onAddPelanggan({
        code: code.trim() || undefined,
        name,
        phone,
        address,
        areaId,
        wifiStatus,
        plnId,
        pdamId,
        nominalBulanan: monthlyAmt,
        jatuhTempo: dueDay,
        billType,
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

    const headers = ['KODE_PELANGGAN', 'NAMA_PELANGGAN', 'ALAMAT', 'DUSUN_AREA', 'NO_WA', 'JENIS_TAGIHAN', 'NOMINAL_TAGIHAN', 'JATUH_TEMPO', 'STATUS_WIFI', 'ID_METER_PLN', 'ID_SAMBUNGAN_PDAM'];
    const rows = filteredToExport.map(p => {
      const areaName = areas.find(a => a.id === p.areaId)?.name || 'N/A';
      return [
        p.code,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.address.replace(/"/g, '""')}"`,
        `"${areaName}"`,
        `"${p.phone}"`,
        `"${(p.billType || 'wifi').toUpperCase()}"`,
        p.nominalBulanan !== undefined ? p.nominalBulanan : 150000,
        p.jatuhTempo !== undefined ? p.jatuhTempo : 10,
        p.wifiStatus || 'active',
        `"${p.plnId || ''}"`,
        `"${p.pdamId || ''}"`
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

  // Robust CSV Parsing with Delimiter Autodetect & Quotes Support
  const parseAndImportCSVText = (text: string) => {
    setImportError('');
    setImportSuccess('');

    try {
      const cleanText = text.trim();
      if (!cleanText) {
        setImportError('Teks CSV kosong.');
        return;
      }

      const lines = cleanText.split(/\r?\n/);
      if (lines.length < 2) {
        setImportError('Format CSV salah. Butuh setidaknya satu baris header dan satu baris data.');
        return;
      }

      // Detect delimiter: detect whether semicolon (;) or comma (,) is more prevalent in headers
      const firstLine = lines[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const delimiter = semicolonCount > commaCount ? ';' : ',';

      // Parse headers
      const headers = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/"/g, ''));
      const parsedData: (Omit<Pelanggan, 'id' | 'code'> & { code?: string })[] = [];

      for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue;

        // Split columns while correctly keeping text inside double quotes
        let values: string[] = [];
        if (delimiter === ';') {
          values = currentLine.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        } else {
          values = currentLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
        }

        const rowObj: any = {};
        headers.forEach((h, index) => {
          rowObj[h] = values[index] !== undefined ? values[index].trim() : '';
        });

        // Map keys dynamically to match user column variants
        const mappedCode = rowObj['kode_pelanggan'] || rowObj['id_pelanggan'] || rowObj['kode'] || rowObj['id'] || rowObj['kode_pel'] || '';
        const mappedName = rowObj['nama_pelanggan'] || rowObj['nama_warga'] || rowObj['nama'] || '';
        const mappedPhone = rowObj['no_wa'] || rowObj['no_telp'] || rowObj['no_telepon'] || rowObj['phone'] || '';
        const mappedAddress = rowObj['alamat'] || rowObj['address'] || '';
        const mappedAreaCode = rowObj['dusun_area'] || rowObj['area_code'] || rowObj['area_desa'] || rowObj['dusun'] || '';
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

        const rawNominal = rowObj['nominal_tagihan'] || rowObj['nominal_bulanan'] || rowObj['nominal'] || '';
        const rawTempo = rowObj['jatuh_tempo'] || rowObj['jatuh_tempo_day'] || '';
        const rawBillType = String(rowObj['jenis_tagihan'] || rowObj['bill_type'] || 'wifi').toLowerCase();

        parsedData.push({
          code: mappedCode || undefined,
          name: mappedName,
          phone: mappedPhone,
          address: mappedAddress,
          areaId: matchedArea ? matchedArea.id : (areas[0]?.id || ''),
          wifiStatus: mappedWifi as 'active' | 'inactive',
          plnId: mappedPln,
          pdamId: mappedPdam,
          nominalBulanan: rawNominal ? parseFloat(rawNominal) : 150000,
          jatuhTempo: rawTempo ? parseInt(rawTempo) : 10,
          billType: rawBillType.includes('pln') ? 'pln' : rawBillType.includes('pdam') ? 'pdam' : 'wifi'
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

  // Import Customer CSV logic
  const handleImportCSVSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      setImportError('Teks CSV kosong. Silakan paste baris data.');
      return;
    }
    parseAndImportCSVText(csvText);
  };

  // Import Excel File (.xlsx, .xls, .csv)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelFile(file);
  };

  const processExcelFile = (file: File) => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();

    // If file is raw CSV, parse as clean text to prevent binary delimiter conversion bugs
    if (fileExt === 'csv') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        if (text) {
          parseAndImportCSVText(text);
        }
      };
      reader.onerror = () => {
        setImportError('Gagal membaca file CSV.');
      };
      reader.readAsText(file, 'UTF-8');
      return;
    }

    // Process binary Excel file (.xlsx, .xls)
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to array of arrays
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (data.length < 2) {
          setImportError('File kosong atau tidak memiliki baris data.');
          return;
        }

        // Parse headers (case insensitive and strip whitespace)
        const headers = data[0].map((h: any) => String(h || '').toLowerCase().trim());
        const parsedData: (Omit<Pelanggan, 'id' | 'code'> & { code?: string })[] = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
            continue;
          }

          const rowObj: any = {};
          headers.forEach((h, index) => {
            if (h) {
              rowObj[h] = row[index] !== undefined && row[index] !== null ? String(row[index]).trim() : '';
            }
          });

          // Match columns
          const mappedCode = rowObj['kode_pelanggan'] || rowObj['id_pelanggan'] || rowObj['kode'] || rowObj['id'] || rowObj['kode_pel'] || '';
          const mappedName = rowObj['nama_pelanggan'] || rowObj['nama_warga'] || rowObj['nama'] || '';
          const mappedPhone = rowObj['no_wa'] || rowObj['no_telp'] || rowObj['no_telepon'] || rowObj['phone'] || '';
          const mappedAddress = rowObj['alamat'] || rowObj['address'] || '';
          const mappedAreaCode = rowObj['dusun_area'] || rowObj['area_code'] || rowObj['area_desa'] || rowObj['dusun'] || '';
          const mappedWifi = (rowObj['status_wifi'] || 'active').toLowerCase() === 'active' || (rowObj['status_wifi'] || '').toLowerCase() === 'aktif' ? 'active' : 'inactive';
          const mappedPln = rowObj['id_meter_pln'] || rowObj['pln_id'] || '';
          const mappedPdam = rowObj['id_sambungan_pdam'] || rowObj['pdam_id'] || '';

          // Match area
          let matchedArea = areas.find(a => a.code.toLowerCase() === mappedAreaCode.toLowerCase() || a.name.toLowerCase().includes(mappedAreaCode.toLowerCase()));
          if (!matchedArea) {
            matchedArea = areas[0]; // fallback
          }

          if (!mappedName) {
            continue; // Skip invalid row
          }

          const rawNominal = rowObj['nominal_tagihan'] || rowObj['nominal_bulanan'] || rowObj['nominal'] || '';
          const rawTempo = rowObj['jatuh_tempo'] || rowObj['jatuh_tempo_day'] || '';
          const rawBillType = String(rowObj['jenis_tagihan'] || rowObj['bill_type'] || 'wifi').toLowerCase();

          parsedData.push({
            code: mappedCode || undefined,
            name: mappedName,
            phone: mappedPhone,
            address: mappedAddress,
            areaId: matchedArea ? matchedArea.id : (areas[0]?.id || ''),
            wifiStatus: mappedWifi as 'active' | 'inactive',
            plnId: mappedPln,
            pdamId: mappedPdam,
            nominalBulanan: rawNominal ? parseFloat(rawNominal) : 150000,
            jatuhTempo: rawTempo ? parseInt(rawTempo) : 10,
            billType: rawBillType.includes('pln') ? 'pln' : rawBillType.includes('pdam') ? 'pdam' : 'wifi'
          });
        }

        if (parsedData.length === 0) {
          setImportError('Tidak ada baris data valid yang ditemukan di file Excel.');
          return;
        }

        onImportPelanggan(parsedData);
        setImportSuccess(`Sukses! Berhasil mengimpor ${parsedData.length} data pelanggan baru dari Excel.`);
        setTimeout(() => {
          setIsImportOpen(false);
          setImportSuccess('');
        }, 2000);

      } catch (err: any) {
        setImportError('Gagal memproses file Excel: ' + err.message);
      }
    };
    reader.onerror = () => {
      setImportError('Gagal membaca file.');
    };
    reader.readAsBinaryString(file);
  };

  // Download Excel Template for Customers
  const downloadExcelTemplate = () => {
    const templateData = [
      ['nama_pelanggan', 'alamat', 'area_code', 'no_wa', 'jenis_tagihan', 'nominal_tagihan', 'jatuh_tempo', 'status_wifi', 'id_meter_pln', 'id_sambungan_pdam'],
      ['Agus Mulyono', 'Krajan RT01', 'KRJ', '081223344', 'WIFI', 150000, 10, 'Aktif', '', ''],
      ['Siti Aminah', 'Mulyorejo RT02', 'MLY', '085734455', 'PDAM', 75000, 15, 'Nonaktif', '', 'PDAM-MLY-302'],
      ['Ratna Sari', 'Karanganyar RT 01', 'KRG', '0813000999', 'PLN', 245000, 20, 'Aktif', '531102948220', '']
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    
    // Set column widths so it looks beautiful
    const wscols = [
      { wch: 22 }, // nama_pelanggan
      { wch: 25 }, // alamat
      { wch: 10 }, // area_code
      { wch: 15 }, // no_wa
      { wch: 15 }, // jenis_tagihan
      { wch: 16 }, // nominal_tagihan
      { wch: 12 }, // jatuh_tempo
      { wch: 12 }, // status_wifi
      { wch: 18 }, // id_meter_pln
      { wch: 18 }  // id_sambungan_pdam
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Template_Pelanggan');
    XLSX.writeFile(wb, 'Template_Impor_Pelanggan.xlsx');
  };

  // Filter list
  const filteredPelanggan = pelanggan.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesArea = selectedArea === 'all' || p.areaId === selectedArea;
    return matchesSearch && matchesArea;
  });

  const handleBulkDelete = () => {
    if (!onDeleteMultiplePelanggan) {
      alert("Fitur hapus kolektif tidak tersedia.");
      return;
    }
    if (confirm(`PERINGATAN! Anda akan menghapus ${selectedIds.length} pelanggan secara massal. Semua data tagihan terkait yang belum terbayar juga akan dihapus. Tindakan ini tidak dapat dibatalkan! Apakah Anda yakin?`)) {
      onDeleteMultiplePelanggan(selectedIds);
      setSelectedIds([]);
    }
  };

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

      {/* Import CSV / Excel Panel Expandable */}
      {isImportOpen && (
        <div className="glass-card rounded-2xl p-5 shadow-inner space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-400" />
              Metode Impor Cepat Data Pelanggan
            </h3>
            <button onClick={() => setIsImportOpen(false)} className="text-slate-400 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Import Tabs */}
          <div className="flex border-b border-white/5 pb-1 gap-4">
            <button
              type="button"
              onClick={() => { setImportTab('excel'); setImportError(''); setImportSuccess(''); }}
              className={`pb-1.5 text-xs font-bold tracking-wider uppercase border-b-2 transition ${
                importTab === 'excel'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Upload Spreadsheet / Excel
            </button>
            <button
              type="button"
              onClick={() => { setImportTab('paste'); setImportError(''); setImportSuccess(''); }}
              className={`pb-1.5 text-xs font-bold tracking-wider uppercase border-b-2 transition ${
                importTab === 'paste'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Paste Teks CSV / Spreadsheet
            </button>
          </div>

          {/* Tab 1: Excel / Spreadsheet Upload */}
          {importTab === 'excel' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <p className="text-[11px] text-slate-400 leading-normal font-medium">
                  Unduh template Excel resmi di samping, isi kolom data pelanggan Anda, lalu seret berkas Anda ke zona di bawah untuk memproses impor instan.
                </p>
                <button
                  type="button"
                  onClick={downloadExcelTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg text-[10px] font-bold cursor-pointer transition whitespace-nowrap shrink-0"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Unduh Template Excel (.xlsx)
                </button>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-8 transition flex flex-col items-center justify-center gap-2 cursor-pointer ${
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
                  setImportError('');
                  setImportSuccess('');
                  const file = e.dataTransfer.files?.[0];
                  if (!file) return;

                  const fileExt = file.name.split('.').pop()?.toLowerCase();
                  if (fileExt !== 'xlsx' && fileExt !== 'xls' && fileExt !== 'csv') {
                    setImportError('Format berkas tidak didukung! Pastikan Anda mengunggah file .xlsx, .xls, atau .csv');
                    return;
                  }
                  processExcelFile(file);
                }}
                onClick={() => {
                  document.getElementById('excel-file-picker')?.click();
                }}
              >
                <UploadCloud className={`h-10 w-10 transition ${isDragOver ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
                <p className="text-xs text-white font-bold text-center">Tarik & lepas file Spreadsheet/Excel di sini</p>
                <p className="text-[10px] text-slate-400 font-semibold text-center">atau klik untuk menelusuri file dari folder lokal (.xlsx, .xls, .csv)</p>
              </div>

              <input
                id="excel-file-picker"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Tab 2: Paste CSV */}
          {importTab === 'paste' && (
            <form onSubmit={handleImportCSVSubmit} className="space-y-3">
              <p className="text-[11px] text-slate-400 leading-normal font-medium">
                Gunakan header kolom berikut pada baris pertama: <code className="bg-white/10 text-emerald-300 px-1 py-0.5 rounded font-mono font-bold">nama_pelanggan,alamat,area_code,no_wa,jenis_tagihan,nominal_tagihan,jatuh_tempo</code>.
              </p>

              <textarea
                id="import-csv-text"
                rows={4}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder='nama_pelanggan,alamat,area_code,no_wa,jenis_tagihan,nominal_tagihan,jatuh_tempo
Agus Mulyono,Krajan RT01,KRJ,081223344,WIFI,150000,10
Siti Aminah,Mulyorejo RT02,MLY,085734455,PDAM,75000,15'
                className="w-full font-mono text-xs glass-input rounded-lg p-3 focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCsvText('nama_pelanggan,alamat,area_code,no_wa,jenis_tagihan,nominal_tagihan,jatuh_tempo\nRatna Sari,Karanganyar RT 01,KRG,0813000999,PLN,245000,20')}
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
          )}

          {/* Import Messages */}
          {importError && (
            <div className="p-3 rounded-xl text-xs bg-rose-500/15 text-rose-300 border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              <span className="font-semibold">{importError}</span>
            </div>
          )}

          {importSuccess && (
            <div className="p-3 rounded-xl text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{importSuccess}</span>
            </div>
          )}
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

      {/* Selection / Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            <span className="text-xs font-semibold text-rose-300">
              {selectedIds.length} pelanggan terpilih untuk tindakan kolektif.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/10"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Terpilih
            </button>
          </div>
        </div>
      )}

      {/* Customer List Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-lg border border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white/5">
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredPelanggan.length > 0 && filteredPelanggan.every((p) => selectedIds.includes(p.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // select all filtered
                        setSelectedIds((prev) => {
                          const newIds = [...prev];
                          filteredPelanggan.forEach((p) => {
                            if (!newIds.includes(p.id)) {
                              newIds.push(p.id);
                            }
                          });
                          return newIds;
                        });
                      } else {
                        // deselect all filtered
                        const filteredIds = filteredPelanggan.map((p) => p.id);
                        setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
                      }
                    }}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer h-3.5 w-3.5"
                  />
                </th>
                <th className="py-3 px-4">Nama Pelanggan</th>
                <th className="py-3 px-4">Alamat Rumah</th>
                <th className="py-3 px-4">Dusun / Area</th>
                <th className="py-3 px-4">No. WA</th>
                <th className="py-3 px-4">Jenis Tagihan</th>
                <th className="py-3 px-4">Nominal Tagihan</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {filteredPelanggan.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500 italic font-medium">
                    Tidak ada data pelanggan yang sesuai dengan kriteria pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredPelanggan.map((p) => {
                  const areaName = areas.find((a) => a.id === p.areaId)?.name || 'N/A';
                  return (
                    <tr key={p.id} className={`hover:bg-white/5 transition duration-150 ${selectedIds.includes(p.id) ? 'bg-white/5' : ''}`}>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, p.id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer h-3.5 w-3.5"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{p.code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-300 block max-w-[180px] truncate font-medium">{p.address || '-'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-bold">{areaName}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        {p.phone || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            (p.billType || 'wifi') === 'wifi'
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold'
                              : (p.billType || 'wifi') === 'pln'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/30 font-bold'
                          }`}>
                            {(p.billType || 'wifi').toUpperCase()}
                          </span>
                          
                          {/* Secondary reference details shown compactly inline */}
                          {(p.billType || 'wifi') === 'wifi' && p.wifiStatus && (
                            <span className="text-[9px] text-slate-400 block font-medium">
                              WiFi: {p.wifiStatus === 'active' ? 'Aktif' : 'Nonaktif'}
                            </span>
                          )}
                          {(p.billType || 'wifi') === 'pln' && p.plnId && (
                            <span className="text-[9px] text-slate-400 font-mono block">
                              Meter: {p.plnId}
                            </span>
                          )}
                          {(p.billType || 'wifi') === 'pdam' && p.pdamId && (
                            <span className="text-[9px] text-slate-400 font-mono block">
                              Samb: {p.pdamId}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.nominalBulanan !== undefined ? p.nominalBulanan : 150000)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-300">
                        Tgl {p.jatuhTempo !== undefined ? p.jatuhTempo : 10}
                      </td>
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kode Pelg</label>
                  <input
                    id="form-code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Otomatis"
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none placeholder-slate-500 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Lengkap Pelanggan *</label>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">No. WA (WhatsApp) *</label>
                  <input
                    id="form-phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08123456789"
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Dusun / Area *</label>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alamat Lengkap *</label>
                <textarea
                  id="form-address"
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Merdeka No. 12, RT 01 RW 02"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div className="border-t border-white/5 pt-3 space-y-3">
                <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Pengaturan Tagihan Utama</span>
                
                {/* Jenis Tagihan Dropdown */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Jenis Tagihan Utama *</label>
                  <select
                    id="form-bill-type"
                    value={billType}
                    onChange={(e) => {
                      const type = e.target.value as 'wifi' | 'pln' | 'pdam';
                      setBillType(type);
                      if (type === 'wifi') setNominalBulanan('150000');
                      else if (type === 'pln') setNominalBulanan('200000');
                      else if (type === 'pdam') setNominalBulanan('50000');
                    }}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  >
                    <option value="wifi" className="bg-slate-950 text-white">WIFI Internet</option>
                    <option value="pln" className="bg-slate-950 text-white">Listrik PLN</option>
                    <option value="pdam" className="bg-slate-950 text-white">Air PDAM</option>
                  </select>
                </div>

                {/* Nominal Bulanan & Jatuh Tempo */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Nominal Tagihan (Rp) *</label>
                    <input
                      id="form-nominal-bulanan"
                      type="number"
                      required
                      value={nominalBulanan}
                      onChange={(e) => setNominalBulanan(e.target.value)}
                      placeholder="150000"
                      className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1.5">Tanggal Jatuh Tempo (1-31) *</label>
                    <input
                      id="form-jatuh-tempo"
                      type="number"
                      required
                      min={1}
                      max={31}
                      value={jatuhTempo}
                      onChange={(e) => setJatuhTempo(e.target.value)}
                      placeholder="10"
                      className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Collapsible/Compact additional data references to keep things extremely clean */}
                <div className="border-t border-white/5 pt-3 space-y-3">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Detail Referensi ID (Opsional)</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Status WiFi</label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setWifiStatus('active')}
                          className={`flex-1 text-[9px] font-bold py-1 px-1.5 rounded border text-center cursor-pointer transition ${
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
                          className={`flex-1 text-[9px] font-bold py-1 px-1.5 rounded border text-center cursor-pointer transition ${
                            wifiStatus === 'inactive'
                              ? 'bg-white/5 text-slate-300 border-white/10'
                              : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'
                          }`}
                        >
                          Off
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">No. Sambungan PDAM</label>
                      <input
                        id="form-pdam"
                        type="text"
                        value={pdamId}
                        onChange={(e) => setPdamId(e.target.value)}
                        placeholder="PDAM-KRJ-000"
                        className="w-full text-[11px] glass-input rounded p-1.5 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">ID Pelanggan Listrik PLN</label>
                    <input
                      id="form-pln"
                      type="text"
                      value={plnId}
                      onChange={(e) => setPlnId(e.target.value)}
                      placeholder="53110294xxxx"
                      className="w-full text-[11px] glass-input rounded p-1.5 focus:outline-none font-mono"
                    />
                  </div>
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
