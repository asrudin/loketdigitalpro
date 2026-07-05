import { useState } from 'react';
import { SPREADSHEET_TEMPLATE_INFO, CODE_GS_TEMPLATE, INDEX_HTML_TEMPLATE } from '../data/templates';
import { Copy, Check, FileCode, Sheet, Globe, HelpCircle } from 'lucide-react';

export default function TemplateSheets() {
  const [activeTab, setActiveTab] = useState<'sheet' | 'gs' | 'html'>('sheet');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Template Integrasi Google Sheets</h1>
        <p className="text-xs text-slate-400 mt-0.5 font-medium">Salin template struktur spreadsheet, Apps Script, dan formulir bayar cepat untuk integrasi eksternal</p>
      </div>

      {/* Info Warning/Guide */}
      <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl text-xs text-indigo-200 leading-relaxed space-y-2">
        <h4 className="font-bold flex items-center gap-1.5 text-indigo-300">
          <HelpCircle className="h-4 w-4 text-indigo-400" />
          Bagaimana Cara Menghubungkan Google Sheets?
        </h4>
        <ol className="list-decimal list-inside space-y-1.5 pl-1 text-indigo-200/90">
          <li>Buat Google Spreadsheet baru di Google Drive Anda.</li>
          <li>Buat sheet-sheet bernama <span className="font-mono bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-bold">Pelanggan</span>, <span className="font-mono bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-bold">Pembayaran_Selesai</span>, dan <span className="font-mono bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-bold">Arus_Kas</span> sesuai dengan struktur kolom di tab di bawah.</li>
          <li>Klik menu <span className="font-bold">Ekstensi</span> &gt; <span className="font-bold">Apps Script</span> di spreadsheet Anda.</li>
          <li>Tempel kode dari tab <span className="font-bold">code.gs</span> dan ganti <span className="font-mono bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-bold">SPREADSHEET_ID</span> dengan ID Spreadsheet Anda.</li>
          <li>Buat file baru bernama <span className="font-mono bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded font-bold">index.html</span> di Apps Script, tempel kode dari tab <span className="font-bold">index.html</span>.</li>
          <li>Klik <span className="font-bold text-white">Terapkan (Deploy)</span> &gt; <span className="font-bold text-white">Penerapan Baru</span>. Pilih jenis "Aplikasi Web", akses untuk "Siapa Saja (Anyone)".</li>
        </ol>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="flex gap-4">
          <button
            id="tab-template-sheet"
            onClick={() => setActiveTab('sheet')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition ${
              activeTab === 'sheet'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sheet className="h-4 w-4" />
            Struktur Spreadsheet
          </button>

          <button
            id="tab-template-gs"
            onClick={() => setActiveTab('gs')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition ${
              activeTab === 'gs'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="h-4 w-4" />
            code.gs (Apps Script)
          </button>

          <button
            id="tab-template-html"
            onClick={() => setActiveTab('html')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 cursor-pointer transition ${
              activeTab === 'html'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-4 w-4" />
            index.html (Quick Pay)
          </button>
        </div>
      </div>

      {/* Code Area Wrapper */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-lg flex flex-col relative">
        {/* Copy Floating Header */}
        <div className="p-3 bg-slate-950/40 border-b border-white/10 flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>{activeTab === 'sheet' ? 'REKOMENDASI KOLOM SPREADSHEET' : activeTab === 'gs' ? 'GOOGLE APPS SCRIPT FILE' : 'EMBEDDED HTML LOKET'}</span>
          
          <button
            id={`btn-copy-template-${activeTab}`}
            onClick={() => {
              const text = activeTab === 'sheet' ? SPREADSHEET_TEMPLATE_INFO : activeTab === 'gs' ? CODE_GS_TEMPLATE : INDEX_HTML_TEMPLATE;
              handleCopy(text, activeTab);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 font-bold cursor-pointer transition text-[10px]"
          >
            {copied === activeTab ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                Berhasil Disalin!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Salin Template
              </>
            )}
          </button>
        </div>

        {/* Content viewer */}
        <div className="p-5 overflow-x-auto max-h-[400px]">
          <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre select-all">
            {activeTab === 'sheet' && SPREADSHEET_TEMPLATE_INFO}
            {activeTab === 'gs' && CODE_GS_TEMPLATE}
            {activeTab === 'html' && INDEX_HTML_TEMPLATE}
          </pre>
        </div>
      </div>
    </div>
  );
}
