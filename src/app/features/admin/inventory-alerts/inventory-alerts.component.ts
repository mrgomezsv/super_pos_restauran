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
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon style="vertical-align:middle; margin-right:8px;">warning</mat-icon>
        Alertas de Inventario
        <span *ngIf="alertCount > 0" 
              style="background:#f44336; color:white; padding:2px 8px; border-radius:12px; font-size:12px; margin-left:8px;">
          {{alertCount}}
        </span>
      </mat-card-title>
      <mat-card-subtitle>Productos con stock bajo el mínimo</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <button mat-stroked-button color="primary" (click)="load()" style="margin-bottom:16px;">
        <mat-icon>refresh</mat-icon>
        Actualizar
      </button>

      <table mat-table [dataSource]="alerts" style="width:100%;" class="mat-elevation-z2">
        <ng-container matColumnDef="code">
          <th mat-header-cell *matHeaderCellDef> Código </th>
          <td mat-cell *matCellDef="let r"> {{r.code}} </td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef> Producto </th>
          <td mat-cell *matCellDef="let r"> 
            <div>
              <div style="font-weight:500;">{{r.name}}</div>
              <div style="font-size:11px; color:#757575;">{{r.category}} {{r.brand ? '| ' + r.brand : ''}}</div>
            </div>
          </td>
        </ng-container>

        <ng-container matColumnDef="stock">
          <th mat-header-cell *matHeaderCellDef> Stock </th>
          <td mat-cell *matCellDef="let r"> 
            <span [style.color]="getStockColor(r.urgency)" style="font-weight:500;">
              {{r.stock}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="min">
          <th mat-header-cell *matHeaderCellDef> Mínimo </th>
          <td mat-cell *matCellDef="let r"> {{r.minStock}} </td>
        </ng-container>

        <ng-container matColumnDef="urgency">
          <th mat-header-cell *matHeaderCellDef> Urgencia </th>
          <td mat-cell *matCellDef="let r">
            <mat-chip [style.background-color]="getUrgencyColor(r.urgency)" style="color:white; font-size:11px;">
              {{getUrgencyLabel(r.urgency)}}
            </mat-chip>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>

      <div *ngIf="alerts.length === 0" style="text-align:center; padding:48px; color:#757575;">
        <mat-icon style="font-size:64px; width:64px; height:64px; color:#4caf50;">check_circle</mat-icon>
        <p style="margin-top:16px; font-size:16px;">No hay productos con stock bajo</p>
        <p style="font-size:12px;">Todos los productos tienen stock adecuado</p>
      </div>
    </mat-card-content>
  </mat-card>
  `,
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
