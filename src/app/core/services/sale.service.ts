import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Sale, SaleSummary, CartItem } from '../models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  createSale(sale: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt'>): Observable<Sale> {
    return this.http.post<Sale>(`${this.API_URL}/sales`, sale);
  }

  getSales(filters?: {
    startDate?: string;
    endDate?: string;
    cashierId?: number;
    invoiceType?: string;
    status?: string;
  }): Observable<Sale[]> {
    let params = new HttpParams();
    
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters?.cashierId) {
      params = params.set('cashierId', filters.cashierId.toString());
    }
    if (filters?.invoiceType) {
      params = params.set('invoiceType', filters.invoiceType);
    }
    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<Sale[]>(`${this.API_URL}/sales`, { params });
  }

  getSaleById(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.API_URL}/sales/${id}`);
  }

  getSaleByInvoiceNumber(invoiceNumber: string): Observable<Sale> {
    return this.http.get<Sale>(`${this.API_URL}/sales/invoice/${invoiceNumber}`);
  }

  cancelSale(id: number, reason: string): Observable<Sale> {
    return this.http.put<Sale>(`${this.API_URL}/sales/${id}/cancel`, { reason });
  }

  refundSale(id: number, reason: string): Observable<Sale> {
    return this.http.put<Sale>(`${this.API_URL}/sales/${id}/refund`, { reason });
  }

  getSalesSummary(filters?: {
    startDate?: string;
    endDate?: string;
    cashierId?: number;
  }): Observable<SaleSummary> {
    let params = new HttpParams();
    
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters?.cashierId) {
      params = params.set('cashierId', filters.cashierId.toString());
    }

    return this.http.get<SaleSummary>(`${this.API_URL}/sales/summary`, { params });
  }

  generateInvoiceNumber(invoiceType: 'consumidor_final' | 'credito_fiscal'): Observable<{ invoiceNumber: string }> {
    return this.http.get<{ invoiceNumber: string }>(`${this.API_URL}/sales/invoice-number/${invoiceType}`);
  }

  printReceipt(saleId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.API_URL}/sales/${saleId}/print`, {});
  }

  // Métodos para cálculos del carrito
  calculateItemTotal(item: CartItem): number {
    const subtotal = item.unitPrice * item.quantity;
    const tax = subtotal * (item.tax / 100);
    return subtotal + tax;
  }

  calculateCartTotals(items: CartItem[]): {
    subtotal: number;
    taxAmount: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const taxAmount = items.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      return sum + (itemSubtotal * (item.tax / 100));
    }, 0);
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  }
}
