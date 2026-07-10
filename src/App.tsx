import { useState, useEffect, useRef } from 'react';
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

// Firebase Sync and Auth
import { initAuth, googleSignIn } from './lib/firebase';
import { saveStateToFirestore, subscribeStateFromFirestore, mergeStates, getStateFromFirestore, canonicalStringify } from './lib/firebaseSync';
import { type User as FirebaseUser } from 'firebase/auth';

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
import BackupRestore from './components/BackupRestore';

import { Shield, Lock, Cloud, CloudOff, RefreshCw, FolderSync } from 'lucide-react';

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

  // 1b. Firebase Cloud Sync State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState<boolean>(false);

  // Latest state ref to avoid stale closures in event listeners
  const stateRef = useRef({ users, areas, pelanggan, tagihan, cashFlow, budgets });
  useEffect(() => {
    stateRef.current = { users, areas, pelanggan, tagihan, cashFlow, budgets };
  }, [users, areas, pelanggan, tagihan, cashFlow, budgets]);

  // Keep track of the last synchronized remote state string to prevent recursive write loops
  const lastRemoteStateRef = useRef<string | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user) => {
        setFirebaseUser(user);
      },
      () => {
        setFirebaseUser(null);
        setHasLoadedFromCloud(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time synchronization with Firestore via onSnapshot
  useEffect(() => {
    if (!firebaseUser) return;

    setSyncing(true);
    setSyncError(null);

    let isFirstLoad = true;

    const unsubscribe = subscribeStateFromFirestore(
      firebaseUser.uid,
      async (cloudState, exists) => {
        const cloudStateStr = canonicalStringify(cloudState);
        
        // Fetch current local state safely via ref
        const currentState = stateRef.current;
        const currentStateStr = canonicalStringify(currentState);

        // If the incoming cloud state is identical to our local state representation, skip setting state
        if (cloudStateStr === currentStateStr) {
          lastRemoteStateRef.current = cloudStateStr;
          setSyncing(false);
          setHasLoadedFromCloud(true);
          return;
        }

        if (isFirstLoad) {
          isFirstLoad = false;
          if (exists) {
            // Adopt existing cloud state directly to prevent polluting the cloud with initial local mock data
            setUsers(cloudState.users || []);
            setAreas(cloudState.areas || []);
            setPelanggan(cloudState.pelanggan || []);
            setTagihan(cloudState.tagihan || []);
            setCashFlow(cloudState.cashFlow || []);
            setBudgets(cloudState.budgets || []);
            lastRemoteStateRef.current = cloudStateStr;
          } else {
            // Document does not exist in Cloud yet: initialize Cloud with our current local state
            lastRemoteStateRef.current = currentStateStr;
            try {
              await saveStateToFirestore(firebaseUser.uid, currentState);
            } catch (e) {
              console.error("Gagal menginisialisasi state awal ke cloud:", e);
            }
          }
        } else {
          // Check if there are local un-saved changes compared to the last synchronized remote state
          const hasUnsavedChanges = lastRemoteStateRef.current !== null && currentStateStr !== lastRemoteStateRef.current;
          
          if (hasUnsavedChanges) {
            // Merge to preserve both local edits and incoming cloud updates
            const mergedState = mergeStates(currentState, cloudState);
            setUsers(mergedState.users || []);
            setAreas(mergedState.areas || []);
            setPelanggan(mergedState.pelanggan || []);
            setTagihan(mergedState.tagihan || []);
            setCashFlow(mergedState.cashFlow || []);
            setBudgets(mergedState.budgets || []);

            const mergedStateStr = canonicalStringify(mergedState);
            lastRemoteStateRef.current = mergedStateStr;

            // Instantly push back the merged state so other clients receive the merge
            try {
              await saveStateToFirestore(firebaseUser.uid, mergedState);
            } catch (e) {
              console.error("Gagal mengunggah hasil gabungan real-time:", e);
            }
          } else {
            // Apply cloud state directly since we have no pending un-saved changes (allows smooth updates & deletions)
            setUsers(cloudState.users || []);
            setAreas(cloudState.areas || []);
            setPelanggan(cloudState.pelanggan || []);
            setTagihan(cloudState.tagihan || []);
            setCashFlow(cloudState.cashFlow || []);
            setBudgets(cloudState.budgets || []);

            lastRemoteStateRef.current = cloudStateStr;
          }
        }

        setHasLoadedFromCloud(true);
        setSyncing(false);
      },
      (err) => {
        console.error(err);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('offline') || errMsg.includes('Could not reach')) {
          setSyncError('Koneksi offline. Menunggu jaringan...');
        } else {
          setSyncError('Gagal sinkronisasi data dari Cloud Firestore');
        }
        setHasLoadedFromCloud(true);
        setSyncing(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  // Update cloud sync ID and reload cloud state
  const handleUpdateCloudSyncId = async (newId: string) => {
    localStorage.setItem('cloud_user_id', newId);
    setSyncing(true);
    setSyncError(null);

    try {
      // 1. Immediately fetch the database document for this ID from Firestore
      const cloudState = await getStateFromFirestore(newId);

      if (cloudState && (
        (cloudState.users && cloudState.users.length > 0) ||
        (cloudState.pelanggan && cloudState.pelanggan.length > 0) ||
        (cloudState.tagihan && cloudState.tagihan.length > 0)
      )) {
        // Yes, existing database found on Firestore! Load it instantly to state
        setUsers(cloudState.users || []);
        setAreas(cloudState.areas || []);
        setPelanggan(cloudState.pelanggan || []);
        setTagihan(cloudState.tagihan || []);
        setCashFlow(cloudState.cashFlow || []);
        setBudgets(cloudState.budgets || []);

        // Also save to localStorage immediately to persist across browser refreshes
        saveStoredData('users', cloudState.users || []);
        saveStoredData('areas', cloudState.areas || []);
        saveStoredData('pelanggan', cloudState.pelanggan || []);
        saveStoredData('tagihan', cloudState.tagihan || []);
        saveStoredData('cash_flow', cloudState.cashFlow || []);
        saveStoredData('budgets', cloudState.budgets || []);

        const cloudStateStr = canonicalStringify(cloudState);
        lastRemoteStateRef.current = cloudStateStr;

        const mockUser = {
          uid: newId,
          isAnonymous: true,
          displayName: 'Loket Digital',
          email: 'otomatis@loket.digital'
        } as FirebaseUser;
        setFirebaseUser(mockUser);
        setHasLoadedFromCloud(true);

        return {
          exists: true,
          userCount: cloudState.users?.length || 0,
          pelangganCount: cloudState.pelanggan?.length || 0,
          tagihanCount: cloudState.tagihan?.length || 0,
          areaCount: cloudState.areas?.length || 0
        };
      } else {
        // No existing database found or it is blank: initialize the Cloud DB with our current local state
        const currentState = stateRef.current;
        await saveStateToFirestore(newId, currentState);
        
        lastRemoteStateRef.current = canonicalStringify(currentState);

        const mockUser = {
          uid: newId,
          isAnonymous: true,
          displayName: 'Loket Digital',
          email: 'otomatis@loket.digital'
        } as FirebaseUser;
        setFirebaseUser(mockUser);
        setHasLoadedFromCloud(true);

        return {
          exists: false
        };
      }
    } catch (e: any) {
      console.error("Gagal mengganti ID Database:", e);
      setSyncError("Gagal menyambungkan ke database ID baru.");
      throw e;
    } finally {
      setSyncing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSyncError(null);
    try {
      await googleSignIn();
    } catch (err: any) {
      console.error(err);
      setSyncError('Gagal menghubungkan Google Account: ' + (err.message || ''));
    }
  };

  const handleForceSync = async () => {
    if (!firebaseUser) {
      alert('Tidak ada koneksi Cloud yang terhubung. Hubungkan ke Cloud terlebih dahulu.');
      return;
    }
    setSyncing(true);
    setSyncError(null);
    try {
      const currentState = {
        users,
        areas,
        pelanggan,
        tagihan,
        cashFlow,
        budgets
      };
      
      // 1. Get the latest state from Firestore first to merge safely, preventing overwriting with blank local data
      const cloudState = await getStateFromFirestore(firebaseUser.uid);
      let finalState = currentState;

      if (cloudState) {
        // Safe merge: Cloud items overwrite matching local items, and new cloud items are pulled
        finalState = mergeStates(currentState, cloudState);
      }
      
      // 2. Save the final merged state back to Cloud
      await saveStateToFirestore(firebaseUser.uid, finalState);

      // 3. Update local states
      setUsers(finalState.users || INITIAL_USERS);
      setAreas(finalState.areas || INITIAL_AREAS);
      setPelanggan(finalState.pelanggan || INITIAL_PELANGGAN);
      setTagihan(finalState.tagihan || INITIAL_TAGIHAN);
      setCashFlow(finalState.cashFlow || INITIAL_CASH_FLOW);
      setBudgets(finalState.budgets || INITIAL_BUDGETS);
      
      // Update local storage too to ensure immediate local persistence
      saveStoredData('users', finalState.users || INITIAL_USERS);
      saveStoredData('areas', finalState.areas || INITIAL_AREAS);
      saveStoredData('pelanggan', finalState.pelanggan || INITIAL_PELANGGAN);
      saveStoredData('tagihan', finalState.tagihan || INITIAL_TAGIHAN);
      saveStoredData('cash_flow', finalState.cashFlow || INITIAL_CASH_FLOW);
      saveStoredData('budgets', finalState.budgets || INITIAL_BUDGETS);

      lastRemoteStateRef.current = canonicalStringify(finalState);
      
      setSyncSuccess(true);
      setHasLoadedFromCloud(true);
      setTimeout(() => setSyncSuccess(false), 2000);
      alert('Sinkronisasi data manual berhasil! Seluruh data disinkronkan dengan aman ke Cloud.');
    } catch (err: any) {
      console.error(err);
      setSyncError('Gagal sinkronisasi data');
      alert('Gagal melakukan sinkronisasi data: ' + (err.message || String(err)));
    } finally {
      setSyncing(false);
    }
  };

  // Debounced auto sync to Firebase Firestore
  useEffect(() => {
    if (!firebaseUser || !hasLoadedFromCloud) return;

    const currentState = {
      users,
      areas,
      pelanggan,
      tagihan,
      cashFlow,
      budgets
    };
    const currentStateStr = canonicalStringify(currentState);

    // If local state matches last remote synchronized state, skip saving to prevent infinite updates
    if (currentStateStr === lastRemoteStateRef.current) {
      return;
    }

    const handler = setTimeout(async () => {
      setSyncing(true);
      setSyncError(null);
      try {
        await saveStateToFirestore(firebaseUser.uid, currentState);
        // Save successfully, update last synchronized representation
        lastRemoteStateRef.current = currentStateStr;
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 2000);
      } catch (err: any) {
        console.error(err);
        setSyncError('Gagal sinkronisasi data ke Cloud');
      } finally {
        setSyncing(false);
      }
    }, 800); // Responsive 800ms debounce for automated, instant cloud saving

    return () => clearTimeout(handler);
  }, [users, areas, pelanggan, tagihan, cashFlow, budgets, firebaseUser, hasLoadedFromCloud]);


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
  const handleAddPelanggan = (p: Omit<Pelanggan, 'id' | 'code'> & { code?: string }) => {
    let finalCode = p.code?.trim();
    if (!finalCode) {
      const areaCode = areas.find(a => a.id === p.areaId)?.code || 'GEN';
      const num = String(pelanggan.filter(x => x.areaId === p.areaId).length + 1).padStart(3, '0');
      finalCode = `PLG-${areaCode}-${num}`;
    }

    const newPelanggan: Pelanggan = {
      ...p,
      id: 'plg-' + new Date().getTime() + '-' + Math.floor(Math.random() * 100),
      code: finalCode
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

  const handleImportPelangganList = (importedList: (Omit<Pelanggan, 'id' | 'code'> & { code?: string })[]) => {
    setPelanggan(prev => {
      let currentList = [...prev];
      const batchTimestamp = Date.now();
      importedList.forEach((item, index) => {
        let finalCode = item.code?.trim();
        if (!finalCode) {
          const areaCode = areas.find(a => a.id === item.areaId)?.code || 'GEN';
          const num = String(currentList.filter(x => x.areaId === item.areaId).length + 1).padStart(3, '0');
          finalCode = `PLG-${areaCode}-${num}`;
        }
        currentList.push({
          ...item,
          id: `plg-imp-${batchTimestamp}-${index}-${Math.floor(Math.random() * 1000000)}`,
          code: finalCode
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

  const handleAddTagihanBulk = (newTags: Omit<Tagihan, 'id' | 'status'>[]) => {
    const batchTimestamp = new Date().getTime();
    const withIds: Tagihan[] = newTags.map((t, index) => ({
      ...t,
      id: `tag-${batchTimestamp}-${index}-${Math.floor(Math.random() * 1000000)}`,
      status: 'unpaid'
    }));
    setTagihan(prev => [...withIds, ...prev]);
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

  const handleAddPetugas = (newUser: Omit<User, 'id'>) => {
    setUsers(prev => {
      const exists = prev.some(u => u.username.toLowerCase() === newUser.username.toLowerCase());
      if (exists) {
        alert('Username sudah terdaftar! Harap gunakan username lain.');
        return prev;
      }
      return [
        ...prev,
        {
          ...newUser,
          id: 'user-' + Date.now() + '-' + Math.floor(Math.random() * 1000)
        }
      ];
    });
  };

  const handleUpdatePetugas = (updatedUser: User) => {
    setUsers(prev => {
      const isDuplicateUsername = prev.some(u => u.id !== updatedUser.id && u.username.toLowerCase() === updatedUser.username.toLowerCase());
      if (isDuplicateUsername) {
        alert('Username sudah terdaftar pada petugas lain! Harap gunakan username lain.');
        return prev;
      }
      return prev.map(u => u.id === updatedUser.id ? updatedUser : u);
    });

    // If current logged-in user updated their own name/username, update session info too
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      saveStoredData('logged_in_user', updatedUser);
    }
  };

  const handleDeletePetugas = (id: string) => {
    if (currentUser && id === currentUser.id) {
      alert('Anda tidak bisa menghapus akun Anda sendiri yang sedang aktif digunakan!');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== id));
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
    return (
      <LoginScreen 
        users={users} 
        areas={areas}
        onLoginSuccess={setCurrentUser} 
        onAddPetugas={handleAddPetugas}
        cloudSyncId={firebaseUser?.uid || ''}
        onUpdateCloudSyncId={handleUpdateCloudSyncId}
        syncing={syncing}
        syncError={syncError}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-950/80 font-sans text-slate-100 antialiased overflow-hidden relative">
      {/* Mesh Background */}
      <div className="absolute inset-0 z-0 opacity-65 pointer-events-none overflow-hidden">
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
              Kantor Balai Desa Gemblengan
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Cloud Sync Status Indicator */}
            <button 
              onClick={handleForceSync}
              disabled={syncing || !firebaseUser}
              className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition duration-300 hover:scale-105 active:scale-95 disabled:opacity-75 cursor-pointer ${
                syncError 
                  ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15' 
                  : syncing 
                    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' 
                    : !firebaseUser
                      ? 'text-slate-400 bg-white/5 border-white/5 animate-pulse'
                      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15'
              }`}
              title={syncError || (syncing ? 'Sedang menyimpan perubahan ke Firebase...' : !firebaseUser ? 'Menghubungkan ke server Firebase...' : 'Klik untuk sinkronisasi data manual secara real-time')}
            >
              {syncError ? (
                <>
                  <CloudOff className="h-3 w-3 text-rose-400" />
                  <span>Gagal Sinkron</span>
                </>
              ) : syncing ? (
                <>
                  <RefreshCw className="h-2.5 w-2.5 animate-spin text-amber-400" />
                  <span>Menyimpan...</span>
                </>
              ) : !firebaseUser ? (
                <>
                  <RefreshCw className="h-2.5 w-2.5 animate-spin text-slate-400" />
                  <span>Menghubungkan...</span>
                </>
              ) : (
                <>
                  <Cloud className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                  <span className="flex items-center gap-1">
                    Cloud Aktif (Sinkronkan)
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  </span>
                </>
              )}
            </button>

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
              onAddTagihanBulk={handleAddTagihanBulk}
              onUpdateTagihan={handleUpdateTagihan}
              onDeleteTagihan={handleDeleteTagihan}
              onPayTagihanDirectly={handlePayTagihanDirectly}
              onImportPembayaran={handleImportPembayaran}
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
              onAddPetugas={handleAddPetugas}
              onUpdatePetugas={handleUpdatePetugas}
              onDeletePetugas={handleDeletePetugas}
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
              cloudSyncId={firebaseUser?.uid || ''}
              onUpdateCloudSyncId={handleUpdateCloudSyncId}
              syncing={syncing}
              syncError={syncError}
              syncSuccess={syncSuccess}
              onForceSync={handleForceSync}
            />
          )}
        </main>
      </div>
    </div>
  );
}
