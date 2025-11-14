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
import { Firestore, collection, getDocs, doc, deleteDoc, setDoc, query, orderBy, serverTimestamp } from '@angular/fire/firestore';
import { from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { PurchaseOrderDialogComponent } from './purchase-order-dialog/purchase-order-dialog.component';
import { ReceiveOrderDialogComponent } from './receive-order-dialog/receive-order-dialog.component';
import { AuthService } from '../../core/services/auth.service';

export interface StatusHistory {
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  changedAt: Date;
  changedBy?: string;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId?: string;
  supplierName?: string;
  date: Date;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  total: number;
  items: PurchaseOrderItem[];
  statusHistory?: StatusHistory[];
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
  receivedQuantity?: number; // Cantidad recibida
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
        PurchaseOrderDialogComponent,
        ReceiveOrderDialogComponent
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
  statusDropdownOpenFor: string | null = null; // ID de la orden para la cual está abierto el dropdown

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore,
    private authService: AuthService
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
    this.removeScrollListener();
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
            const statusHistory = (data['statusHistory'] || []).map((sh: any) => ({
              status: sh.status,
              changedAt: sh.changedAt?.toDate() || new Date(sh.changedAt),
              changedBy: sh.changedBy,
              notes: sh.notes
            })) as StatusHistory[];
            
            return {
              id: docSnap.id,
              orderNumber: data['orderNumber'] || '',
              supplierId: data['supplierId'] || undefined,
              supplierName: data['supplierName'] || undefined,
              date: data['date']?.toDate() || new Date(),
              status: (data['status'] || 'pending') as 'pending' | 'approved' | 'received' | 'cancelled',
              total: data['total'] || 0,
              items: (data['items'] || []).map((item: any) => ({
                ...item,
                receivedQuantity: item.receivedQuantity || 0
              })) as PurchaseOrderItem[],
              statusHistory: statusHistory,
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
  isViewMode = false;
  private scrollYPosition = 0;

  openPurchaseOrderDialog(order?: PurchaseOrder, viewMode: boolean = false): void {
    // Guardar la posición actual del scroll
    this.scrollYPosition = window.scrollY;
    
    // Agregar clase al body para prevenir layout shift
    document.body.classList.add('modal-open');
    document.body.style.top = `-${this.scrollYPosition}px`;
    
    this.selectedPurchaseOrder = order || null;
    this.isViewMode = viewMode;
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
    this.isViewMode = false;
  }

  onPurchaseOrderDialogResult(result: boolean): void {
    this.closePurchaseOrderDialog();
    if (result) {
      this.loadPurchaseOrders();
    }
  }

  viewPurchaseOrder(order: PurchaseOrder): void {
    this.openPurchaseOrderDialog(order, true);
  }

  editPurchaseOrder(order: PurchaseOrder): void {
    this.openPurchaseOrderDialog(order, false);
  }

  printPurchaseOrder(order: PurchaseOrder): void {
    // Por el momento no hace nada
    this.toastr.info('Funcionalidad de impresión próximamente disponible');
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
        return 'Creada';
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
    } else if (status === 'creadted') {
      return 'Creadas';
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
    // Cerrar solo si el click no está dentro del contenedor del dropdown de estado
    if (!target.closest('.status-dropdown-container') && !target.closest('.custom-select-field')) {
      this.isStatusDropdownOpen = false;
      this.statusDropdownOpenFor = null;
      this.removeScrollListener();
    }
  }

  // Actualizar posición del dropdown cuando se hace scroll
  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.statusDropdownOpenFor) {
      this.updateDropdownPosition(this.statusDropdownOpenFor);
    }
  }

  // Actualizar posición del dropdown cuando se redimensiona la ventana
  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.statusDropdownOpenFor) {
      this.updateDropdownPosition(this.statusDropdownOpenFor);
    }
  }

  // Métodos para cambiar estado de una orden específica
  toggleOrderStatusDropdown(orderId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // Cerrar otros dropdowns abiertos
    if (this.statusDropdownOpenFor !== orderId) {
      this.statusDropdownOpenFor = orderId;
      // Usar setTimeout para asegurar que el DOM se actualice
      setTimeout(() => {
        this.updateDropdownPosition(orderId);
        // Agregar listener de scroll en el contenedor de la tabla si existe
        this.addScrollListener();
      }, 0);
    } else {
      this.statusDropdownOpenFor = null;
      this.removeScrollListener();
    }
  }

  private scrollListener?: () => void;
  private resizeListener?: () => void;

  private addScrollListener(): void {
    // Remover listener anterior si existe
    this.removeScrollListener();
    
    // Agregar listener al contenedor de la tabla
    const tableContainer = document.querySelector('.table-container');
    if (tableContainer) {
      this.scrollListener = () => {
        if (this.statusDropdownOpenFor) {
          this.updateDropdownPosition(this.statusDropdownOpenFor);
        }
      };
      tableContainer.addEventListener('scroll', this.scrollListener, { passive: true });
    }
  }

  private removeScrollListener(): void {
    if (this.scrollListener) {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', this.scrollListener);
      }
      this.scrollListener = undefined;
    }
  }

  private updateDropdownPosition(orderId: string): void {
    const container = document.querySelector(`[data-order-id="${orderId}"]`) as HTMLElement;
    const dropdown = container?.querySelector('.status-dropdown') as HTMLElement;
    
    if (container && dropdown) {
      const rect = container.getBoundingClientRect();
      const dropdownHeight = 300; // Altura máxima del dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
      
      dropdown.style.position = 'fixed';
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.minWidth = `${Math.max(180, rect.width)}px`;
      
      if (shouldOpenUp) {
        // Abrir hacia arriba
        dropdown.style.bottom = `${window.innerHeight - rect.top + 4}px`;
        dropdown.style.top = 'auto';
        dropdown.classList.add('open-up');
      } else {
        // Abrir hacia abajo
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.bottom = 'auto';
        dropdown.classList.remove('open-up');
      }
    }
  }

  isStatusDropdownOpenForOrder(orderId: string): boolean {
    return this.statusDropdownOpenFor === orderId;
  }

  getAvailableStatuses(order: PurchaseOrder): Array<{ value: string; label: string; disabled: boolean }> {
    // Normalizar el estado actual (pending y created son equivalentes)
    const currentStatus = order.status === 'pending' ? 'created' : order.status;
    const statusHistory = order.statusHistory || [];
    
    // Obtener todos los estados anteriores del historial (excluyendo el actual)
    const previousStatuses = statusHistory
      .map(sh => sh.status === 'pending' ? 'created' : sh.status)
      .filter(status => status !== currentStatus);
    
    // El estado anterior es el último en el historial que no sea el actual
    const previousStatus = previousStatuses.length > 0 ? previousStatuses[previousStatuses.length - 1] : null;
    
    const allStatuses = [
      { value: 'created', label: 'Creada' },
      { value: 'approved', label: 'Aprobada' },
      { value: 'received', label: 'Recibida' },
      { value: 'cancelled', label: 'Cancelada' }
    ];

    return allStatuses.map(status => {
      // Normalizar el valor del estado para comparación
      const normalizedStatusValue = status.value;
      const normalizedCurrentStatus = currentStatus;
      const normalizedPreviousStatus = previousStatus;
      
      return {
        ...status,
        disabled: normalizedStatusValue === normalizedCurrentStatus || 
                  (normalizedPreviousStatus !== null && normalizedStatusValue === normalizedPreviousStatus)
      };
    });
  }

  changeOrderStatus(order: PurchaseOrder, newStatus: string): void {
    const status = newStatus as 'pending' | 'approved' | 'received' | 'cancelled';
    if (status === order.status) {
      return;
    }

    // Si el nuevo estado es 'received', abrir modal de recepción
    if (status === 'received') {
      this.openReceiveOrderDialog(order);
      this.statusDropdownOpenFor = null;
      this.removeScrollListener();
      return;
    }

    // Para otros estados, cambiar directamente
    this.updateOrderStatus(order, status);
  }

  private updateOrderStatus(order: PurchaseOrder, newStatus: 'pending' | 'approved' | 'received' | 'cancelled'): void {
    const currentUser = this.authService.getCurrentUser();
    const statusHistory = order.statusHistory || [];
    
    // Agregar nuevo estado al historial
    const newStatusEntry: StatusHistory = {
      status: newStatus,
      changedAt: new Date(),
      changedBy: currentUser?.id || 'system',
      notes: `Cambio de estado de ${this.getStatusText(order.status)} a ${this.getStatusText(newStatus)}`
    };

    const updatedHistory = [...statusHistory, newStatusEntry];

    const orderRef = doc(this.firestore, 'purchase-orders', order.id);
    from(setDoc(orderRef, {
      status: newStatus,
      statusHistory: updatedHistory.map(sh => ({
        status: sh.status,
        changedAt: sh.changedAt,
        changedBy: sh.changedBy,
        notes: sh.notes
      })),
      updatedAt: serverTimestamp()
    }, { merge: true }))
      .pipe(
        catchError((error) => {
          console.error('Error updating order status:', error);
          this.toastr.error('Error al actualizar el estado de la orden');
          return of(null);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.toastr.success(`Estado cambiado a ${this.getStatusText(newStatus)}`);
          this.statusDropdownOpenFor = null;
          this.removeScrollListener();
          this.loadPurchaseOrders();
        }
      });
  }

  showReceiveOrderDialog = false;
  selectedOrderForReceive: PurchaseOrder | null = null;

  openReceiveOrderDialog(order: PurchaseOrder): void {
    this.selectedOrderForReceive = order;
    this.showReceiveOrderDialog = true;
  }

  closeReceiveOrderDialog(): void {
    this.showReceiveOrderDialog = false;
    this.selectedOrderForReceive = null;
  }

  onReceiveOrderComplete(result: boolean): void {
    this.closeReceiveOrderDialog();
    if (result) {
      this.loadPurchaseOrders();
    }
  }
}

