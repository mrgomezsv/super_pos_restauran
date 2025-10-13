/**
 * Modelos contables para el sistema Super POS
 */

export interface Account {
  id: number;
  code: string;
  name: string;
  accountType: string; // activo, pasivo, patrimonio, ingreso, gasto
  nature: string; // deudora, acreedora
  level: number;
  parentId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalLine {
  id: number;
  journalEntryId: number;
  accountId: number;
  description: string;
  debit: number;
  credit: number;
  costCenter?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: number;
  entryNumber: string;
  date: string;
  source: string; // pos, purchase, payment, adjustment
  reference: string;
  description: string;
  currency: string;
  status: string; // draft, posted, reversed
  createdBy: number;
  postedBy?: number;
  postedAt?: string;
  createdAt: string;
  lines: JournalLine[];
}

export interface InventoryMovement {
  id: number;
  productId: number;
  movementType: string; // entrada, salida
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference: string;
  referenceId?: number;
  createdAt: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  price?: number;
  cost?: number;
  category?: string;
  brand?: string;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  barcode?: string;
  taxRate?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArInvoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  customerDui?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  invoiceType: string;
  controlNumber?: string;
  journalEntryId?: number;
  createdAt: string;
}

export interface LedgerAccount {
  account: Account;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface TrialBalanceAccount {
  account: Account;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface TrialBalance {
  accounts: TrialBalanceAccount[];
  total_debits: number;
  total_credits: number;
  is_balanced: boolean;
}

// Interfaces para filtros
export interface AccountingFilters {
  startDate?: string;
  endDate?: string;
  source?: string;
  productId?: number;
}
