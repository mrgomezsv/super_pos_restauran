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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface VatSaleDocument {
  id: number;
  fiscalDocumentId: number;
  documentNumber: string;
  date: string;
  customerTaxId: string;
  customerName: string;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  documentType: string;
}

@Component({
  selector: 'app-accounting-vat-sales',
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
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './vat-sales.component.html',
  styleUrls: ['./vat-sales.component.scss']
})
export class AccountingVatSalesComponent implements OnInit {
  private readonly api = `${environment.apiUrl}/accounting/vat-sales`;
  
  displayedColumns = ['date', 'documentNumber', 'customerTaxId', 'customerName', 'taxableAmount', 'vatAmount', 'totalAmount'];
  documents: VatSaleDocument[] = [];
  isLoading = false;
  filterForm: FormGroup;
  totalTaxable = 0;
  totalVat = 0;
  totalAmount = 0;

  constructor(
    private http: HttpClient,
    private toastr: ToastrService,
    private fb: FormBuilder
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      customerName: [''],
      documentType: ['']
    });
  }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    let params: any = {};
    
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.customerName) params.customerName = filters.customerName;
    if (filters.documentType) params.documentType = filters.documentType;

    this.http.get<VatSaleDocument[]>(this.api, { params })
      .subscribe({
        next: (data) => {
          this.documents = data;
          this.calculateTotals();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error cargando libro de ventas:', err);
          this.toastr.error('Error al cargar el libro de ventas');
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    this.loadDocuments();
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.loadDocuments();
  }

  exportToExcel(): void {
    this.toastr.info('Exportando libro de ventas a Excel...');
    // TODO: Implementar exportación
  }

  calculateTotals(): void {
    this.totalTaxable = this.documents.reduce((sum, doc) => sum + doc.taxableAmount, 0);
    this.totalVat = this.documents.reduce((sum, doc) => sum + doc.vatAmount, 0);
    this.totalAmount = this.documents.reduce((sum, doc) => sum + doc.totalAmount, 0);
  }
}

