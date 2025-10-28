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

interface JournalEntry {
  id: number;
  date: string;
  description: string;
  reference: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}

@Component({
  selector: 'app-diario',
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
  templateUrl: './diario.component.html',
  styleUrls: ['./diario.component.scss']
})
export class DiarioComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/accounting/journal`;
  
  displayedColumns = ['date', 'reference', 'description', 'accountCode', 'accountName', 'debit', 'credit', 'balance'];
  entries: JournalEntry[] = [];
  isLoading = false;
  filterForm: FormGroup;
  totalDebit = 0;
  totalCredit = 0;
  totalBalance = 0;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      accountCode: [''],
      description: ['']
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
    if (filters.description) params.description = filters.description;

    this.http.get<JournalEntry[]>(this.api, { params })
      .subscribe({
        next: (data) => {
          this.entries = data;
          this.calculateTotals();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error cargando diario contable:', err);
          this.toastr.error('Error al cargar el diario contable');
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
    this.toastr.info('Exportando diario contable a Excel...');
    // TODO: Implementar exportación
  }

  calculateTotals(): void {
    this.totalDebit = this.entries.reduce((sum, entry) => sum + entry.debit, 0);
    this.totalCredit = this.entries.reduce((sum, entry) => sum + entry.credit, 0);
    this.totalBalance = this.entries.reduce((sum, entry) => sum + entry.balance, 0);
  }
}

