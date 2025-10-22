import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface DailySales {
  date: string;
  salesCount: number;
  totalAmount: number;
}

interface UserSales {
  userId: number;
  salesCount: number;
  totalAmount: number;
}

interface SalesSummaryReport {
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  averageSaleAmount: number;
  dailySales: DailySales[];
  userSales: UserSales[];
}

interface InventoryProduct {
  id: number;
  name: string;
  code: string;
  stock: number;
  price: number;
  value: number;
  category: string;
}

interface InventoryStatusReport {
  totalProducts: number;
  totalValue: number;
  lowStockThreshold: number;
  lowStockProducts: InventoryProduct[];
  outOfStockProducts: InventoryProduct[];
  normalStockProducts: InventoryProduct[];
  lowStockCount: number;
  outOfStockCount: number;
  normalStockCount: number;
}

interface SalesMetrics {
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  salesCount: number;
  averageSaleAmount: number;
}

interface AccountingMetrics {
  totalDebits: number;
  totalCredits: number;
  journalEntriesCount: number;
  accountsWithActivity: number;
}

interface AccountTotal {
  accountCode: string;
  accountName: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

interface FinancialSummaryReport {
  periodStart: string;
  periodEnd: string;
  salesMetrics: SalesMetrics;
  accountingMetrics: AccountingMetrics;
  accountTotals: AccountTotal[];
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    MatDividerModule
  ],
  template: `
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon style="vertical-align:middle; margin-right:8px;">assessment</mat-icon>
        Reportes del Sistema
      </mat-card-title>
      <mat-card-subtitle>Análisis y estadísticas del negocio</mat-card-subtitle>
    </mat-card-header>

    <mat-card-content>
      <!-- Filtros Generales -->
      <form [formGroup]="filterForm" style="display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
        <mat-form-field appearance="outline" style="flex:0 0 150px;">
          <mat-label>Fecha Inicio</mat-label>
          <input matInput type="date" formControlName="startDate" />
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:0 0 150px;">
          <mat-label>Fecha Fin</mat-label>
          <input matInput type="date" formControlName="endDate" />
        </mat-form-field>

        <button mat-stroked-button color="primary" (click)="loadAllReports()" style="height:56px;">
          <mat-icon>refresh</mat-icon>
          Actualizar Reportes
        </button>
      </form>

      <!-- Tabs de Reportes -->
      <mat-tab-group>
        <!-- Reporte de Ventas -->
        <mat-tab label="Resumen de Ventas">
          <div style="padding:16px;">
            <div *ngIf="salesReport" style="margin-bottom:24px;">
              <h3>Resumen del Período</h3>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
                <div style="padding:16px; background:#e3f2fd; border-radius:8px;">
                  <div style="font-size:24px; font-weight:bold; color:#1976d2;">{{salesReport.totalSales}}</div>
                  <div style="font-size:14px; color:#666;">Total Ventas</div>
                </div>
                <div style="padding:16px; background:#e8f5e8; border-radius:8px;">
                  <div style="font-size:24px; font-weight:bold; color:#4caf50;">\${{salesReport.totalAmount | number:'1.2-2'}}</div>
                  <div style="font-size:14px; color:#666;">Monto Total</div>
                </div>
                <div style="padding:16px; background:#fff3e0; border-radius:8px;">
                  <div style="font-size:24px; font-weight:bold; color:#ff9800;">\${{salesReport.totalTax | number:'1.2-2'}}</div>
                  <div style="font-size:14px; color:#666;">Total IVA</div>
                </div>
                <div style="padding:16px; background:#fce4ec; border-radius:8px;">
                  <div style="font-size:24px; font-weight:bold; color:#e91e63;">\${{salesReport.totalDiscount | number:'1.2-2'}}</div>
                  <div style="font-size:14px; color:#666;">Total Descuentos</div>
                </div>
              </div>

              <!-- Ventas por Día -->
              <h4>Ventas por Día</h4>
              <table mat-table [dataSource]="salesReport.dailySales" style="width:100%; margin-bottom:24px;">
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef> Fecha </th>
                  <td mat-cell *matCellDef="let daily"> {{daily.date | date:'dd/MM/yyyy'}} </td>
                </ng-container>
                <ng-container matColumnDef="salesCount">
                  <th mat-header-cell *matHeaderCellDef> Ventas </th>
                  <td mat-cell *matCellDef="let daily"> {{daily.salesCount}} </td>
                </ng-container>
                <ng-container matColumnDef="totalAmount">
                  <th mat-header-cell *matHeaderCellDef> Monto </th>
                  <td mat-cell *matCellDef="let daily" style="text-align:right;">
                    \${{daily.totalAmount | number:'1.2-2'}}
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="dailyColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: dailyColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-tab>

        <!-- Reporte de Inventario -->
        <mat-tab label="Estado de Inventario">
          <div style="padding:16px;">
            <div *ngIf="inventoryReport" style="margin-bottom:24px;">
              <h3>Resumen de Inventario</h3>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
                <div style="padding:16px; background:#e3f2fd; border-radius:8px;">
                  <div style="font-size:24px; font-weight:bold; color:#1976d2;">{{inventoryReport.totalProducts}}</div>
                  <div style="font-size:14px; color:#666;">Total Productos</div>
                </div>
                <div style="padding:16px; background:#e8f5e8; border-radius:8px;">
                  <div style="font-size:24px; font-weight:bold; color:#4caf50;">\${{inventoryReport.totalValue | number:'1.2-2'}}</div>
                  <div style="font-size:14px; color:#666;">Valor Total</div>
                </div>
                <div style="padding:16px; background:#fff3e0; border-radius:8px;">
                  <div style="font-size:24px; font-weight:bold; color:#ff9800;">{{inventoryReport.lowStockCount}}</div>
                  <div style="font-size:14px; color:#666;">Stock Bajo</div>
                </div>
                <div style="padding:16px; background:#ffebee; border-radius:8px;">
                  <div style="font-size:24px; font-weight:bold; color:#f44336;">{{inventoryReport.outOfStockCount}}</div>
                  <div style="font-size:14px; color:#666;">Sin Stock</div>
                </div>
              </div>

              <!-- Productos con Stock Bajo -->
              <h4>Productos con Stock Bajo (≤ {{inventoryReport.lowStockThreshold}})</h4>
              <table mat-table [dataSource]="inventoryReport.lowStockProducts" style="width:100%; margin-bottom:24px;">
                <ng-container matColumnDef="code">
                  <th mat-header-cell *matHeaderCellDef> Código </th>
                  <td mat-cell *matCellDef="let product"> {{product.code}} </td>
                </ng-container>
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef> Producto </th>
                  <td mat-cell *matCellDef="let product"> {{product.name}} </td>
                </ng-container>
                <ng-container matColumnDef="stock">
                  <th mat-header-cell *matHeaderCellDef> Stock </th>
                  <td mat-cell *matCellDef="let product" style="text-align:right;">
                    <span [style.color]="product.stock === 0 ? 'red' : 'orange'">{{product.stock}}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="value">
                  <th mat-header-cell *matHeaderCellDef> Valor </th>
                  <td mat-cell *matCellDef="let product" style="text-align:right;">
                    \${{product.value | number:'1.2-2'}}
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="inventoryColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: inventoryColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-tab>

        <!-- Reporte Financiero -->
        <mat-tab label="Resumen Financiero">
          <div style="padding:16px;">
            <div *ngIf="financialReport" style="margin-bottom:24px;">
              <h3>Métricas Financieras</h3>
              
              <!-- Métricas de Ventas -->
              <h4>Métricas de Ventas</h4>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
                <div style="padding:16px; background:#e3f2fd; border-radius:8px;">
                  <div style="font-size:20px; font-weight:bold; color:#1976d2;">{{financialReport.salesMetrics.salesCount}}</div>
                  <div style="font-size:14px; color:#666;">Ventas</div>
                </div>
                <div style="padding:16px; background:#e8f5e8; border-radius:8px;">
                  <div style="font-size:20px; font-weight:bold; color:#4caf50;">\${{financialReport.salesMetrics.totalAmount | number:'1.2-2'}}</div>
                  <div style="font-size:14px; color:#666;">Monto Total</div>
                </div>
                <div style="padding:16px; background:#fff3e0; border-radius:8px;">
                  <div style="font-size:20px; font-weight:bold; color:#ff9800;">\${{financialReport.salesMetrics.averageSaleAmount | number:'1.2-2'}}</div>
                  <div style="font-size:14px; color:#666;">Promedio por Venta</div>
                </div>
              </div>

              <!-- Métricas Contables -->
              <h4>Métricas Contables</h4>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:24px;">
                <div style="padding:16px; background:#e3f2fd; border-radius:8px;">
                  <div style="font-size:20px; font-weight:bold; color:#1976d2;">{{financialReport.accountingMetrics.journalEntriesCount}}</div>
                  <div style="font-size:14px; color:#666;">Asientos Contables</div>
                </div>
                <div style="padding:16px; background:#e8f5e8; border-radius:8px;">
                  <div style="font-size:20px; font-weight:bold; color:#4caf50;">{{financialReport.accountingMetrics.accountsWithActivity}}</div>
                  <div style="font-size:14px; color:#666;">Cuentas Activas</div>
                </div>
                <div style="padding:16px; background:#fff3e0; border-radius:8px;">
                  <div style="font-size:20px; font-weight:bold; color:#ff9800;">\${{financialReport.accountingMetrics.totalDebits | number:'1.2-2'}}</div>
                  <div style="font-size:14px; color:#666;">Total Débitos</div>
                </div>
                <div style="padding:16px; background:#fce4ec; border-radius:8px;">
                  <div style="font-size:20px; font-weight:bold; color:#e91e63;">\${{financialReport.accountingMetrics.totalCredits | number:'1.2-2'}}</div>
                  <div style="font-size:14px; color:#666;">Total Créditos</div>
                </div>
              </div>

              <!-- Resumen por Cuenta -->
              <h4>Resumen por Cuenta</h4>
              <table mat-table [dataSource]="financialReport.accountTotals" style="width:100%;">
                <ng-container matColumnDef="accountCode">
                  <th mat-header-cell *matHeaderCellDef> Código </th>
                  <td mat-cell *matCellDef="let account"> {{account.accountCode}} </td>
                </ng-container>
                <ng-container matColumnDef="accountName">
                  <th mat-header-cell *matHeaderCellDef> Cuenta </th>
                  <td mat-cell *matCellDef="let account"> {{account.accountName}} </td>
                </ng-container>
                <ng-container matColumnDef="totalDebit">
                  <th mat-header-cell *matHeaderCellDef> Débito </th>
                  <td mat-cell *matCellDef="let account" style="text-align:right;">
                    \${{account.totalDebit | number:'1.2-2'}}
                  </td>
                </ng-container>
                <ng-container matColumnDef="totalCredit">
                  <th mat-header-cell *matHeaderCellDef> Crédito </th>
                  <td mat-cell *matCellDef="let account" style="text-align:right;">
                    \${{account.totalCredit | number:'1.2-2'}}
                  </td>
                </ng-container>
                <ng-container matColumnDef="balance">
                  <th mat-header-cell *matHeaderCellDef> Saldo </th>
                  <td mat-cell *matCellDef="let account" style="text-align:right;">
                    <span [style.color]="account.balance >= 0 ? 'green' : 'red'">
                      \${{account.balance | number:'1.2-2'}}
                    </span>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="accountColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: accountColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <div *ngIf="isLoading" style="text-align:center; padding:48px;">
        <mat-spinner diameter="40"></mat-spinner>
        <p style="margin-top:16px;">Generando reportes...</p>
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
    h3, h4 {
      margin: 16px 0 8px 0;
      font-weight: 500;
    }
    table {
      margin-bottom: 16px;
    }
  `]
})
export class ReportsComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/reports`;
  dailyColumns = ['date', 'salesCount', 'totalAmount'];
  inventoryColumns = ['code', 'name', 'stock', 'value'];
  accountColumns = ['accountCode', 'accountName', 'totalDebit', 'totalCredit', 'balance'];
  
  salesReport: SalesSummaryReport | null = null;
  inventoryReport: InventoryStatusReport | null = null;
  financialReport: FinancialSummaryReport | null = null;
  isLoading = false;
  filterForm: FormGroup;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadAllReports();
  }

  loadAllReports(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    // Cargar todos los reportes en paralelo
    Promise.all([
      this.http.get<SalesSummaryReport>(`${this.api}/sales-summary`, { params }).toPromise(),
      this.http.get<InventoryStatusReport>(`${this.api}/inventory-status`, { params }).toPromise(),
      this.http.get<FinancialSummaryReport>(`${this.api}/financial-summary`, { params }).toPromise()
    ]).then(([sales, inventory, financial]) => {
      this.salesReport = sales || null;
      this.inventoryReport = inventory || null;
      this.financialReport = financial || null;
      this.isLoading = false;
    }).catch((err) => {
      console.error('Error cargando reportes:', err);
      this.toastr.error('Error al cargar reportes');
      this.isLoading = false;
    });
  }
}