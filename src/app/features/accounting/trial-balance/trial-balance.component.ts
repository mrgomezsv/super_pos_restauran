import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountingService } from '../../../core/services/accounting.service';
import { TrialBalance } from '../../../core/models/accounting.models';

@Component({
  selector: 'app-accounting-trial-balance',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Balance de Comprobación</h1>
        <p class="subtitle">Sumas y saldos por cuenta contable</p>
      </header>
      
      <div class="page-content">
        <!-- Resumen -->
        <div class="summary-section" *ngIf="trialBalance">
          <div class="summary-card">
            <h3>Total Débitos</h3>
            <p class="amount">${{ trialBalance.total_debits | number:'1.2-2' }}</p>
          </div>
          <div class="summary-card">
            <h3>Total Créditos</h3>
            <p class="amount">${{ trialBalance.total_credits | number:'1.2-2' }}</p>
          </div>
          <div class="summary-card" [class.balanced]="trialBalance.is_balanced">
            <h3>Estado</h3>
            <p>{{ trialBalance.is_balanced ? 'Balanceado ✓' : 'Desbalanceado ✗' }}</p>
          </div>
          <div class="summary-card" *ngIf="!trialBalance.is_balanced">
            <h3>Diferencia</h3>
            <p class="amount">{{ getDifference() | number:'1.2-2' }}</p>
          </div>
        </div>

        <!-- Tabla de balance -->
        <div class="table-container" *ngIf="!loading">
          <table class="trial-balance-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre de Cuenta</th>
                <th>Tipo</th>
                <th>Suma Débitos</th>
                <th>Suma Créditos</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of trialBalance?.accounts">
                <td>{{ item.account.code }}</td>
                <td>{{ item.account.name }}</td>
                <td>
                  <span class="type-badge" [class]="'type-' + item.account.accountType">
                    {{ getTypeLabel(item.account.accountType) }}
                  </span>
                </td>
                <td class="amount">{{ item.debit_total | number:'1.2-2' }}</td>
                <td class="amount">{{ item.credit_total | number:'1.2-2' }}</td>
                <td class="amount" [class.positive]="item.balance > 0" [class.negative]="item.balance < 0">
                  ${{ item.balance | number:'1.2-2' }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3"><strong>TOTALES</strong></td>
                <td class="amount"><strong>${{ trialBalance?.total_debits | number:'1.2-2' }}</strong></td>
                <td class="amount"><strong>${{ trialBalance?.total_credits | number:'1.2-2' }}</strong></td>
                <td class="amount">
                  <strong>${{ getTotalBalance() | number:'1.2-2' }}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
          
          <div *ngIf="trialBalance?.accounts.length === 0" class="empty-state">
            <p>No hay movimientos contables para mostrar</p>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-state">
          <p>Cargando balance de comprobación...</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .summary-section {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }
    
    .summary-card {
      flex: 1;
      min-width: 150px;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      text-align: center;
    }
    
    .summary-card h3 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: #666;
    }
    
    .summary-card p {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .summary-card.balanced {
      background: #e8f5e8;
      color: #388e3c;
    }
    
    .amount {
      font-family: monospace;
    }
    
    .table-container {
      overflow-x: auto;
    }
    
    .trial-balance-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    .trial-balance-table th,
    .trial-balance-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    .trial-balance-table th {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    .trial-balance-table td.amount {
      text-align: right;
      font-family: monospace;
    }
    
    .total-row {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    .total-row td {
      border-top: 2px solid #333;
    }
    
    .type-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .type-activo { background: #e3f2fd; color: #1976d2; }
    .type-pasivo { background: #f3e5f5; color: #7b1fa2; }
    .type-patrimonio { background: #e8f5e8; color: #388e3c; }
    .type-ingreso { background: #fff3e0; color: #f57c00; }
    .type-gasto { background: #ffebee; color: #d32f2f; }
    
    .positive {
      color: #388e3c;
    }
    
    .negative {
      color: #d32f2f;
    }
    
    .empty-state,
    .loading-state {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
  `]
})
export class AccountingTrialBalanceComponent implements OnInit {
  trialBalance: TrialBalance | null = null;
  loading = false;

  constructor(private accountingService: AccountingService) {}

  ngOnInit() {
    this.loadTrialBalance();
  }

  loadTrialBalance() {
    this.loading = true;
    this.accountingService.getTrialBalance().subscribe({
      next: (data) => {
        this.trialBalance = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar balance de comprobación:', error);
        this.loading = false;
      }
    });
  }

  getDifference(): number {
    if (!this.trialBalance) return 0;
    return this.trialBalance.total_debits - this.trialBalance.total_credits;
  }

  getTotalBalance(): number {
    if (!this.trialBalance) return 0;
    return this.trialBalance.accounts.reduce((sum, item) => sum + item.balance, 0);
  }

  getTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'activo': 'Activo',
      'pasivo': 'Pasivo',
      'patrimonio': 'Patrimonio',
      'ingreso': 'Ingreso',
      'gasto': 'Gasto'
    };
    return labels[type] || type;
  }
}


