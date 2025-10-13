import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountingService } from '../../../core/services/accounting.service';
import { LedgerAccount } from '../../../core/models/accounting.models';

@Component({
  selector: 'app-accounting-mayor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mayor.component.html',
  styleUrls: ['./mayor.component.scss']
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


