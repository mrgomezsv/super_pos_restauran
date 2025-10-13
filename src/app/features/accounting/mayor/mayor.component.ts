import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountingService } from '../../../core/services/accounting.service';
import { LedgerAccount } from '../../../core/models/accounting.models';

@Component({
  selector: 'app-accounting-mayor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <header class="page-header">
        <h1>Libro Mayor</h1>
        <p class="subtitle">Saldos acumulados por cuenta contable</p>
      </header>
      
      <div class="page-content">
        <!-- Resumen -->
        <div class="summary-section" *ngIf="ledgerData">
          <div class="summary-card">
            <h3>Total Débitos</h3>
            <p class="amount">${{ totalDebits | number:'1.2-2' }}</p>
          </div>
          <div class="summary-card">
            <h3>Total Créditos</h3>
            <p class="amount">${{ totalCredits | number:'1.2-2' }}</p>
          </div>
          <div class="summary-card" [class.balanced]="isBalanced">
            <h3>Estado</h3>
            <p>{{ isBalanced ? 'Balanceado ✓' : 'Desbalanceado ✗' }}</p>
          </div>
        </div>

        <!-- Tabla de saldos -->
        <div class="table-container" *ngIf="!loading">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre de Cuenta</th>
                <th>Tipo</th>
                <th>Naturaleza</th>
                <th>Total Débitos</th>
                <th>Total Créditos</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let item of ledgerItems" [class.has-movement]="hasMovement(item)">
                <td>{{ item.account.code }}</td>
                <td>{{ item.account.name }}</td>
                <td>
                  <span class="type-badge" [class]="'type-' + item.account.accountType">
                    {{ getTypeLabel(item.account.accountType) }}
                  </span>
                </td>
                <td>
                  <span class="nature-badge" [class]="'nature-' + item.account.nature">
                    {{ getNatureLabel(item.account.nature) }}
                  </span>
                </td>
                <td class="amount">{{ item.debit_total | number:'1.2-2' }}</td>
                <td class="amount">{{ item.credit_total | number:'1.2-2' }}</td>
                <td class="amount" [class.positive]="item.balance > 0" [class.negative]="item.balance < 0">
                  ${{ item.balance | number:'1.2-2' }}
                </td>
              </tr>
            </tbody>
          </table>
          
          <div *ngIf="ledgerItems.length === 0" class="empty-state">
            <p>No hay movimientos contables para mostrar</p>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="loading-state">
          <p>Cargando saldos contables...</p>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .summary-section {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .summary-card {
      flex: 1;
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
    
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    .ledger-table th,
    .ledger-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    .ledger-table th {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    .ledger-table td.amount {
      text-align: right;
      font-family: monospace;
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
    
    .nature-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .nature-deudora { background: #e3f2fd; color: #1976d2; }
    .nature-acreedora { background: #e8f5e8; color: #388e3c; }
    
    .positive {
      color: #388e3c;
    }
    
    .negative {
      color: #d32f2f;
    }
    
    .has-movement {
      background: #f8f9fa;
    }
    
    .empty-state,
    .loading-state {
      text-align: center;
      padding: 2rem;
      color: #666;
    }
  `]
})
export class AccountingMayorComponent implements OnInit {
  ledgerData: { [key: number]: LedgerAccount } | null = null;
  ledgerItems: LedgerAccount[] = [];
  loading = false;
  
  get totalDebits(): number {
    return this.ledgerItems.reduce((sum, item) => sum + item.debit_total, 0);
  }
  
  get totalCredits(): number {
    return this.ledgerItems.reduce((sum, item) => sum + item.credit_total, 0);
  }
  
  get isBalanced(): boolean {
    return Math.abs(this.totalDebits - this.totalCredits) < 0.01;
  }

  constructor(private accountingService: AccountingService) {}

  ngOnInit() {
    this.loadLedger();
  }

  loadLedger() {
    this.loading = true;
    this.accountingService.getLedger().subscribe({
      next: (data) => {
        this.ledgerData = data;
        this.ledgerItems = Object.values(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar libro mayor:', error);
        this.loading = false;
      }
    });
  }

  hasMovement(item: LedgerAccount): boolean {
    return item.debit_total > 0 || item.credit_total > 0;
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

  getNatureLabel(nature: string): string {
    const labels: { [key: string]: string } = {
      'deudora': 'Deudora',
      'acreedora': 'Acreedora'
    };
    return labels[nature] || nature;
  }
}


