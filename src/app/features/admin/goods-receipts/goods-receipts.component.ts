import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
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
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_name?: string;
  status: string;
  items: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: number;
  product_id?: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_cost: number;
  received_quantity: number;
  tax_rate: number;
}

interface GoodsReceiptItem {
  purchase_order_item_id: number;
  product_id?: number;
  quantity: number;
  unit_cost: number;
}

interface GoodsReceipt {
  id: number;
  receipt_number: string;
  purchase_order_id: number;
  purchase_order_number?: string;
  receipt_date: string;
  supplier_name?: string;
  total: number;
  is_accounted: boolean;
  items: any[];
}

@Component({
  selector: 'app-admin-goods-receipts',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatTableModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatIconModule, MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './goods-receipts.component.html',
})
export class AdminGoodsReceiptsComponent implements OnInit {
  displayedColumns = ['receipt_number', 'purchase_order_number', 'supplier_name', 'receipt_date', 'total', 'is_accounted'];
  goodsReceipts: GoodsReceipt[] = [];
  purchaseOrders: PurchaseOrder[] = [];
  selectedPO: PurchaseOrder | null = null;
  loading = false;
  showForm = false;
  form: FormGroup;

  private readonly api = `${environment.apiUrl}/goods-receipts`;
  private readonly purchaseOrdersApi = `${environment.apiUrl}/purchase-orders`;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.form = this.fb.group({
      purchase_order_id: ['', Validators.required],
      receipt_date: [new Date(), Validators.required],
      notes: [''],
      items: this.fb.array([], Validators.minLength(1))
    });
  }

  ngOnInit() {
    this.loadGoodsReceipts();
    this.loadPurchaseOrders();
  }

  get itemsFormArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  loadGoodsReceipts() {
    this.loading = true;
    this.http.get<GoodsReceipt[]>(this.api).subscribe({
      next: (receipts) => {
        this.goodsReceipts = receipts;
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error cargando recepciones:', err);
        this.toastr.error(err.error?.detail || 'Error al cargar recepciones');
        this.loading = false;
      }
    });
  }

  loadPurchaseOrders() {
    // Cargar solo órdenes aprobadas o parcialmente recibidas
    this.http.get<PurchaseOrder[]>(`${this.purchaseOrdersApi}?status=approved`).subscribe({
      next: (orders) => {
        this.purchaseOrders = orders;
      },
      error: (err) => {
        console.error('Error cargando órdenes:', err);
      }
    });
  }

  toggleForm() {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.form.reset();
      this.itemsFormArray.clear();
      this.selectedPO = null;
    }
  }

  onPurchaseOrderSelect() {
    const poId = this.form.get('purchase_order_id')?.value;
    if (!poId) {
      this.selectedPO = null;
      this.itemsFormArray.clear();
      return;
    }

    this.selectedPO = this.purchaseOrders.find(po => po.id === poId) || null;
    if (this.selectedPO) {
      this.populateItemsFromPO();
    }
  }

  populateItemsFromPO() {
    if (!this.selectedPO) return;

    this.itemsFormArray.clear();
    
    this.selectedPO.items.forEach(poItem => {
      const remainingQty = poItem.quantity - poItem.received_quantity;
      
      // Solo agregar items con cantidad pendiente
      if (remainingQty > 0) {
        const itemGroup = this.fb.group({
          purchase_order_item_id: [poItem.id, Validators.required],
          product_id: [poItem.product_id || null],
          quantity: [
            remainingQty,
            [Validators.required, Validators.min(1), Validators.max(remainingQty)]
          ],
          unit_cost: [poItem.unit_cost, [Validators.required, Validators.min(0.01)]]
        });

        // Actualizar cantidad máxima cuando cambie
        itemGroup.get('quantity')?.setValidators([
          Validators.required,
          Validators.min(1),
          Validators.max(remainingQty)
        ]);

        this.itemsFormArray.push(itemGroup);
      }
    });
  }

  getItemInfo(itemGroup: FormGroup): PurchaseOrderItem | undefined {
    const poItemId = itemGroup.get('purchase_order_item_id')?.value;
    return this.selectedPO?.items.find(item => item.id === poItemId);
  }

  // Métodos helper para usar en templates (aceptan AbstractControl)
  getItemInfoFromControl(control: any): PurchaseOrderItem | undefined {
    const itemGroup = control as FormGroup;
    return this.getItemInfo(itemGroup);
  }

  getItemTotal(itemGroup: FormGroup): number {
    const quantity = itemGroup.get('quantity')?.value || 0;
    const unitCost = itemGroup.get('unit_cost')?.value || 0;
    const poItem = this.getItemInfo(itemGroup);
    if (!poItem) return 0;
    
    const subtotal = quantity * unitCost;
    const taxAmount = subtotal * (poItem.tax_rate / 100);
    return subtotal + taxAmount;
  }

  // Método helper para usar en templates (acepta AbstractControl)
  getItemTotalFromControl(control: any): number {
    const itemGroup = control as FormGroup;
    return this.getItemTotal(itemGroup);
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
        const itemControl = control as FormGroup;
        Object.keys(itemControl.controls).forEach(key => {
          itemControl.get(key)?.markAsTouched();
        });
      });
      this.toastr.warning('Por favor completa todos los campos requeridos');
      return;
    }

    if (this.itemsFormArray.length === 0) {
      this.toastr.warning('Debes agregar al menos un item a recibir');
      return;
    }

    if (!this.authService.hasCompany() && !this.authService.isSudo()) {
      this.toastr.error('Debes seleccionar una compañía para recibir mercancía');
      return;
    }

    this.loading = true;
    const formValue = {
      ...this.form.value,
      receipt_date: this.form.value.receipt_date?.toISOString() || new Date().toISOString(),
      items: this.itemsFormArray.controls.map(control => {
        const item = control.value;
        return {
          purchase_order_item_id: item.purchase_order_item_id,
          product_id: item.product_id || null, // Null si es producto nuevo
          quantity: item.quantity,
          unit_cost: item.unit_cost
        };
      })
    };

    this.http.post<GoodsReceipt>(this.api, formValue).subscribe({
      next: (receipt) => {
        this.toastr.success(`Recepción ${receipt.receipt_number} creada exitosamente. ${receipt.is_accounted ? 'Compra contabilizada automáticamente.' : ''}`);
        this.toggleForm();
        this.loadGoodsReceipts();
        this.loadPurchaseOrders(); // Recargar para actualizar cantidades recibidas
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error creando recepción:', err);
        const errorMessage = err.error?.detail || err.error?.message || 'Error al recibir mercancía';
        this.toastr.error(errorMessage);
        this.loading = false;
      }
    });
  }
}

