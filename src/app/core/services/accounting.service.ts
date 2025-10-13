import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Account, 
  JournalEntry, 
  InventoryMovement, 
  ArInvoice, 
  LedgerAccount, 
  TrialBalance,
  AccountingFilters,
  Product
} from '../models/accounting.models';

@Injectable({
  providedIn: 'root'
})
export class AccountingService {
  private apiUrl = 'http://localhost:3000/api/accounting';
  private productsUrl = 'http://localhost:3000/api/products';

  constructor(private http: HttpClient) {}

  // Catálogo de cuentas
  getAccounts(): Observable<Account[]> {
    return this.http.get<Account[]>(`${this.apiUrl}/accounts`);
  }

  // Libro Diario
  getJournalEntries(filters?: AccountingFilters): Observable<JournalEntry[]> {
    let params = new HttpParams();
    
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters?.source) {
      params = params.set('source', filters.source);
    }

    return this.http.get<JournalEntry[]>(`${this.apiUrl}/journal-entries`, { params });
  }

  // Libro Mayor
  getLedger(): Observable<{ [key: number]: LedgerAccount }> {
    return this.http.get<{ [key: number]: LedgerAccount }>(`${this.apiUrl}/ledger`);
  }

  // Movimientos de inventario
  getInventoryMovements(filters?: any): Observable<{ movements: InventoryMovement[] }> {
    let params = new HttpParams();
    
    if (filters?.productId) {
      params = params.set('productId', filters.productId.toString());
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }
    if (filters?.movementType) {
      params = params.set('movementType', filters.movementType);
    }

    return this.http.get<{ movements: InventoryMovement[] }>(`${this.apiUrl}/inventory-movements`, { params });
  }

  // Libro de Ventas (IVA)
  getVatSales(filters?: AccountingFilters): Observable<ArInvoice[]> {
    let params = new HttpParams();
    
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<ArInvoice[]>(`${this.apiUrl}/vat/sales`, { params });
  }

  // Balance de Comprobación
  getTrialBalance(): Observable<TrialBalance> {
    return this.http.get<TrialBalance>(`${this.apiUrl}/trial-balance`);
  }

  // Productos
  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.productsUrl);
  }
}
