import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface Supplier {
  id: number;
  name: string;
  taxId?: string;
}

interface Product {
  id: number;
  code: string;
  name: string;
  cost: number;
  taxRate: number;
}

interface PurchaseOrderItem {
  id?: number;
  product_id?: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_cost: number;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  received_quantity?: number;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes?: string;
  items: PurchaseOrderItem[];
}

@Component({
  selector: 'app-admin-purchase-orders',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatCardModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatTableModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatIconModule, MatChipsModule,
    MatTooltipModule, MatDialogModule
  ],
  templateUrl: './purchase-orders.component.html',
})
export class AdminPurchaseOrdersComponent implements OnInit {
  displayedColumns = ['po_number', 'supplier_name', 'order_date', 'status', 'total', 'actions'];
  purchaseOrders: PurchaseOrder[] = [];
  suppliers: Supplier[] = [];
  products: Product[] = [];
  loading = false;
  showForm = false;
  form: FormGroup;
  statusFilter = '';

  private readonly api = `${environment.apiUrl}/purchase-orders`;
  private readonly suppliersApi = `${environment.apiUrl}/suppliers`;
  private readonly productsApi = `${environment.apiUrl}/products`;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private http: HttpClient,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      supplier_id: ['', Validators.required],
      order_date: [new Date(), Validators.required],
      expected_delivery_date: [null],
      notes: [''],
      items: this.fb.array([], Validators.minLength(1))
    });
  }

  ngOnInit() {
    this.loadPurchaseOrders();
    this.loadSuppliers();
    this.loadProducts();
  }

  get itemsFormArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  loadPurchaseOrders() {
    this.loading = true;
    const params = this.statusFilter ? `?status=${this.statusFilter}` : '';
    this.http.get<PurchaseOrder[]>(`${this.api}${params}`).subscribe({
      next: (orders) => {
        this.purchaseOrders = orders;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando órdenes:', err);
        this.toastr.error(err.error?.detail || 'Error al cargar órdenes de compra');
        this.loading = false;
      }
    });
  }

  loadSuppliers() {
    this.http.get<Supplier[]>(this.suppliersApi).subscribe({
      next: (suppliers) => {
        this.suppliers = suppliers.filter(s => s['isActive'] !== false);
      },
      error: (err) => {
        console.error('Error cargando proveedores:', err);
      }
    });
  }

  loadProducts() {
    this.http.get<Product[]>(this.productsApi).subscribe({
      next: (products) => {
        this.products = products.filter(p => p['isActive'] !== false);
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (this.showForm) {
      this.addItem();
    } else {
      this.form.reset();
      this.itemsFormArray.clear();
    }
  }

  addItem() {
    const itemGroup = this.fb.group({
      product_id: [null],
      product_name: ['', Validators.required],
      product_sku: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_cost: [0, [Validators.required, Validators.min(0.01)]],
      tax_rate: [15.0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });

    // Actualizar cálculos cuando cambien los valores
    itemGroup.get('quantity')?.valueChanges.subscribe(() => this.calculateItemTotal(itemGroup));
    itemGroup.get('unit_cost')?.valueChanges.subscribe(() => this.calculateItemTotal(itemGroup));
    itemGroup.get('tax_rate')?.valueChanges.subscribe(() => this.calculateItemTotal(itemGroup));

    // Si selecciona un producto, autocompletar
    itemGroup.get('product_id')?.valueChanges.subscribe(productId => {
      const product = this.products.find(p => p.id === productId);
      if (product) {
        itemGroup.patchValue({
          product_name: product.name,
          product_sku: product.code,
          unit_cost: product.cost,
          tax_rate: product.taxRate || 15.0
        }, { emitEvent: false });
        this.calculateItemTotal(itemGroup);
      }
    });

    this.itemsFormArray.push(itemGroup);
  }

  removeItem(index: number) {
    this.itemsFormArray.removeAt(index);
  }

  calculateItemTotal(itemGroup: FormGroup) {
    const quantity = itemGroup.get('quantity')?.value || 0;
    const unitCost = itemGroup.get('unit_cost')?.value || 0;
    const taxRate = itemGroup.get('tax_rate')?.value || 0;
    const subtotal = quantity * unitCost;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Los valores calculados no se guardan en el formulario
    // pero se usan para mostrar en la tabla
    itemGroup['subtotal'] = subtotal;
    itemGroup['tax_amount'] = taxAmount;
    itemGroup['total'] = total;
  }

  getItemTotal(itemGroup: FormGroup): number {
    return itemGroup['total'] || 0;
  }

  getFormTotal(): number {
    return this.itemsFormArray.controls.reduce((sum, control) => {
      const itemGroup = control as FormGroup;
      return sum + (this.getItemTotal(itemGroup) || 0);
    }, 0);
  }

  create() {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      this.itemsFormArray.controls.forEach(control => {
        Object.keys(control['controls']).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      });
      this.toastr.warning('Por favor completa todos los campos requeridos');
      return;
    }

    if (this.itemsFormArray.length === 0) {
      this.toastr.warning('Debes agregar al menos un item a la orden');
      return;
    }

    if (!this.authService.hasCompany() && !this.authService.isSudo()) {
      this.toastr.error('Debes seleccionar una compañía para crear órdenes de compra');
      return;
    }

    this.loading = true;
    const formValue = {
      ...this.form.value,
      order_date: this.form.value.order_date?.toISOString() || new Date().toISOString(),
      expected_delivery_date: this.form.value.expected_delivery_date?.toISOString() || null,
      items: this.itemsFormArray.controls.map(control => {
        const item = control.value;
        return {
          product_id: item.product_id || null,
          product_name: item.product_name.trim(),
          product_sku: item.product_sku || null,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          tax_rate: item.tax_rate
        };
      })
    };

    this.http.post<PurchaseOrder>(this.api, formValue).subscribe({
      next: () => {
        this.toastr.success('Orden de compra creada exitosamente');
        this.toggleForm();
        this.loadPurchaseOrders();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error creando orden:', err);
        const errorMessage = err.error?.detail || err.error?.message || 'Error al crear orden de compra';
        this.toastr.error(errorMessage);
        this.loading = false;
      }
    });
  }

  updateStatus(order: PurchaseOrder, status: string) {
    const notes = prompt(`Notas para ${status === 'approved' ? 'aprobar' : 'cancelar'} la orden:`);
    if (notes === null) return;

    this.loading = true;
    this.http.put<PurchaseOrder>(`${this.api}/${order.id}/status`, { status, notes }).subscribe({
      next: () => {
        this.toastr.success(`Orden ${status === 'approved' ? 'aprobada' : 'cancelada'} exitosamente`);
        this.loadPurchaseOrders();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error actualizando estado:', err);
        this.toastr.error(err.error?.detail || 'Error al actualizar estado');
        this.loading = false;
      }
    });
  }

  deleteOrder(order: PurchaseOrder) {
    if (!confirm(`¿Estás seguro de eliminar la orden ${order.po_number}?`)) return;

    this.loading = true;
    this.http.delete(`${this.api}/${order.id}`).subscribe({
      next: () => {
        this.toastr.success('Orden eliminada exitosamente');
        this.loadPurchaseOrders();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error eliminando orden:', err);
        this.toastr.error(err.error?.detail || 'Error al eliminar orden');
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'warn';
      case 'approved': return 'primary';
      case 'received': return 'accent';
      case 'cancelled': return '';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'received': return 'Recibida';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }
}

