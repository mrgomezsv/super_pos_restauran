import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

import { SaleService } from '../../core/services/sale.service';
import { AuthService } from '../../core/services/auth.service';
import { SaleSummary } from '../../core/models/sale.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  template: `
    <div class="dashboard-container">
      <h1>Dashboard</h1>
      
      <div class="welcome-section">
        <h2>Bienvenido, {{ currentUser?.name }}</h2>
        <p>Resumen de ventas del día</p>
      </div>

      <div class="stats-grid" *ngIf="!isLoading; else loadingTemplate">
        <mat-card class="stat-card revenue-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">attach_money</mat-icon>
              <div class="stat-info">
                <h3>Ingresos Totales</h3>
                <p class="stat-value">${{ salesSummary?.totalSales | number:'1.2-2' }}</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card transactions-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">receipt</mat-icon>
              <div class="stat-info">
                <h3>Transacciones</h3>
                <p class="stat-value">{{ salesSummary?.totalTransactions }}</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card average-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">trending_up</mat-icon>
              <div class="stat-info">
                <h3>Ticket Promedio</h3>
                <p class="stat-value">${{ salesSummary?.averageTicket | number:'1.2-2' }}</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card payments-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">credit_card</mat-icon>
              <div class="stat-info">
                <h3>Métodos de Pago</h3>
                <div class="payment-methods">
                  <div class="payment-method">
                    <span>Efectivo:</span>
                    <span>${{ salesSummary?.salesByPaymentMethod.cash | number:'1.2-2' }}</span>
                  </div>
                  <div class="payment-method">
                    <span>Tarjeta:</span>
                    <span>${{ salesSummary?.salesByPaymentMethod.card | number:'1.2-2' }}</span>
                  </div>
                  <div class="payment-method">
                    <span>Transferencia:</span>
                    <span>${{ salesSummary?.salesByPaymentMethod.transfer | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card invoices-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">description</mat-icon>
              <div class="stat-info">
                <h3>Tipos de Factura</h3>
                <div class="invoice-types">
                  <div class="invoice-type">
                    <span>Consumidor Final:</span>
                    <span>${{ salesSummary?.salesByInvoiceType.consumidor_final | number:'1.2-2' }}</span>
                  </div>
                  <div class="invoice-type">
                    <span>Crédito Fiscal:</span>
                    <span>${{ salesSummary?.salesByInvoiceType.credito_fiscal | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card quick-actions-card">
          <mat-card-content>
            <div class="stat-content">
              <mat-icon class="stat-icon">flash_on</mat-icon>
              <div class="stat-info">
                <h3>Acciones Rápidas</h3>
                <div class="quick-actions">
                  <button mat-raised-button color="primary" routerLink="/pos">
                    <mat-icon>point_of_sale</mat-icon>
                    Nueva Venta
                  </button>
                  <button mat-raised-button color="accent" routerLink="/products">
                    <mat-icon>inventory</mat-icon>
                    Productos
                  </button>
                  <button mat-raised-button routerLink="/reports">
                    <mat-icon>assessment</mat-icon>
                    Reportes
                  </button>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <ng-template #loadingTemplate>
        <div class="loading-container">
          <mat-spinner diameter="50"></mat-spinner>
          <p>Cargando estadísticas...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 20px;
    }

    .welcome-section {
      margin-bottom: 32px;
    }

    .welcome-section h2 {
      color: #1976d2;
      margin-bottom: 8px;
    }

    .welcome-section p {
      color: #666;
      font-size: 16px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .stat-card {
      transition: transform 0.2s ease-in-out;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }

    .revenue-card .stat-icon {
      color: #4caf50;
    }

    .transactions-card .stat-icon {
      color: #2196f3;
    }

    .average-card .stat-icon {
      color: #ff9800;
    }

    .payments-card .stat-icon {
      color: #9c27b0;
    }

    .invoices-card .stat-icon {
      color: #f44336;
    }

    .quick-actions-card .stat-icon {
      color: #00bcd4;
    }

    .stat-info h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 18px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 600;
      color: #1976d2;
      margin: 0;
    }

    .payment-methods,
    .invoice-types {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .payment-method,
    .invoice-type {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .quick-actions button {
      justify-content: flex-start;
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
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .stat-content {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  salesSummary: SaleSummary | null = null;
  isLoading = false;
  currentUser = this.authService.getCurrentUser();

  constructor(
    private saleService: SaleService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadSalesSummary();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSalesSummary() {
    this.isLoading = true;
    
    // Obtener resumen de ventas del día actual
    const today = new Date().toISOString().split('T')[0];
    
    this.saleService.getSalesSummary({
      startDate: today,
      endDate: today
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        this.salesSummary = summary;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading sales summary:', error);
        this.isLoading = false;
        // En caso de error, mostrar datos por defecto
        this.salesSummary = {
          totalSales: 0,
          totalTransactions: 0,
          averageTicket: 0,
          salesByPaymentMethod: {
            cash: 0,
            card: 0,
            transfer: 0
          },
          salesByInvoiceType: {
            consumidor_final: 0,
            credito_fiscal: 0
          }
        };
      }
    });
  }
}
