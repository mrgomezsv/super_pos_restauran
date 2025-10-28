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
import { MatSelectModule } from '@angular/material/select';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface LedgerEntry {
  accountCode: string;
  accountName: string;
  debitBalance: number;
  creditBalance: number;
  netBalance: number;
  subAccounts: LedgerEntry[];
}

@Component({
  selector: 'app-mayor',
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
    MatSelectModule
  ],
  templateUrl: './mayor.component.html',
  styleUrls: ['./mayor.component.scss']
})
export class AccountingMayorComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/accounting/ledger`;
  
  displayedColumns = ['accountCode', 'accountName', 'debitBalance', 'creditBalance', 'netBalance'];
  entries: LedgerEntry[] = [];
  isLoading = false;
  filterForm: FormGroup;
  totalDebit = 0;
  totalCredit = 0;
  totalNet = 0;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      accountCode: ['']
    });
  }

  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.accountCode) params.accountCode = filters.accountCode;

    this.http.get<LedgerEntry[]>(this.api, { params })
      .subscribe({
        next: (data) => {
          this.entries = data;
          this.calculateTotals();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error cargando mayor contable:', err);
          this.toastr.error('Error al cargar el mayor contable');
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    this.loadEntries();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.loadEntries();
  }

  exportToExcel(): void {
    this.toastr.info('Exportando mayor contable a Excel...');
    // TODO: Implementar exportación
  }

  calculateTotals(): void {
    this.totalDebit = this.entries.reduce((sum, entry) => sum + entry.debitBalance, 0);
    this.totalCredit = this.entries.reduce((sum, entry) => sum + entry.creditBalance, 0);
    this.totalNet = this.entries.reduce((sum, entry) => sum + entry.netBalance, 0);
  }

  toggleAccount(entry: LedgerEntry): void {
    // Lógica para expandir/colapsar subcuentas
    // Por ahora solo visualización
  }
}

