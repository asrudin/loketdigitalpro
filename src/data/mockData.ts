import { User, Area, Pelanggan, Tagihan, CashFlow, BudgetPlan } from '../types';

export const INITIAL_USERS: User[] = [
  { id: 'usr-1', username: 'admin', name: 'Ahmad Admin', role: 'admin' },
  { id: 'usr-2', username: 'budi', name: 'Budi Kasir', role: 'kasir', areaId: 'area-1' }, // Krajan
  { id: 'usr-3', username: 'siti', name: 'Siti Kasir', role: 'kasir', areaId: 'area-3' }, // Karanganyar
];

export const INITIAL_AREAS: Area[] = [
  { id: 'area-1', name: 'Dusun Krajan (Area Barat)', code: 'KRJ' },
  { id: 'area-2', name: 'Dusun Mulyorejo (Area Utara)', code: 'MLY' },
  { id: 'area-3', name: 'Dusun Karanganyar (Area Selatan)', code: 'KRG' },
  { id: 'area-4', name: 'Dusun Sendang (Area Timur)', code: 'SDG' },
];

export const INITIAL_PELANGGAN: Pelanggan[] = [
  {
    id: 'plg-1',
    code: 'PLG-KRJ-001',
    name: 'Supardi Purwanto',
    phone: '081234567890',
    address: 'Jl. Merdeka No. 12',
    areaId: 'area-1',
    wifiStatus: 'active',
    plnId: '531102948110',
    pdamId: 'PDAM-KRJ-204',
    billType: 'wifi',
    nominalBulanan: 150000,
    jatuhTempo: 10
  },
  {
    id: 'plg-2',
    code: 'PLG-KRJ-002',
    name: 'Dewi Lestari',
    phone: '081298765432',
    address: 'Jl. Anggrek No. 4',
    areaId: 'area-1',
    wifiStatus: 'active',
    plnId: '531102948111',
    pdamId: 'PDAM-KRJ-205',
    billType: 'wifi',
    nominalBulanan: 150000,
    jatuhTempo: 10
  },
  {
    id: 'plg-3',
    code: 'PLG-MLY-001',
    name: 'Joko Widodo Susilo',
    phone: '085722334455',
    address: 'RT 02 RW 04, Dusun Mulyorejo',
    areaId: 'area-2',
    wifiStatus: 'inactive',
    plnId: '531102948220',
    pdamId: 'PDAM-MLY-301',
    billType: 'pln',
    nominalBulanan: 245000,
    jatuhTempo: 20
  },
  {
    id: 'plg-4',
    code: 'PLG-KRG-001',
    name: 'Hendra Setiawan',
    phone: '082188990011',
    address: 'Samping Balai Dusun Karanganyar',
    areaId: 'area-3',
    wifiStatus: 'active',
    plnId: '531102948330',
    pdamId: 'PDAM-KRG-401',
    billType: 'wifi',
    nominalBulanan: 150000,
    jatuhTempo: 10
  },
  {
    id: 'plg-5',
    code: 'PLG-SDG-001',
    name: 'Rina Herawati',
    phone: '089911223344',
    address: 'Dekat Telaga Sendang, RT 01',
    areaId: 'area-4',
    wifiStatus: 'active',
    plnId: '531102948440',
    pdamId: 'PDAM-SDG-501',
    billType: 'wifi',
    nominalBulanan: 150000,
    jatuhTempo: 10
  },
  {
    id: 'plg-6',
    code: 'PLG-MLY-002',
    name: 'Bambang Sugeng',
    phone: '081344556677',
    address: 'Jl. Diponegoro Gang 5',
    areaId: 'area-2',
    wifiStatus: 'active',
    plnId: '531102948222',
    pdamId: 'PDAM-MLY-302',
    billType: 'pdam',
    nominalBulanan: 75000,
    jatuhTempo: 25
  }
];

