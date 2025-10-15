import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../environments/environment';

interface AuditLog {
  id: number;
  company_id?: number;
  userId: number;
  action: string;
  module: string;
  detail?: string;
  createdAt: string;
}

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    MatCardModule, 
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon style="vertical-align:middle; margin-right:8px;">history</mat-icon>
        Bitácora de Auditoría
      </mat-card-title>
      <mat-card-subtitle>Eventos de auditoría por usuario y módulo</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <!-- Filtros -->
      <form [formGroup]="filterForm" style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
        <mat-form-field appearance="outline" style="flex:0 0 180px;">
          <mat-label>Módulo</mat-label>
          <mat-select formControlName="module">
            <mat-option value="">Todos</mat-option>
            <mat-option value="Authentication">Autenticación</mat-option>
            <mat-option value="Products">Productos</mat-option>
            <mat-option value="Sales">Ventas</mat-option>
            <mat-option value="Users">Usuarios</mat-option>
            <mat-option value="Configuration">Configuración</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:0 0 140px;">
          <mat-label>Fecha Inicio</mat-label>
          <input matInput type="date" formControlName="startDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:0 0 140px;">
          <mat-label>Fecha Fin</mat-label>
          <input matInput type="date" formControlName="endDate" />
        </mat-form-field>

        <button mat-stroked-button color="primary" (click)="load()" style="height:56px;">
          <mat-icon>search</mat-icon>
          Buscar
        </button>

        <button mat-stroked-button (click)="clearFilters()" style="height:56px;">
          <mat-icon>clear</mat-icon>
          Limpiar
        </button>
      </form>

      <!-- Tabla -->
      <table mat-table [dataSource]="logs" class="mat-elevation-z2" style="width:100%;">
        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef> Fecha/Hora </th>
          <td mat-cell *matCellDef="let log"> 
            <div style="font-size:13px;">{{log.createdAt | date:'dd/MM/yyyy'}}</div>
            <div style="font-size:11px; color:#757575;">{{log.createdAt | date:'HH:mm:ss'}}</div>
          </td>
        </ng-container>

        <ng-container matColumnDef="user">
          <th mat-header-cell *matHeaderCellDef> Usuario ID </th>
          <td mat-cell *matCellDef="let log"> {{log.userId}} </td>
        </ng-container>

        <ng-container matColumnDef="action">
          <th mat-header-cell *matHeaderCellDef> Acción </th>
          <td mat-cell *matCellDef="let log">
            <span [style.color]="getActionColor(log.action)" style="font-weight:500;">
              {{log.action}}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="module">
          <th mat-header-cell *matHeaderCellDef> Módulo </th>
          <td mat-cell *matCellDef="let log"> {{log.module}} </td>
        </ng-container>

        <ng-container matColumnDef="detail">
          <th mat-header-cell *matHeaderCellDef> Detalle </th>
          <td mat-cell *matCellDef="let log" style="max-width:300px; font-size:12px; color:#757575;"> 
            {{log.detail || '-'}} 
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="cols"></tr>
        <tr mat-row *matRowDef="let row; columns: cols;"></tr>
      </table>

      <div *ngIf="logs.length === 0" style="text-align:center; padding:48px; color:#757575;">
        <mat-icon style="font-size:64px; width:64px; height:64px;">search_off</mat-icon>
        <p style="margin-top:16px;">No se encontraron eventos</p>
      </div>

      <div style="margin-top:12px; font-size:12px; color:#757575; text-align:right;">
        Mostrando últimos 100 eventos
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
  `]
})
export class AdminAuditLogsComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/audit-logs`;
  cols = ['date', 'user', 'action', 'module', 'detail'];
  logs: AuditLog[] = [];

  filterForm = this.fb.group({
    module: [''],
    startDate: [''],
    endDate: ['']
  });

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.module) params.module = filters.module;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    this.http.get<AuditLog[]>(this.api, { params }).subscribe({
      next: (data) => {
        this.logs = data;
      },
      error: (err) => {
        console.error('Error cargando bitácora:', err);
        this.toastr.error('Error al cargar bitácora');
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.load();
  }

  getActionColor(action: string): string {
    if (action.includes('SUCCESS') || action.includes('CREATE')) return '#4caf50';
    if (action.includes('FAILED') || action.includes('DELETE')) return '#f44336';
    if (action.includes('UPDATE')) return '#ff9800';
    return '#757575';
  }
}
