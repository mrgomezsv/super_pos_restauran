import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { from, forkJoin } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ProductService } from '../../../core/services/product.service';
import { PurchaseOrder, PurchaseOrderItem, StatusHistory } from '../purchase-orders.component';

@Component({
  selector: 'app-receive-order-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule
  ],
  templateUrl: './receive-order-dialog.component.html',
  styleUrls: ['./receive-order-dialog.component.scss']
})
export class ReceiveOrderDialogComponent implements OnInit, OnDestroy {
  @Input() purchaseOrder: PurchaseOrder | null = null;
  @Output() close = new EventEmitter<boolean>();

  receiveForm!: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore,
    private authService: AuthService,
    private productService: ProductService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.purchaseOrder) {
      this.loadOrderData();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.receiveForm = this.fb.group({
      items: this.fb.array([])
    });
  }

  get itemsFormArray(): FormArray {
    return this.receiveForm.get('items') as FormArray;
  }

  private loadOrderData(): void {
    if (!this.purchaseOrder) return;

    const itemsArray = this.itemsFormArray;
    itemsArray.clear();

    this.purchaseOrder.items.forEach(item => {
      const itemGroup = this.fb.group({
        ingredientId: [{ value: item.ingredientId, disabled: true }],
        ingredientName: [{ value: item.ingredientName, disabled: true }],
        quantity: [{ value: item.quantity, disabled: true }],
        unitOfMeasure: [{ value: item.unitOfMeasure, disabled: true }],
        unitPrice: [{ value: this.formatCurrency(item.unitPrice), disabled: true }],
        total: [{ value: this.formatCurrency(item.total), disabled: true }],
        receivedQuantity: [item.receivedQuantity || 0, [Validators.required, Validators.min(0), Validators.max(item.quantity)]],
        // Guardar valores numéricos originales para cálculos
        _unitPrice: item.unitPrice,
        _total: item.total
      });
      
      // Actualizar el total cuando cambie la cantidad recibida
      itemGroup.get('receivedQuantity')?.valueChanges.subscribe(() => {
        const quantity = itemGroup.get('receivedQuantity')?.value || 0;
        const unitPrice = itemGroup.get('_unitPrice')?.value || 0;
        const total = quantity * unitPrice;
        itemGroup.patchValue({ total: this.formatCurrency(total) }, { emitEvent: false });
      });
      
      itemsArray.push(itemGroup);
    });
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '$0.00';
    }
    return '$' + value.toFixed(2);
  }

  onSave(): void {
    if (this.receiveForm.valid && this.purchaseOrder) {
      const formData = this.receiveForm.getRawValue();
      const items = formData.items.map((item: any, index: number) => ({
        ...this.purchaseOrder!.items[index],
        receivedQuantity: item.receivedQuantity || 0
      }));

      const currentUser = this.authService.getCurrentUser();
      const statusHistory = this.purchaseOrder.statusHistory || [];
      
      // Agregar nuevo estado al historial
      const newStatusEntry: StatusHistory = {
        status: 'received',
        changedAt: new Date(),
        changedBy: currentUser?.id || 'system',
        notes: 'Orden recibida'
      };

      const updatedHistory = [...statusHistory, newStatusEntry];

      const orderRef = doc(this.firestore, 'purchase-orders', this.purchaseOrder.id);
      
      // Primero actualizar la orden
      from(setDoc(orderRef, {
        status: 'received',
        items: items,
        statusHistory: updatedHistory.map(sh => ({
          status: sh.status,
          changedAt: sh.changedAt,
          changedBy: sh.changedBy,
          notes: sh.notes
        })),
        updatedAt: serverTimestamp()
      }, { merge: true }))
        .pipe(
          // Después de actualizar la orden, actualizar el inventario de cada ingrediente
          switchMap(() => {
            // Crear un array de observables para actualizar el stock de cada ingrediente
            const stockUpdates = items
              .filter((item: PurchaseOrderItem) => item.receivedQuantity && item.receivedQuantity > 0)
              .map((item: PurchaseOrderItem) => 
                this.productService.addIngredientStock(
                  item.ingredientId, 
                  item.receivedQuantity || 0
                ).pipe(
                  catchError((error) => {
                    console.error(`Error actualizando stock de ${item.ingredientName}:`, error);
                    // Continuar con los demás aunque uno falle
                    return of(null);
                  })
                )
              );
            
            // Si no hay items con cantidad recibida, retornar un observable vacío
            if (stockUpdates.length === 0) {
              return of([]);
            }
            
            // Ejecutar todas las actualizaciones en paralelo
            return forkJoin(stockUpdates);
          }),
          catchError((error) => {
            console.error('Error receiving order:', error);
            this.toastr.error('Error al recibir la orden');
            return of(null);
          })
        )
        .subscribe({
          next: (result) => {
            if (result !== null) {
              this.toastr.success('Orden recibida exitosamente. Inventario actualizado.');
              this.close.emit(true);
            }
          }
        });
    } else {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, completa todas las cantidades recibidas');
    }
  }

  onCancel(): void {
    this.close.emit(false);
  }

  private markFormGroupTouched(): void {
    this.itemsFormArray.controls.forEach(control => {
      control.get('receivedQuantity')?.markAsTouched();
    });
  }

  getTotalReceived(): number {
    const items = this.itemsFormArray.value;
    return items.reduce((sum: number, item: any) => {
      return sum + (item.receivedQuantity || 0) * (item._unitPrice || 0);
    }, 0);
  }
}

