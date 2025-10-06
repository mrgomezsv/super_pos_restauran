import { Product } from './product.model';

export interface CartItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  tax: number;
  total: number;
}

export interface Sale {
  id: number;
  invoiceNumber: string;
  customerName?: string;
  customerDocument?: string;
  customerEmail?: string;
  invoiceType: 'consumidor_final' | 'credito_fiscal';
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  paymentAmount: number;
  change: number;
  cashierId: number;
  cashierName: string;
  createdAt: Date;
  status: 'completed' | 'cancelled' | 'refunded';
}

export interface PaymentMethod {
  type: 'cash' | 'card' | 'transfer';
  amount: number;
}

export interface SaleSummary {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  salesByPaymentMethod: {
    cash: number;
    card: number;
    transfer: number;
  };
  salesByInvoiceType: {
    consumidor_final: number;
    credito_fiscal: number;
  };
}
