import { useState, useEffect } from 'react';
import { User, Area, Pelanggan, Tagihan, CashFlow, BudgetPlan, ActiveTab, BillType } from './types';
import { 
  INITIAL_USERS, 
  INITIAL_AREAS, 
  INITIAL_PELANGGAN, 
  INITIAL_TAGIHAN, 
  INITIAL_CASH_FLOW, 
  INITIAL_BUDGETS,
  loadStoredData,
  saveStoredData 
} from './data/mockData';

// Component Imports
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PelangganManager from './components/PelangganManager';
import TagihanManager from './components/TagihanManager';
import PembayaranManager from './components/PembayaranManager';
import PetugasManager from './components/PetugasManager';
import KeuanganManager from './components/KeuanganManager';
import PlanningKeuangan from './components/PlanningKeuangan';
import TemplateSheets from './components/TemplateSheets';
import BackupRestore from './components/BackupRestore';

import { Shield, Lock } from 'lucide-react';

export default function App() {
  // 1. Core State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return loadStoredData<User | null>('logged_in_user', null);
  });
  
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return loadStoredData<ActiveTab>('active_tab', 'dashboard');
  });

  const [users, setUsers] = useState<User[]>(() => {
    return loadStoredData<User[]>('users', INITIAL_USERS);
  });

  const [areas, setAreas] = useState<Area[]>(() => {
    return loadStoredData<Area[]>('areas', INITIAL_AREAS);
  });

  const [pelanggan, setPelanggan] = useState<Pelanggan[]>(() => {
    return loadStoredData<Pelanggan[]>('pelanggan', INITIAL_PELANGGAN);
  });

  const [tagihan, setTagihan] = useState<Tagihan[]>(() => {
    return loadStoredData<Tagihan[]>('tagihan', INITIAL_TAGIHAN);
  });

  const [cashFlow, setCashFlow] = useState<CashFlow[]>(() => {
    return loadStoredData<CashFlow[]>('cash_flow', INITIAL_CASH_FLOW);
  });

  const [budgets, setBudgets] = useState<BudgetPlan[]>(() => {
    return loadStoredData<BudgetPlan[]>('budgets', INITIAL_BUDGETS);
  });

  // 2. State Synchronizers to LocalStorage
  useEffect(() => {
    saveStoredData('logged_in_user', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveStoredData('active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveStoredData('users', users);
  }, [users]);

  useEffect(() => {
    saveStoredData('areas', areas);
  }, [areas]);

  useEffect(() => {
    saveStoredData('pelanggan', pelanggan);
  }, [pelanggan]);

  useEffect(() => {
    saveStoredData('tagihan', tagihan);
  }, [tagihan]);

  useEffect(() => {
    saveStoredData('cash_flow', cashFlow);
  }, [cashFlow]);

  useEffect(() => {
    saveStoredData('budgets', budgets);
  }, [budgets]);


  // 3. Mutation Handlers

  // Customers (Pelanggan) CRUD & Bulk Importer
  const handleAddPelanggan = (p: Omit<Pelanggan, 'id' | 'code'>) => {
    const areaCode = areas.find(a => a.id === p.areaId)?.code || 'GEN';
    const num = String(pelanggan.filter(x => x.areaId === p.areaId).length + 1).padStart(3, '0');
    const newCode = `PLG-${areaCode}-${num}`;

    const newPelanggan: Pelanggan = {
      ...p,
      id: 'plg-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100),
      code: newCode
    };
    setPelanggan(prev => [newPelanggan, ...prev]);
  };

  const handleUpdatePelanggan = (p: Pelanggan) => {
    setPelanggan(prev => prev.map(x => x.id === p.id ? p : x));
  };

  const handleDeletePelanggan = (id: string) => {
    setPelanggan(prev => prev.filter(x => x.id !== id));
    // Cascade delete associated unpaid bills
    setTagihan(prev => prev.filter(t => !(t.pelangganId === id && t.status === 'unpaid')));
  };

  const handleImportPelangganList = (importedList: Omit<Pelanggan, 'id' | 'code'>[]) => {
    setPelanggan(prev => {
      let currentList = [...prev];
      const batchTimestamp = Date.now();
      importedList.forEach((item, index) => {
        const areaCode = areas.find(a => a.id === item.areaId)?.code || 'GEN';
        const num = String(currentList.filter(x => x.areaId === item.areaId).length + 1).padStart(3, '0');
        const code = `PLG-${areaCode}-${num}`;
        currentList.push({
          ...item,
          id: `plg-imp-${batchTimestamp}-${index}-${Math.floor(Math.random() * 1000000)}`,
          code: code
        });
      });
      return currentList;
    });
  };

  // Bills (Tagihan) handlers
  const handleAddTagihan = (t: Omit<Tagihan, 'id' | 'status'>) => {
    const newTagihan: Tagihan = {
      ...t,
      id: 'tag-' + new Date().getTime(),
      status: 'unpaid'
    };
    setTagihan(prev => [newTagihan, ...prev]);
  };

  const handleUpdateTagihan = (updated: Tagihan) => {
    setTagihan(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleDeleteTagihan = (id: string) => {
    setTagihan(prev => prev.filter(t => t.id !== id));
  };

  const handlePayTagihanDirectly = (tagihanId: string) => {
    if (!currentUser) return;
    const refNo = 'REF-' + Math.floor(100000 + Math.random() * 900000);
    const paidTime = new Date().toISOString();

    setTagihan(prev => prev.map(t => {
      if (t.id === tagihanId) {
        // Record payment
        const targetPlg = pelanggan.find(p => p.id === t.pelangganId);
        const plgName = targetPlg ? targetPlg.name : 'Pelanggan';

        // Add matching cash flow
        const newFlow: CashFlow = {
          id: 'cf-' + new Date().getTime(),
          type: 'masuk',
          category: t.type === 'wifi' ? 'Pembayaran WiFi' : t.type === 'pln' ? 'Pembayaran Listrik' : 'Pembayaran PDAM',
          amount: t.amount,
          date: paidTime.split('T')[0],
          description: `Pembayaran ${t.type.toUpperCase()} ${plgName} - Periode ${t.month} via Kasir ${currentUser.name}`,
          referenceId: t.id
        };
        
        setCashFlow(flowPrev => [newFlow, ...flowPrev]);

        // Sync to budget actual amounts
        setBudgets(budgetsPrev => budgetsPrev.map(b => {
          // If a budget target relates to this, let's increment the achievement spent amount
          const isCategoryMatch = b.category === 'pemasukan';
          const isPeriodMatch = b.period === 'bulanan'; // simplify matching to bulanan target
          const isNameMatch = b.name.toLowerCase().includes(t.type);
          
          if (isCategoryMatch && (isPeriodMatch || isNameMatch)) {
            return { ...b, spentAmount: b.spentAmount + t.amount };
          }
          return b;
        }));

        return {
          ...t,
          status: 'paid',
          officerId: currentUser.id,
          paidAt: paidTime,
          referenceNo: refNo
        };
      }
      return t;
    }));
  };

  // Area & Cashier Assignment
  const handleAddArea = (a: Omit<Area, 'id'>) => {
    const newArea: Area = {
      ...a,
      id: 'area-' + new Date().getTime()
    };
    setAreas(prev => [...prev, newArea]);
  };

  const handleUpdateArea = (a: Area) => {
    setAreas(prev => prev.map(x => x.id === a.id ? a : x));
  };

  const handleDeleteArea = (id: string) => {
    setAreas(prev => prev.filter(x => x.id !== id));
    // Reset staff working in this area
    setUsers(prev => prev.map(u => u.areaId === id ? { ...u, areaId: undefined } : u));
  };

  const handleAssignUserArea = (userId: string, areaId: string | undefined) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, areaId } : u));
  };

  // CashFlow
  const handleAddCashFlow = (cf: Omit<CashFlow, 'id'>) => {
    const newFlow: CashFlow = {
      ...cf,
      id: 'cf-' + new Date().getTime()
    };
    setCashFlow(prev => [newFlow, ...prev]);

    // Apply to budget plans
    setBudgets(prevBudgets => prevBudgets.map(b => {
      const isPeriodMatch = b.period === 'bulanan'; // default simplified mapping
      const isTypeMatch = (b.category === 'pengeluaran' && cf.type === 'keluar') || (b.category === 'pemasukan' && cf.type === 'masuk');
      
      if (isTypeMatch && isPeriodMatch) {
        return { ...b, spentAmount: b.spentAmount + cf.amount };
      }
      return b;
    }));
  };

  const handleDeleteCashFlow = (id: string) => {
    setCashFlow(prev => prev.filter(x => x.id !== id));
  };

  const handleUpdateCashFlow = (updated: CashFlow) => {
    setCashFlow(prev => prev.map(x => x.id === updated.id ? updated : x));
  };

  const handleImportPetugas = (importedPetugas: Omit<User, 'id'>[]) => {
    setUsers(prev => {
      const newList = [...prev];
      importedPetugas.forEach((item, index) => {
        // Prevent duplicate usernames
        const exists = newList.some(u => u.username.toLowerCase() === item.username.toLowerCase());
        if (!exists) {
          newList.push({
            ...item,
            id: 'user-imp-' + Date.now() + '-' + index + '-' + Math.floor(Math.random() * 1000)
          });
        }
      });
      return newList;
    });
  };

  const handleImportPembayaran = (importedPayments: {
    pelangganCodeOrName: string;
    type: BillType;
    month: string;
    amount: number;
    paidAt: string;
    referenceNo: string;
    officerUsername?: string;
  }[]) => {
    const newTagihans: Tagihan[] = [];
    const newCashFlows: CashFlow[] = [];

    importedPayments.forEach((item, index) => {
      const plg = pelanggan.find(p => 
        p.code.toLowerCase() === item.pelangganCodeOrName.toLowerCase() ||
        p.name.toLowerCase() === item.pelangganCodeOrName.toLowerCase()
      );

      if (!plg) return; // skip if customer does not exist

      const officer = users.find(u => u.username.toLowerCase() === (item.officerUsername || '').toLowerCase()) || currentUser;
      const tagihanId = 'tag-imp-' + Date.now() + '-' + index + '-' + Math.floor(Math.random() * 1000);
      const refNo = item.referenceNo || 'REF-' + Math.floor(100000 + Math.random() * 900000);

      const newT: Tagihan = {
        id: tagihanId,
        pelangganId: plg.id,
        type: item.type,
        month: item.month,
        amount: item.amount,
        dueDate: item.month + '-20',
        status: 'paid',
        officerId: officer?.id,
        paidAt: item.paidAt || new Date().toISOString(),
        referenceNo: refNo
      };
      newTagihans.push(newT);

      // Log cashflow automatically to keep financial summary balanced!
      const flowId = 'cf-imp-pay-' + Date.now() + '-' + index + '-' + Math.floor(Math.random() * 1000);
      const newCF: CashFlow = {
        id: flowId,
        type: 'masuk',
        category: item.type === 'wifi' ? 'Pembayaran WiFi' : item.type === 'pln' ? 'Pembayaran PLN' : 'Pembayaran PDAM',
        amount: item.amount,
        date: (item.paidAt ? new Date(item.paidAt) : new Date()).toISOString().split('T')[0],
        description: `Pembayaran ${item.type.toUpperCase()} Periode ${item.month} - Ref: ${refNo} (Pelanggan: ${plg.name})`,
        referenceId: tagihanId
      };
      newCashFlows.push(newCF);
    });

    if (newTagihans.length > 0) {
      setTagihan(prev => [...newTagihans, ...prev]);
      setCashFlow(prev => [...newCashFlows, ...prev]);
    }
  };

  const handleImportCashFlow = (importedFlows: Omit<CashFlow, 'id'>[]) => {
    setCashFlow(prev => {
      const newList = [...prev];
      importedFlows.forEach((item, index) => {
        newList.push({
          ...item,
          id: 'cf-imp-' + Date.now() + '-' + index + '-' + Math.floor(Math.random() * 1000)
        });
      });
      return newList;
    });
  };

  // Budgeting/Planning
  const handleAddBudget = (b: Omit<BudgetPlan, 'id' | 'spentAmount'>) => {
    const newBudget: BudgetPlan = {
      ...b,
      id: 'bp-' + new Date().getTime(),
      spentAmount: 0
    };
    setBudgets(prev => [newBudget, ...prev]);
  };

  const handleDeleteBudget = (id: string) => {
    setBudgets(prev => prev.filter(x => x.id !== id));
  };

  const handleUpdateBudget = (updated: BudgetPlan) => {
    setBudgets(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  // Backup & Restore Engine
  const handleExportBackup = () => {
    const dbState = {
      users,
      areas,
      pelanggan,
      tagihan,
      cashFlow,
      budgets
    };

    const jsonString = JSON.stringify(dbState, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", url);
    dlAnchorElem.setAttribute("download", `Backup_LoketDigital_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (jsonString: string): boolean => {
    try {
      const dbState = JSON.parse(jsonString);
      
      // Resilient recovery: if any key is missing, keep current state or fallback to default
      if (dbState.users) setUsers(dbState.users);
      if (dbState.areas) setAreas(dbState.areas);
      if (dbState.pelanggan) setPelanggan(dbState.pelanggan);
      if (dbState.tagihan) setTagihan(dbState.tagihan);
      if (dbState.cashFlow) setCashFlow(dbState.cashFlow);
      if (dbState.budgets) setBudgets(dbState.budgets);

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const handleResetToDefault = () => {
    setUsers(INITIAL_USERS);
    setAreas(INITIAL_AREAS);
    setPelanggan(INITIAL_PELANGGAN);
    setTagihan(INITIAL_TAGIHAN);
    setCashFlow(INITIAL_CASH_FLOW);
    setBudgets(INITIAL_BUDGETS);
    setActiveTab('dashboard');
  };

  const handleWipeAllData = () => {
    setUsers(INITIAL_USERS);
    setAreas([]);
    setPelanggan([]);
    setTagihan([]);
    setCashFlow([]);
    setBudgets([]);
    setActiveTab('dashboard');
  };

  // Simulation Helper: Generate new month's bills with random values
  const handleAddSampleBills = () => {
    const months = ['2026-07', '2026-08', '2026-09'];
    const selectedMonth = months[Math.floor(Math.random() * months.length)];
    const generatedBills: Tagihan[] = [];

    pelanggan.forEach(plg => {
      // WiFi Bill (Fixed Rp 150.000, if active)
      if (plg.wifiStatus === 'active') {
        // check if bill already exists
        const exists = tagihan.some(t => t.pelangganId === plg.id && t.type === 'wifi' && t.month === selectedMonth);
        if (!exists) {
          generatedBills.push({
            id: `tag-sim-wf-${plg.id}-${selectedMonth}`,
            pelangganId: plg.id,
            type: 'wifi',
            month: selectedMonth,
            amount: 150000,
            dueDate: `${selectedMonth}-10`,
            status: 'unpaid'
          });
        }
      }

      // PLN Bill (Variable Rp 120k - Rp 340k)
      if (plg.plnId) {
        const exists = tagihan.some(t => t.pelangganId === plg.id && t.type === 'pln' && t.month === selectedMonth);
        if (!exists) {
          generatedBills.push({
            id: `tag-sim-pl-${plg.id}-${selectedMonth}`,
            pelangganId: plg.id,
            type: 'pln',
            month: selectedMonth,
            amount: Math.floor(12 + Math.random() * 23) * 10000,
            dueDate: `${selectedMonth}-20`,
            status: 'unpaid'
          });
        }
      }

      // PDAM Bill (Variable Rp 35k - Rp 95k)
      if (plg.pdamId) {
        const exists = tagihan.some(t => t.pelangganId === plg.id && t.type === 'pdam' && t.month === selectedMonth);
        if (!exists) {
          generatedBills.push({
            id: `tag-sim-pd-${plg.id}-${selectedMonth}`,
            pelangganId: plg.id,
            type: 'pdam',
            month: selectedMonth,
            amount: Math.floor(35 + Math.random() * 60) * 1000,
            dueDate: `${selectedMonth}-25`,
            status: 'unpaid'
          });
        }
      }
    });

    if (generatedBills.length === 0) {
      alert(`Tagihan untuk periode ${selectedMonth} sudah lengkap atau tidak ada pelanggan terintegrasi.`);
      return;
    }

    setTagihan(prev => [...generatedBills, ...prev]);
    alert(`Sukses! Berhasil men-generate ${generatedBills.length} lembar tagihan baru untuk periode bulan ${selectedMonth}. Silakan periksa di menu Tagihan.`);
  };


  // 4. View Router
  if (!currentUser) {
    return <LoginScreen users={users} onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 antialiased overflow-hidden relative">
      {/* Mesh Background */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] bg-purple-600 rounded-full blur-[100px]"></div>
      </div>

      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser} 
        onLogout={() => {
          setCurrentUser(null);
          setActiveTab('dashboard');
        }}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden z-10 relative">
        {/* Top bar header */}
        <header className="backdrop-blur-md bg-slate-900/40 border-b border-white/10 h-16 flex items-center justify-between px-6 shrink-0 relative z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Lokasi Loket:</span>
            <span className="text-xs font-bold text-slate-100 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full">
              Kantor Balai Desa Sukomaju
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Akses Masuk Anda:</span>
              <span className="text-xs font-bold text-slate-200">{currentUser.name}</span>
            </div>
            
            <div className="h-8 w-px bg-white/10" />

            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <Shield className="h-3.5 w-3.5" />
              Sesi {currentUser.role.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Section scrollable */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard 
              pelanggan={pelanggan} 
              tagihan={tagihan} 
              cashFlow={cashFlow}
              areas={areas}
              onAddSampleBills={handleAddSampleBills}
            />
          )}

          {activeTab === 'pelanggan' && currentUser.role === 'admin' && (
            <PelangganManager 
              pelanggan={pelanggan} 
              areas={areas}
              onAddPelanggan={handleAddPelanggan}
              onUpdatePelanggan={handleUpdatePelanggan}
              onDeletePelanggan={handleDeletePelanggan}
              onImportPelanggan={handleImportPelangganList}
            />
          )}

          {activeTab === 'tagihan' && (
            <TagihanManager 
              tagihan={tagihan} 
              pelanggan={pelanggan} 
              areas={areas}
              users={users}
              currentUser={currentUser}
              onAddTagihan={handleAddTagihan}
              onUpdateTagihan={handleUpdateTagihan}
              onDeleteTagihan={handleDeleteTagihan}
              onPayTagihanDirectly={handlePayTagihanDirectly}
            />
          )}

          {activeTab === 'pembayaran' && (
            <PembayaranManager 
              tagihan={tagihan} 
              pelanggan={pelanggan} 
              areas={areas}
              users={users}
              currentUser={currentUser}
              onImportPembayaran={handleImportPembayaran}
            />
          )}

          {activeTab === 'petugas' && currentUser.role === 'admin' && (
            <PetugasManager 
              users={users} 
              areas={areas}
              onAddArea={handleAddArea}
              onUpdateArea={handleUpdateArea}
              onDeleteArea={handleDeleteArea}
              onAssignUserArea={handleAssignUserArea}
              onImportPetugas={handleImportPetugas}
            />
          )}

          {activeTab === 'keuangan' && currentUser.role === 'admin' && (
            <KeuanganManager 
              cashFlow={cashFlow}
              onAddCashFlow={handleAddCashFlow}
              onUpdateCashFlow={handleUpdateCashFlow}
              onDeleteCashFlow={handleDeleteCashFlow}
              onImportCashFlow={handleImportCashFlow}
            />
          )}

          {activeTab === 'planning' && currentUser.role === 'admin' && (
            <PlanningKeuangan 
              budgets={budgets}
              onAddBudget={handleAddBudget}
              onUpdateBudget={handleUpdateBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeTab === 'templates' && (
            <TemplateSheets />
          )}

          {activeTab === 'backup' && currentUser.role === 'admin' && (
            <BackupRestore 
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetToDefault={handleResetToDefault}
              onWipeAllData={handleWipeAllData}
              currentDbState={{
                users,
                areas,
                pelanggan,
                tagihan,
                cashFlow,
                budgets
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
