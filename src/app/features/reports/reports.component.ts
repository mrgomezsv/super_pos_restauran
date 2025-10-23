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
import { MatSelectModule } from '@angular/material/select';
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
    MatDividerModule,
    MatSelectModule
  ],
  templateUrl: './reports.component.html',
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
  chartData: any = null;
  Math = Math;

  // Datos de ejemplo para las métricas
  previousPeriodData = {
    sales: 25000,
    transactions: 150,
    inventory: 50000,
    profit: 8000
  };

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      reportType: ['all']
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
      this.chartData = this.generateChartData();
      this.isLoading = false;
    }).catch((err) => {
      console.error('Error cargando reportes:', err);
      this.toastr.error('Error al cargar reportes');
      this.isLoading = false;
    });
  }

  applyFilters(): void {
    this.loadAllReports();
  }

  refreshReports(): void {
    this.loadAllReports();
  }

  exportReport(): void {
    this.toastr.info('Funcionalidad de exportación en desarrollo');
  }

  exportSalesReport(): void {
    this.toastr.info('Exportando reporte de ventas...');
  }

  exportInventoryReport(): void {
    this.toastr.info('Exportando reporte de inventario...');
  }

  exportFinancialReport(): void {
    this.toastr.info('Exportando reporte financiero...');
  }

  // Métricas principales
  getTotalSales(): number {
    return this.salesReport?.totalAmount || 0;
  }

  getTotalTransactions(): number {
    return this.salesReport?.totalSales || 0;
  }

  getInventoryValue(): number {
    return this.inventoryReport?.totalValue || 0;
  }

  getProfit(): number {
    return this.salesReport?.totalAmount ? this.salesReport.totalAmount * 0.3 : 0; // 30% de margen estimado
  }

  // Cambios porcentuales
  getSalesChange(): number {
    const current = this.getTotalSales();
    const previous = this.previousPeriodData.sales;
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  getTransactionsChange(): number {
    const current = this.getTotalTransactions();
    const previous = this.previousPeriodData.transactions;
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  getInventoryChange(): number {
    const current = this.getInventoryValue();
    const previous = this.previousPeriodData.inventory;
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  getProfitChange(): number {
    const current = this.getProfit();
    const previous = this.previousPeriodData.profit;
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  // Datos para gráficos
  getDailySalesData(): DailySales[] {
    return this.salesReport?.dailySales || [];
  }

  getPaymentMethodsData(): any[] {
    if (!this.salesReport) return [];
    
    const total = this.salesReport.totalAmount;
    return [
      { name: 'Efectivo', value: total * 0.6, color: '#4caf50', percentage: 60 },
      { name: 'Tarjeta', value: total * 0.3, color: '#2196f3', percentage: 30 },
      { name: 'Transferencia', value: total * 0.1, color: '#ff9800', percentage: 10 }
    ];
  }

  getBarHeight(amount: number): number {
    const maxAmount = Math.max(...this.getDailySalesData().map(d => d.totalAmount));
    return maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  }

  generateChartData(): any {
    return {
      dailySales: this.getDailySalesData(),
      paymentMethods: this.getPaymentMethodsData()
    };
  }

  hasData(): boolean {
    return !!(this.salesReport || this.inventoryReport || this.financialReport);
  }
}