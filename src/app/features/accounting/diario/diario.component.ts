import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../../core/services/accounting.service';
import { JournalEntry, AccountingFilters } from '../../../core/models/accounting.models';

@Component({
  selector: 'app-accounting-diario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diario.component.html',
  styleUrls: ['./diario.component.scss']
})
export class AccountingDiarioComponent implements OnInit {
  journalEntries: JournalEntry[] = [];
  selectedEntry: JournalEntry | null = null;
  loading = false;
  
  filters: AccountingFilters = {};

  constructor(private accountingService: AccountingService) {}

  ngOnInit() {
    this.loadJournalEntries();
  }

  loadJournalEntries() {
    this.loading = true;
    this.accountingService.getJournalEntries(this.filters).subscribe({
      next: (entries) => {
        this.journalEntries = entries;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar pólizas:', error);
        this.loading = false;
      }
    });
  }

  clearFilters() {
    this.filters = {};
    this.loadJournalEntries();
  }

  viewEntryDetails(entry: JournalEntry) {
    this.selectedEntry = entry;
  }

  closeModal() {
    this.selectedEntry = null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-SV');
  }

  getSourceLabel(source: string): string {
    const labels: { [key: string]: string } = {
      'pos': 'POS',
      'purchase': 'Compras',
      'payment': 'Pagos',
      'adjustment': 'Ajustes'
    };
    return labels[source] || source;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'posted': 'Publicada',
      'draft': 'Borrador',
      'reversed': 'Revertida'
    };
    return labels[status] || status;
  }
}


