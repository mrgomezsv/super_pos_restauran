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
import { from } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
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
    private authService: AuthService
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
        unitPrice: [{ value: item.unitPrice, disabled: true }],
        total: [{ value: item.total, disabled: true }],
        receivedQuantity: [item.receivedQuantity || 0, [Validators.required, Validators.min(0), Validators.max(item.quantity)]]
      });
      itemsArray.push(itemGroup);
    });
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
          catchError((error) => {
            console.error('Error receiving order:', error);
            this.toastr.error('Error al recibir la orden');
            return of(null);
          })
        )
        .subscribe({
          next: () => {
            this.toastr.success('Orden recibida exitosamente');
            this.close.emit(true);
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
      return sum + (item.receivedQuantity || 0) * (item.unitPrice || 0);
    }, 0);
  }
}

