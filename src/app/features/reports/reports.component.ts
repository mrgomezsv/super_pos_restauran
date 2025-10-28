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
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import * as XLSX from 'xlsx';

interface DailySales {
  date: string;
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
    MatSelectModule
  ],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
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
  Math = Math;

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

  applyFilters(): void {
    this.loadAllReports();
  }

  refreshReports(): void {
    this.loadAllReports();
  }

  exportReport(): void {
    // Exportar todos los reportes si existen
    if (this.salesReport && this.inventoryReport && this.financialReport) {
      try {
        const wb = XLSX.utils.book_new();
        
        // Ventas
        const salesData = this.salesReport.dailySales.map(s => ({
          'Fecha': s.date,
          'Cantidad Ventas': s.salesCount,
          'Monto Total': s.totalAmount
        }));
        const ws1 = XLSX.utils.json_to_sheet(salesData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Ventas');
        
        // Inventario
        const inventoryData = this.inventoryReport.lowStockProducts.map(p => ({
          'Código': p.code,
          'Producto': p.name,
          'Stock': p.stock,
          'Valor': p.value
        }));
        const ws2 = XLSX.utils.json_to_sheet(inventoryData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Inventario');
        
        // Financiero
        const accountsData = this.financialReport.accountTotals.map(a => ({
          'Código': a.accountCode,
          'Nombre': a.accountName,
          'Débito': a.totalDebit,
          'Crédito': a.totalCredit,
          'Saldo': a.balance
        }));
        const ws3 = XLSX.utils.json_to_sheet(accountsData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Financiero');
        
        // Exportar
        const fileName = `reporte_completo_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        this.toastr.success('Reporte completo exportado exitosamente');
      } catch (error) {
        console.error('Error exportando reporte completo:', error);
        this.toastr.error('Error al exportar el reporte completo');
      }
    } else {
      this.toastr.warning('No hay datos suficientes para exportar el reporte completo');
    }
  }

  exportSalesReport(): void {
    if (!this.salesReport) {
      this.toastr.warning('No hay datos de ventas para exportar');
      return;
    }

    try {
      const data = this.salesReport.dailySales.map(sale => ({
        'Fecha': sale.date,
        'Cantidad Ventas': sale.salesCount,
        'Monto Total': sale.totalAmount
      }));

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      
      // Agregar datos
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      
      // Agregar resumen en otra hoja
      const summary = [
        { 'Métrica': 'Total Ventas', 'Valor': this.salesReport.totalSales },
        { 'Métrica': 'Monto Total', 'Valor': this.salesReport.totalAmount },
        { 'Métrica': 'Ticket Promedio', 'Valor': this.salesReport.averageSaleAmount },
        { 'Métrica': 'Total Descuentos', 'Valor': this.salesReport.totalDiscount }
      ];
      const ws2 = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

      // Exportar
      const fileName = `reporte_ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      this.toastr.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error exportando reporte:', error);
      this.toastr.error('Error al exportar el reporte');
    }
  }

  exportInventoryReport(): void {
    if (!this.inventoryReport) {
      this.toastr.warning('No hay datos de inventario para exportar');
      return;
    }

    try {
      const data = [
        ...this.inventoryReport.lowStockProducts.map(p => ({
          'Código': p.code,
          'Producto': p.name,
          'Stock': p.stock,
          'Valor': p.value,
          'Estado': 'Stock Bajo'
        })),
        ...this.inventoryReport.outOfStockProducts.map(p => ({
          'Código': p.code,
          'Producto': p.name,
          'Stock': p.stock,
          'Valor': p.value,
          'Estado': 'Sin Stock'
        }))
      ];

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      
      // Agregar resumen
      const summary = [
        { 'Métrica': 'Total Productos', 'Valor': this.inventoryReport.totalProducts },
        { 'Métrica': 'Valor Total', 'Valor': this.inventoryReport.totalValue },
        { 'Métrica': 'Stock Bajo', 'Valor': this.inventoryReport.lowStockCount },
        { 'Métrica': 'Sin Stock', 'Valor': this.inventoryReport.outOfStockCount }
      ];
      const ws2 = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

      // Exportar
      const fileName = `reporte_inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      this.toastr.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error exportando reporte:', error);
      this.toastr.error('Error al exportar el reporte');
    }
  }

  exportFinancialReport(): void {
    if (!this.financialReport) {
      this.toastr.warning('No hay datos financieros para exportar');
      return;
    }

    try {
      const accountData = this.financialReport.accountTotals.map(account => ({
        'Código Cuenta': account.accountCode,
        'Nombre Cuenta': account.accountName,
        'Débito': account.totalDebit,
        'Crédito': account.totalCredit,
        'Saldo': account.balance
      }));

      // Crear workbook
      const ws = XLSX.utils.json_to_sheet(accountData);
      const wb = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(wb, ws, 'Cuentas');
      
      // Agregar resumen
      const summary = [
        { 'Métrica': 'Total Débitos', 'Valor': this.financialReport.accountingMetrics.totalDebits },
        { 'Métrica': 'Total Créditos', 'Valor': this.financialReport.accountingMetrics.totalCredits },
        { 'Métrica': 'Asientos Contables', 'Valor': this.financialReport.accountingMetrics.journalEntriesCount },
        { 'Métrica': 'Cuentas Activas', 'Valor': this.financialReport.accountingMetrics.accountsWithActivity }
      ];
      const ws2 = XLSX.utils.json_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

      // Exportar
      const fileName = `reporte_financiero_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      this.toastr.success('Reporte exportado exitosamente');
    } catch (error) {
      console.error('Error exportando reporte:', error);
      this.toastr.error('Error al exportar el reporte');
    }
  }

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
    return this.salesReport?.totalAmount ? this.salesReport.totalAmount * 0.3 : 0;
  }

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

  hasData(): boolean {
    return !!(this.salesReport || this.inventoryReport || this.financialReport);
  }
}
