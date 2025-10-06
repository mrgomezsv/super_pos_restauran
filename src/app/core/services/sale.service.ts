import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Sale, SaleSummary } from '../models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class SaleService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getSales(
    startDate?: string,
    endDate?: string,
    cashierId?: number,
    paymentMethod?: string,
    status?: string
  ): Observable<Sale[]> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    if (cashierId) {
      params = params.set('cashierId', cashierId.toString());
    }
    if (paymentMethod) {
      params = params.set('paymentMethod', paymentMethod);
    }
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<Sale[]>(`${this.API_URL}/sales`, { params });
  }

  getSaleById(id: number): Observable<Sale> {
    return this.http.get<Sale>(`${this.API_URL}/sales/${id}`);
  }

  createSale(sale: Omit<Sale, 'id' | 'createdAt'>): Observable<Sale> {
    return this.http.post<Sale>(`${this.API_URL}/sales`, sale);
  }

  updateSale(id: number, sale: Partial<Sale>): Observable<Sale> {
    return this.http.put<Sale>(`${this.API_URL}/sales/${id}`, sale);
  }

  deleteSale(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/sales/${id}`);
  }

  getSalesSummary(
    startDate?: string,
    endDate?: string,
    cashierId?: number
  ): Observable<SaleSummary> {
    let params = new HttpParams();
    
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    if (cashierId) {
      params = params.set('cashierId', cashierId.toString());
    }

    return this.http.get<SaleSummary>(`${this.API_URL}/sales/summary`, { params });
  }
}