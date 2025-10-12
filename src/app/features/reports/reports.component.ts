import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { ToastrService } from 'ngx-toastr';

import { SaleService } from '../../core/services/sale.service';
import { Sale, SaleSummary } from '../../core/models/sale.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit, OnDestroy {
  reportData: SaleSummary | null = null;
  sales: Sale[] = [];
  displayedColumns: string[] = ['invoiceNumber', 'customerName', 'total', 'paymentMethod', 'createdAt'];
  isLoading = false;
  filterForm: FormGroup;
  private destroy$ = new Subject<void>();
  
  // Dropdown states
  isPaymentMethodDropdownOpen = false;

  constructor(
    private saleService: SaleService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filterForm = this.fb.group({
      startDate: [''],
      endDate: [''],
      paymentMethod: ['']
    });
  }

  ngOnInit(): void {
    // Generar reporte por defecto (últimos 30 días)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    this.filterForm.patchValue({
      startDate: startDate,
      endDate: endDate
    });

    this.generateReport();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generateReport(): void {
    this.isLoading = true;
    const filters = this.filterForm.value;
    
    // Convertir fechas a formato ISO
    const startDate = filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : undefined;
    const endDate = filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : undefined;

    // Generar resumen
    this.saleService.getSalesSummary(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.reportData = summary;
        },
        error: (error) => {
          console.error('Error loading sales summary:', error);
          this.toastr.error('Error al cargar el resumen de ventas');
        }
      });

    // Generar lista de ventas
    this.saleService.getSales(startDate, endDate, undefined, filters.paymentMethod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sales) => {
          this.sales = sales;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading sales:', error);
          this.toastr.error('Error al cargar las ventas');
          this.isLoading = false;
        }
      });
  }

  getPaymentMethodClass(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'cash':
        return 'payment-cash';
      case 'card':
        return 'payment-card';
      case 'transfer':
        return 'payment-transfer';
      default:
        return '';
    }
  }

  getPaymentMethodLabel(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'cash':
        return 'Efectivo';
      case 'card':
        return 'Tarjeta';
      case 'transfer':
        return 'Transferencia';
      default:
        return paymentMethod;
    }
  }


  getStartDateDisplayValue(): string {
    const date = this.filterForm.get('startDate')?.value;
    if (!date) {
      return 'Seleccionar fecha inicio';
    }
    return new Date(date).toLocaleDateString('es-ES');
  }

  getEndDateDisplayValue(): string {
    const date = this.filterForm.get('endDate')?.value;
    if (!date) {
      return 'Seleccionar fecha fin';
    }
    return new Date(date).toLocaleDateString('es-ES');
  }

  // Payment method dropdown methods
  togglePaymentMethodDropdown(): void {
    this.isPaymentMethodDropdownOpen = !this.isPaymentMethodDropdownOpen;
  }

  selectPaymentMethod(value: string): void {
    this.filterForm.get('paymentMethod')?.setValue(value);
    this.isPaymentMethodDropdownOpen = false;
  }

  getPaymentMethodDisplayValue(): string {
    const method = this.filterForm.get('paymentMethod')?.value;
    if (!method) {
      return 'Todos los métodos';
    }
    return this.getPaymentMethodLabel(method);
  }

  // Cerrar dropdowns cuando se hace clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-field')) {
      this.isPaymentMethodDropdownOpen = false;
    }
  }
}