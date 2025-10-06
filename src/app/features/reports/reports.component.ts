import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';

import { SaleService } from '../../core/services/sale.service';
import { Sale, SaleSummary } from '../../core/models/sale.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  template: `
    <div class="reports-container">
      <h1>Reportes de Ventas</h1>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            <mat-form-field appearance="outline">
              <mat-label>Fecha Inicio</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="startDate">
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fecha Fin</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="endDate">
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>

            <button mat-raised-button color="primary" (click)="generateReport()">
              <mat-icon>assessment</mat-icon>
              Generar Reporte
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Report Content -->
      <mat-card class="report-card" *ngIf="reportData">
        <mat-tab-group>
          <!-- Summary Tab -->
          <mat-tab label="Resumen">
            <div class="summary-content">
              <div class="summary-grid">
                <div class="summary-item">
                  <mat-icon class="summary-icon">attach_money</mat-icon>
                  <div class="summary-info">
                    <h3>Total de Ventas</h3>
                    <p>${{ reportData.totalSales | number:'1.2-2' }}</p>
                  </div>
                </div>

                <div class="summary-item">
                  <mat-icon class="summary-icon">receipt</mat-icon>
                  <div class="summary-info">
                    <h3>Total de Transacciones</h3>
                    <p>{{ reportData.totalTransactions }}</p>
                  </div>
                </div>

                <div class="summary-item">
                  <mat-icon class="summary-icon">trending_up</mat-icon>
                  <div class="summary-info">
                    <h3>Ticket Promedio</h3>
                    <p>${{ reportData.averageTicket | number:'1.2-2' }}</p>
                  </div>
                </div>

                <div class="summary-item">
                  <mat-icon class="summary-icon">credit_card</mat-icon>
                  <div class="summary-info">
                    <h3>Ventas por Efectivo</h3>
                    <p>${{ reportData.salesByPaymentMethod.cash | number:'1.2-2' }}</p>
                  </div>
                </div>

                <div class="summary-item">
                  <mat-icon class="summary-icon">payment</mat-icon>
                  <div class="summary-info">
                    <h3>Ventas por Tarjeta</h3>
                    <p>${{ reportData.salesByPaymentMethod.card | number:'1.2-2' }}</p>
                  </div>
                </div>

                <div class="summary-item">
                  <mat-icon class="summary-icon">account_balance</mat-icon>
                  <div class="summary-info">
                    <h3>Ventas por Transferencia</h3>
                    <p>${{ reportData.salesByPaymentMethod.transfer | number:'1.2-2' }}</p>
                  </div>
                </div>
              </div>
            </div>
          </mat-tab>

          <!-- Sales List Tab -->
          <mat-tab label="Lista de Ventas">
            <div class="sales-list-content">
              <table mat-table [dataSource]="sales" class="sales-table">
                <!-- Invoice Number Column -->
                <ng-container matColumnDef="invoiceNumber">
                  <th mat-header-cell *matHeaderCellDef> N° Factura </th>
                  <td mat-cell *matCellDef="let sale"> {{ sale.invoiceNumber }} </td>
                </ng-container>

                <!-- Customer Column -->
                <ng-container matColumnDef="customer">
                  <th mat-header-cell *matHeaderCellDef> Cliente </th>
                  <td mat-cell *matCellDef="let sale"> 
                    {{ sale.customerName || 'Consumidor Final' }}
                  </td>
                </ng-container>

                <!-- Invoice Type Column -->
                <ng-container matColumnDef="invoiceType">
                  <th mat-header-cell *matHeaderCellDef> Tipo </th>
                  <td mat-cell *matCellDef="let sale"> 
                    {{ sale.invoiceType === 'consumidor_final' ? 'Consumidor Final' : 'Crédito Fiscal' }}
                  </td>
                </ng-container>

                <!-- Total Column -->
                <ng-container matColumnDef="total">
                  <th mat-header-cell *matHeaderCellDef> Total </th>
                  <td mat-cell *matCellDef="let sale"> 
                    ${{ sale.total | number:'1.2-2' }}
                  </td>
                </ng-container>

                <!-- Payment Method Column -->
                <ng-container matColumnDef="paymentMethod">
                  <th mat-header-cell *matHeaderCellDef> Pago </th>
                  <td mat-cell *matCellDef="let sale"> 
                    {{ getPaymentMethodLabel(sale.paymentMethod) }}
                  </td>
                </ng-container>

                <!-- Cashier Column -->
                <ng-container matColumnDef="cashier">
                  <th mat-header-cell *matHeaderCellDef> Cajero </th>
                  <td mat-cell *matCellDef="let sale"> {{ sale.cashierName }} </td>
                </ng-container>

                <!-- Date Column -->
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef> Fecha </th>
                  <td mat-cell *matCellDef="let sale"> 
                    {{ sale.createdAt | date:'short' }}
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>

              <div class="no-data" *ngIf="sales.length === 0">
                <mat-icon>receipt_long</mat-icon>
                <p>No hay ventas para el período seleccionado</p>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>

      <!-- Loading -->
      <div class="loading-container" *ngIf="isLoading">
        <mat-spinner diameter="50"></mat-spinner>
        <p>Generando reporte...</p>
      </div>
    </div>
  `,
  styles: [`
    .reports-container {
      padding: 20px;
    }

    .reports-container h1 {
      margin-bottom: 24px;
      color: #1976d2;
    }

    .filters-card,
    .report-card {
      margin-bottom: 20px;
    }

    .filters-form {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filters-form mat-form-field {
      min-width: 200px;
    }

    .summary-content {
      padding: 20px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #fafafa;
    }

    .summary-icon {
      font-size: 32px;
      color: #1976d2;
    }

    .summary-info h3 {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    .summary-info p {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #1976d2;
    }

    .sales-list-content {
      padding: 20px;
    }

    .sales-table {
      width: 100%;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .no-data mat-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #666;
    }

    .loading-container p {
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .filters-form {
        flex-direction: column;
        align-items: stretch;
      }

      .filters-form mat-form-field {
        min-width: auto;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .summary-item {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class ReportsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  filterForm: FormGroup;
  reportData: SaleSummary | null = null;
  sales: Sale[] = [];
  displayedColumns: string[] = ['invoiceNumber', 'customer', 'invoiceType', 'total', 'paymentMethod', 'cashier', 'createdAt'];
  isLoading = false;

  constructor(
    private saleService: SaleService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [new Date()],
      endDate: [new Date()]
    });
  }

  ngOnInit() {
    // Generar reporte del día actual por defecto
    this.generateReport();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generateReport() {
    if (this.filterForm.valid) {
      this.isLoading = true;
      const { startDate, endDate } = this.filterForm.value;

      // Obtener resumen
      this.saleService.getSalesSummary({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (summary) => {
          this.reportData = summary;
          this.loadSales();
        },
        error: (error) => {
          console.error('Error loading summary:', error);
          this.isLoading = false;
        }
      });
    }
  }

  private loadSales() {
    const { startDate, endDate } = this.filterForm.value;

    this.saleService.getSales({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (sales) => {
        this.sales = sales;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sales:', error);
        this.isLoading = false;
      }
    });
  }

  getPaymentMethodLabel(method: string): string {
    const labels: { [key: string]: string } = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia'
    };
    return labels[method] || method;
  }
}