export const INITIAL_TAGIHAN: Tagihan[] = [
  // WiFi Bills (Usually fixed, let's say Rp 150.000)
  { id: 'tag-1', pelangganId: 'plg-1', type: 'wifi', month: '2026-06', amount: 150000, dueDate: '2026-06-10', status: 'paid', officerId: 'usr-2', paidAt: '2026-06-08T09:30:00Z', referenceNo: 'REF-829104' },
  { id: 'tag-2', pelangganId: 'plg-1', type: 'wifi', month: '2026-07', amount: 150000, dueDate: '2026-07-10', status: 'unpaid' },
  { id: 'tag-3', pelangganId: 'plg-2', type: 'wifi', month: '2026-07', amount: 150000, dueDate: '2026-07-10', status: 'unpaid' },
  { id: 'tag-4', pelangganId: 'plg-4', type: 'wifi', month: '2026-07', amount: 150000, dueDate: '2026-07-10', status: 'unpaid' },
  { id: 'tag-5', pelangganId: 'plg-5', type: 'wifi', month: '2026-07', amount: 150000, dueDate: '2026-07-10', status: 'unpaid' },
  
  // PLN Bills (Variable based on usage, let's say Rp 90.000 to Rp 350.000)
  { id: 'tag-6', pelangganId: 'plg-1', type: 'pln', month: '2026-06', amount: 245000, dueDate: '2026-06-20', status: 'paid', officerId: 'usr-2', paidAt: '2026-06-18T14:20:00Z', referenceNo: 'REF-109284' },
  { id: 'tag-7', pelangganId: 'plg-1', type: 'pln', month: '2026-07', amount: 230000, dueDate: '2026-07-20', status: 'unpaid' },
  { id: 'tag-8', pelangganId: 'plg-2', type: 'pln', month: '2026-07', amount: 115000, dueDate: '2026-07-20', status: 'unpaid' },
  { id: 'tag-9', pelangganId: 'plg-3', type: 'pln', month: '2026-07', amount: 340000, dueDate: '2026-07-20', status: 'unpaid' },
  { id: 'tag-10', pelangganId: 'plg-6', type: 'pln', month: '2026-07', amount: 195000, dueDate: '2026-07-20', status: 'unpaid' },

  // PDAM Bills (Variable based on water usage, Rp 35.000 to Rp 120.000)
  { id: 'tag-11', pelangganId: 'plg-1', type: 'pdam', month: '2026-06', amount: 48000, dueDate: '2026-06-25', status: 'paid', officerId: 'usr-2', paidAt: '2026-06-18T14:25:00Z', referenceNo: 'REF-109285' },
  { id: 'tag-12', pelangganId: 'plg-1', type: 'pdam', month: '2026-07', amount: 52000, dueDate: '2026-07-25', status: 'unpaid' },
  { id: 'tag-13', pelangganId: 'plg-2', type: 'pdam', month: '2026-07', amount: 39000, dueDate: '2026-07-25', status: 'unpaid' },
  { id: 'tag-14', pelangganId: 'plg-3', type: 'pdam', month: '2026-07', amount: 88000, dueDate: '2026-07-25', status: 'unpaid' }
];

export const INITIAL_CASH_FLOW: CashFlow[] = [
  { id: 'cf-1', type: 'masuk', category: 'Pembayaran WiFi', amount: 150000, date: '2026-06-08', description: 'WiFi Supardi Purwanto - Periode 2026-06', referenceId: 'tag-1' },
  { id: 'cf-2', type: 'masuk', category: 'Pembayaran PLN', amount: 245000, date: '2026-06-18', description: 'PLN Supardi Purwanto - Periode 2026-06', referenceId: 'tag-6' },
  { id: 'cf-3', type: 'masuk', category: 'Pembayaran PDAM', amount: 48000, date: '2026-06-18', description: 'PDAM Supardi Purwanto - Periode 2026-06', referenceId: 'tag-11' },
  { id: 'cf-4', type: 'keluar', category: 'Biaya Pemeliharaan', amount: 250000, date: '2026-06-15', description: 'Pembelian kabel dropcore fiber optic & konektor' },
  { id: 'cf-5', type: 'keluar', category: 'Operasional Kantor', amount: 100000, date: '2026-06-20', description: 'Biaya pembelian kertas kuitansi & ATK' },
  { id: 'cf-6', type: 'keluar', category: 'Gaji Petugas', amount: 300000, date: '2026-06-28', description: 'Insentif penagihan petugas lapangan Bulan Juni' }
];

export const INITIAL_BUDGETS: BudgetPlan[] = [
  { id: 'bp-1', name: 'Target Operasional Bulanan', period: 'bulanan', targetAmount: 2000000, spentAmount: 650000, category: 'pengeluaran', notes: 'Batas pengeluaran operasional & pemeliharaan jaringan' },
  { id: 'bp-2', name: 'Alokasi Maintenance Mingguan', period: 'mingguan', targetAmount: 500000, spentAmount: 250000, category: 'pengeluaran', notes: 'Anggaran perawatan rutin perangkat WiFi & pipa PDAM' },
  { id: 'bp-3', name: 'Target Pemasukan Harian Loket', period: 'harian', targetAmount: 500000, spentAmount: 443000, category: 'pemasukan', notes: 'Ekspektasi setoran harian dari pembayaran loket digital' },
  { id: 'bp-4', name: 'Target WiFi Bulanan', period: 'bulanan', targetAmount: 1500000, spentAmount: 150000, category: 'pemasukan', notes: 'Target penerimaan iuran WiFi dari seluruh pelanggan aktif' }
];

export function loadStoredData<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(`desa_wifi_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error loading stored data for key: ' + key, error);
    return defaultValue;
  }
}

export function saveStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`desa_wifi_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving stored data for key: ' + key, error);
  }
}
