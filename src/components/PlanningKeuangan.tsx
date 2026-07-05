import React, { useState } from 'react';
import { BudgetPlan } from '../types';
import { 
  Plus, 
  CheckCircle,
  X,
  Trash2,
  AlertTriangle,
  Edit
} from 'lucide-react';

interface PlanningKeuanganProps {
  budgets: BudgetPlan[];
  onAddBudget: (b: Omit<BudgetPlan, 'id' | 'spentAmount'>) => void;
  onUpdateBudget: (b: BudgetPlan) => void;
  onDeleteBudget: (id: string) => void;
}

export default function PlanningKeuangan({
  budgets,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget
}: PlanningKeuanganProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPeriodTab, setSelectedPeriodTab] = useState<'harian' | 'mingguan' | 'bulanan'>('bulanan');
  const [editingBudget, setEditingBudget] = useState<BudgetPlan | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('bulanan');
  const [targetAmount, setTargetAmount] = useState('');
  const [category, setCategory] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [notes, setNotes] = useState('');

  const formatRupiah = (num: number) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount) return;

    if (editingBudget) {
      onUpdateBudget({
        ...editingBudget,
        name,
        period,
        targetAmount: Number(targetAmount),
        category,
        notes
      });
    } else {
      onAddBudget({
        name,
        period,
        targetAmount: Number(targetAmount),
        category,
        notes
      });
    }

    setIsModalOpen(false);
    setName('');
    setTargetAmount('');
    setNotes('');
    setEditingBudget(null);
  };

  // Filter budgets based on period tab selection
  const filteredBudgets = budgets.filter(b => b.period === selectedPeriodTab);

  return (
    <div className="space-y-6 z-10 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Perencanaan (Planning) Keuangan</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Rencanakan target iuran kas (pemasukan) dan batas anggaran operasional (pengeluaran)</p>
        </div>
        <button
          id="btn-add-budget"
          onClick={() => {
            setEditingBudget(null);
            setPeriod(selectedPeriodTab);
            setName('');
            setTargetAmount('');
            setCategory('pengeluaran');
            setNotes('');
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-xs font-bold transition duration-150 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Buat Rencana Baru
        </button>
      </div>

      {/* Period Selection Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/5 rounded-lg w-full max-w-sm">
        {(['harian', 'mingguan', 'bulanan'] as const).map((p) => (
          <button
            id={`tab-budget-period-${p}`}
            key={p}
            onClick={() => setSelectedPeriodTab(p)}
            className={`flex-1 text-center py-1.5 rounded-md text-xs font-bold uppercase tracking-wider cursor-pointer transition ${
              selectedPeriodTab === p
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Planning list bento-style cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBudgets.length === 0 ? (
          <div className="md:col-span-2 bg-white/5 border border-white/10 border-dashed rounded-2xl p-10 text-center text-slate-400 text-xs italic font-medium">
            Belum ada rencana keuangan dibuat untuk kategori {selectedPeriodTab}. Klik "Buat Rencana Baru" untuk memulai!
          </div>
        ) : (
          filteredBudgets.map((b) => {
            // Calculate progress percentage
            const pct = Math.min(Math.round((b.spentAmount / b.targetAmount) * 100), 100);
            const isPemasukan = b.category === 'pemasukan';
            
            // For Pemasukan: More is better.
            // For Pengeluaran: Over budget is bad.
            const isOverBudget = !isPemasukan && b.spentAmount > b.targetAmount;
            const isTargetAchieved = isPemasukan && b.spentAmount >= b.targetAmount;

            return (
              <div key={b.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      isPemasukan 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    }`}>
                      {b.category} • {b.period}
                    </span>
                    <h3 className="text-xs font-bold text-white">{b.name}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">{b.notes}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      id={`edit-budget-${b.id}`}
                      onClick={() => {
                        setEditingBudget(b);
                        setName(b.name);
                        setPeriod(b.period);
                        setTargetAmount(String(b.targetAmount));
                        setCategory(b.category);
                        setNotes(b.notes);
                        setIsModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                      title="Edit Anggaran"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`delete-budget-${b.id}`}
                      onClick={() => {
                        if (confirm(`Hapus rencana keuangan "${b.name}"?`)) {
                          onDeleteBudget(b.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition cursor-pointer"
                      title="Hapus Anggaran"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar info */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-medium text-slate-300">
                    <span>Realisasi: <span className="font-extrabold text-white">{formatRupiah(b.spentAmount)}</span></span>
                    <span>Target: <span className="font-extrabold text-slate-300">{formatRupiah(b.targetAmount)}</span></span>
                  </div>

                  {/* Progress visual line */}
                  <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden relative border border-white/5">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPemasukan 
                          ? 'bg-emerald-500' 
                          : isOverBudget ? 'bg-rose-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Badges of achievements */}
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{pct}% Tercapai</span>
                    
                    {isOverBudget && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                        <AlertTriangle className="h-3 w-3 text-rose-400" />
                        MELEBIHI BATAS
                      </span>
                    )}

                    {isTargetAchieved && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                        TARGET TERCAPAI
                      </span>
                    )}

                    {!isOverBudget && !isTargetAchieved && (
                      <span className="text-[9px] font-bold text-slate-400 italic">Berjalan Lancar</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Budget Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel-heavy w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                {editingBudget ? 'Edit Rencana Anggaran' : 'Buat Rencana Anggaran Baru'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Anggaran / Rencana</label>
                <input
                  id="budget-form-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g. Iuran WiFi Bulanan, Perbaikan Pipa"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori Aliran</label>
                  <select
                    id="budget-form-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as 'pemasukan' | 'pengeluaran')}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  >
                    <option value="pengeluaran">Pengeluaran (Batas Max)</option>
                    <option value="pemasukan">Pemasukan (Target Min)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Periode Keuangan</label>
                  <select
                    id="budget-form-period"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as 'harian' | 'mingguan' | 'bulanan')}
                    className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                  >
                    <option value="harian">Harian</option>
                    <option value="mingguan">Mingguan</option>
                    <option value="bulanan">Bulanan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Target Nominal (Rp)</label>
                <input
                  id="budget-form-amount"
                  type="number"
                  required
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="500000"
                  className="w-full text-xs glass-input rounded-lg p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Catatan Tambahan</label>
                <textarea
                  id="budget-form-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="E.g. Target tagihan harus lunas pada minggu pertama"
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
                  {editingBudget ? 'Simpan Rencana' : 'Buat Rencana'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
