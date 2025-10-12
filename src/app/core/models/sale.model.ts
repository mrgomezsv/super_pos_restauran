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
  invoiceType: string;  // Código del documento fiscal (dinámico)
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'bitcoin';
  paymentAmount: number;
  change: number;
  cashierId: number;
  cashierName: string;
  createdAt: Date;
  status: 'completed' | 'cancelled' | 'refunded';
}

export interface PaymentMethod {
  type: 'cash' | 'card' | 'transfer' | 'bitcoin';
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
    bitcoin: number;
  };
  salesByInvoiceType: { [key: string]: number };  // Dinámico para soportar cualquier tipo de documento
}
