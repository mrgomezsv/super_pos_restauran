import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { PurchaseOrderDialogComponent } from './purchase-order-dialog/purchase-order-dialog.component';

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId?: string;
  supplierName?: string;
  date: Date;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  total: number;
  items: PurchaseOrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  total: number;
}

@Component({
    selector: 'app-purchase-orders',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatTableModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatDialogModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
        PurchaseOrderDialogComponent
    ],
    templateUrl: './purchase-orders.component.html',
    styleUrls: ['./purchase-orders.component.scss']
})
export class PurchaseOrdersComponent implements OnInit, OnDestroy {
  purchaseOrders: PurchaseOrder[] = [];
  displayedColumns: string[] = ['orderNumber', 'supplierName', 'date', 'status', 'total', 'actions'];
  isLoading = true;
  filtersForm: FormGroup;
  private destroy$ = new Subject<void>();
  
  // Dropdown states
  isStatusDropdownOpen = false;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadPurchaseOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPurchaseOrders(): void {
    this.isLoading = true;
    // TODO: Implementar carga desde Firestore
    // Por ahora, datos de ejemplo
    setTimeout(() => {
      this.purchaseOrders = [];
      this.isLoading = false;
    }, 500);
  }

  applyFilters(): void {
    const filters = this.filtersForm.value;
    this.isLoading = true;

    // TODO: Implementar filtrado
    setTimeout(() => {
      this.isLoading = false;
    }, 300);
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadPurchaseOrders();
  }

  showPurchaseOrderDialog = false;
  selectedPurchaseOrder: PurchaseOrder | null = null;
  private scrollYPosition = 0;

  openPurchaseOrderDialog(order?: PurchaseOrder): void {
    // Guardar la posición actual del scroll
    this.scrollYPosition = window.scrollY;
    
    // Agregar clase al body para prevenir layout shift
    document.body.classList.add('modal-open');
    document.body.style.top = `-${this.scrollYPosition}px`;
    
    this.selectedPurchaseOrder = order || null;
    this.showPurchaseOrderDialog = true;
  }

  closePurchaseOrderDialog(): void {
    // Remover clase del body al cerrar el modal
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    
    // Restaurar la posición del scroll
    window.scrollTo(0, this.scrollYPosition);
    
    this.showPurchaseOrderDialog = false;
    this.selectedPurchaseOrder = null;
  }

  onPurchaseOrderDialogResult(result: boolean): void {
    this.closePurchaseOrderDialog();
    if (result) {
      this.loadPurchaseOrders();
    }
  }

  editPurchaseOrder(order: PurchaseOrder): void {
    this.openPurchaseOrderDialog(order);
  }

  deletePurchaseOrder(order: PurchaseOrder): void {
    if (confirm(`¿Está seguro de eliminar la orden de compra "${order.orderNumber}"?`)) {
      // TODO: Implementar eliminación en Firestore
      this.toastr.success('Orden de compra eliminada exitosamente');
      this.loadPurchaseOrders();
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warn';
      case 'approved':
        return 'primary';
      case 'received':
        return 'accent';
      case 'cancelled':
        return '';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'received':
        return 'Recibida';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  }

  // Dropdown methods for Status
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  selectStatus(value: string): void {
    this.filtersForm.get('status')?.setValue(value);
    this.applyFilters();
    this.isStatusDropdownOpen = false;
  }

  getStatusDisplayValue(): string {
    const status = this.filtersForm.get('status')?.value;
    if (status === '') {
      return 'Todos los estados';
    } else if (status === 'pending') {
      return 'Pendientes';
    } else if (status === 'approved') {
      return 'Aprobadas';
    } else if (status === 'received') {
      return 'Recibidas';
    } else if (status === 'cancelled') {
      return 'Canceladas';
    }
    return 'Todos los estados';
  }

  // Cerrar dropdowns cuando se hace clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-field')) {
      this.isStatusDropdownOpen = false;
    }
  }
}

