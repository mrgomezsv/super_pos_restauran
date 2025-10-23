import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';

interface InventoryAlert {
  id: number;
  code: string;
  name: string;
  stock: number;
  minStock: number;
  stockPercent: number;
  urgency: 'critico' | 'alto' | 'medio' | 'bajo';
  category: string;
  brand?: string;
}

@Component({
  selector: 'app-admin-inventory-alerts',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatTableModule, 
    MatIconModule, 
    MatButtonModule, 
    MatBadgeModule,
    MatChipsModule
  ],
  templateUrl: './inventory-alerts.component.html',
  styles: [`
    mat-card {
      margin: 16px;
    }
    mat-card-header {
      margin-bottom: 16px;
    }
    table {
      margin-top: 16px;
    }
  `]
})
export class AdminInventoryAlertsComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/inventory/alerts`;
  cols = ['code', 'name', 'stock', 'min', 'urgency'];
  alerts: InventoryAlert[] = [];
  alertCount = 0;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.http.get<{ total: number, alerts: InventoryAlert[] }>(this.api).subscribe({
      next: (data) => {
        this.alerts = data.alerts;
        this.alertCount = data.total;
      },
      error: (err) => {
        console.error('Error cargando alertas:', err);
        this.toastr.error('Error al cargar alertas de inventario');
      }
    });
  }

  getUrgencyColor(urgency: string): string {
    switch(urgency) {
      case 'critico': return '#d32f2f';
      case 'alto': return '#f57c00';
      case 'medio': return '#fbc02d';
      case 'bajo': return '#757575';
      default: return '#757575';
    }
  }

  getStockColor(urgency: string): string {
    switch(urgency) {
      case 'critico': return '#d32f2f';
      case 'alto': return '#f57c00';
      case 'medio': return '#fbc02d';
      default: return '#757575';
    }
  }

  getUrgencyLabel(urgency: string): string {
    switch(urgency) {
      case 'critico': return 'CRÍTICO';
      case 'alto': return 'ALTO';
      case 'medio': return 'MEDIO';
      case 'bajo': return 'BAJO';
      default: return urgency.toUpperCase();
    }
  }
}
