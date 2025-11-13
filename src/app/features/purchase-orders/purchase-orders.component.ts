import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, of } from 'rxjs';
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
import { Firestore, collection, getDocs, doc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
  allPurchaseOrders: PurchaseOrder[] = []; // Lista completa para filtrar
  displayedColumns: string[] = ['orderNumber', 'supplierName', 'date', 'status', 'total', 'actions'];
  isLoading = true;
  filtersForm: FormGroup;
  private destroy$ = new Subject<void>();
  
  // Dropdown states
  isStatusDropdownOpen = false;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadPurchaseOrders();
    
    // Búsqueda en tiempo real
    this.filtersForm.get('search')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
    
    // Filtro de estado en tiempo real
    this.filtersForm.get('status')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPurchaseOrders(): void {
    this.isLoading = true;
    const ordersRef = collection(this.firestore, 'purchase-orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    from(getDocs(q))
      .pipe(
        map((snapshot) => {
          return snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              orderNumber: data['orderNumber'] || '',
              supplierId: data['supplierId'] || undefined,
              supplierName: data['supplierName'] || undefined,
              date: data['date']?.toDate() || new Date(),
              status: (data['status'] || 'pending') as 'pending' | 'approved' | 'received' | 'cancelled',
              total: data['total'] || 0,
              items: (data['items'] || []) as PurchaseOrderItem[],
              createdAt: data['createdAt']?.toDate() || new Date(),
              updatedAt: data['updatedAt']?.toDate() || new Date()
            } as PurchaseOrder;
          });
        }),
        catchError((error) => {
          console.error('Error loading purchase orders:', error);
          this.toastr.error('Error al cargar las órdenes de compra');
          return of([]);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (orders) => {
          this.allPurchaseOrders = orders;
          this.applyFilters(); // Aplicar filtros después de cargar
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    const filters = this.filtersForm.value;
    
    // Aplicar filtros sobre la lista completa
    let filtered = [...this.allPurchaseOrders];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order => 
        order.orderNumber.toLowerCase().includes(searchLower) ||
        (order.supplierName && order.supplierName.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.status && filters.status !== '') {
      filtered = filtered.filter(order => order.status === filters.status);
    }
    
    this.purchaseOrders = filtered;
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.applyFilters(); // Aplicar filtros (que mostrará todos al estar vacío)
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
      const orderRef = doc(this.firestore, 'purchase-orders', order.id);
      from(deleteDoc(orderRef))
        .pipe(
          catchError((error) => {
            console.error('Error deleting purchase order:', error);
            this.toastr.error('Error al eliminar la orden de compra');
            return of(null);
          }),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: () => {
            this.toastr.success('Orden de compra eliminada exitosamente');
            this.loadPurchaseOrders();
          }
        });
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

