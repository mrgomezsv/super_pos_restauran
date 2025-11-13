import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { PurchaseOrder, PurchaseOrderItem } from '../purchase-orders.component';

@Component({
    selector: 'app-purchase-order-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    templateUrl: './purchase-order-dialog.component.html',
    styleUrls: ['./purchase-order-dialog.component.scss']
})
export class PurchaseOrderDialogComponent implements OnInit, OnDestroy {
  @Input() purchaseOrder: PurchaseOrder | null = null;
  @Output() close = new EventEmitter<boolean>();

  purchaseOrderForm!: FormGroup;
  isEdit = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.isEdit = !!this.purchaseOrder;

    if (this.isEdit && this.purchaseOrder) {
      this.purchaseOrderForm.patchValue({
        ...this.purchaseOrder,
        date: this.purchaseOrder.date
      });
      
      // Cargar items
      const itemsArray = this.purchaseOrderForm.get('items') as FormArray;
      itemsArray.clear();
      this.purchaseOrder.items.forEach(item => {
        itemsArray.push(this.createItemFormGroup(item));
      });
    } else {
      // Nueva orden - agregar un item por defecto
      this.addItem();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.purchaseOrderForm = this.fb.group({
      orderNumber: ['', [Validators.required]],
      supplierId: [''],
      supplierName: [''],
      date: [new Date(), [Validators.required]],
      status: ['pending', [Validators.required]],
      items: this.fb.array([])
    });
  }

  get itemsFormArray(): FormArray {
    return this.purchaseOrderForm.get('items') as FormArray;
  }

  createItemFormGroup(item?: PurchaseOrderItem): FormGroup {
    return this.fb.group({
      ingredientId: [item?.ingredientId || '', [Validators.required]],
      ingredientName: [item?.ingredientName || '', [Validators.required]],
      quantity: [item?.quantity || 0, [Validators.required, Validators.min(0.01)]],
      unitOfMeasure: [item?.unitOfMeasure || '', [Validators.required]],
      unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
      total: [item?.total || 0]
    });
  }

  addItem(): void {
    const itemsArray = this.itemsFormArray;
    itemsArray.push(this.createItemFormGroup());
  }

  removeItem(index: number): void {
    const itemsArray = this.itemsFormArray;
    if (itemsArray.length > 1) {
      itemsArray.removeAt(index);
      this.calculateTotal();
    } else {
      this.toastr.warning('Debe tener al menos un item en la orden');
    }
  }

  calculateItemTotal(index: number): void {
    const item = this.itemsFormArray.at(index);
    const quantity = item.get('quantity')?.value || 0;
    const unitPrice = item.get('unitPrice')?.value || 0;
    const total = quantity * unitPrice;
    item.patchValue({ total }, { emitEvent: false });
    this.calculateTotal();
  }

  calculateTotal(): void {
    const items = this.itemsFormArray.value;
    const total = items.reduce((sum: number, item: PurchaseOrderItem) => {
      return sum + (item.total || 0);
    }, 0);
    // El total se puede mostrar en el template, no lo guardamos en el form
  }

  getTotal(): number {
    const items = this.itemsFormArray.value;
    return items.reduce((sum: number, item: PurchaseOrderItem) => {
      return sum + (item.total || 0);
    }, 0);
  }

  onSave(): void {
    if (this.purchaseOrderForm.valid) {
      const orderData = {
        ...this.purchaseOrderForm.value,
        total: this.getTotal(),
        items: this.itemsFormArray.value
      };

      // TODO: Implementar guardado en Firestore
      this.toastr.success('Orden de compra guardada exitosamente');
      this.close.emit(true);
    } else {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, completa todos los campos requeridos');
    }
  }

  onCancel(): void {
    this.close.emit(false);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.purchaseOrderForm.controls).forEach(key => {
      const control = this.purchaseOrderForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.purchaseOrderForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control?.hasError('min')) {
      return `El valor mínimo es ${control.errors?.['min'].min}`;
    }
    return '';
  }
}

