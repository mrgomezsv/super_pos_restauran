import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountingService } from '../../../core/services/accounting.service';
import { TrialBalance } from '../../../core/models/accounting.models';

@Component({
  selector: 'app-accounting-trial-balance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trial-balance.component.html',
  styleUrls: ['./trial-balance.component.scss']
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


