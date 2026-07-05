export type Role = 'admin' | 'kasir';

export type ActiveTab = 
  | 'dashboard'
  | 'pelanggan'
  | 'tagihan'
  | 'pembayaran'
  | 'petugas'
  | 'keuangan'
  | 'planning'
  | 'templates'
  | 'backup';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  areaId?: string; // If kasir, they can be assigned to an area
}

export interface Area {
  id: string;
  name: string; // Village area / Dusun
  code: string;
}

export interface Pelanggan {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  areaId: string; // Linked to Area
  wifiStatus: 'active' | 'inactive';
  plnId: string; // No Meter PLN
  pdamId: string; // No Sambungan PDAM
}

export type BillType = 'wifi' | 'pln' | 'pdam';

export interface Tagihan {
  id: string;
  pelangganId: string;
  type: BillType;
  month: string; // e.g. "2026-07"
  amount: number;
  dueDate: string;
  status: 'paid' | 'unpaid';
  officerId?: string; // Paid through which officer
  paidAt?: string;
  referenceNo?: string;
}

export interface CashFlow {
  id: string;
  type: 'masuk' | 'keluar';
  category: string; // e.g., "Pembayaran Tagihan WiFi", "Operasional", "Gaji Petugas"
  amount: number;
  date: string;
  description: string;
  referenceId?: string; // Connected to tagihan/pembayaran if 'masuk'
}

export interface BudgetPlan {
  id: string;
  name: string;
  period: 'harian' | 'mingguan' | 'bulanan';
  targetAmount: number;
  spentAmount: number;
  category: 'pemasukan' | 'pengeluaran';
  notes: string;
}
