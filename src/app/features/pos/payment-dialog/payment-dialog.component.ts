import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { Subject } from 'rxjs';
import { CartItem } from '../../../core/models/sale.model';

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule
  ],
  templateUrl: './payment-dialog.component.html',
  styleUrls: ['./payment-dialog.component.scss']
})
export class PaymentDialogComponent implements OnInit, OnDestroy {
  @Input() total: number = 0;
  @Input() items: CartItem[] = [];
  @Output() close = new EventEmitter<any>();

  paymentForm!: FormGroup;
  change = 0;
  cartTotals: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {
    this.cartTotals = { subtotal: 0, taxAmount: 0, total: 0 };
  }

  ngOnInit(): void {
    this.cartTotals = this.calculateTotalsFromItems(this.items);
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.paymentForm = this.fb.group({
      customerName: [''],
      customerDocument: [''],
      customerEmail: ['', [Validators.email]],
      invoiceType: ['consumidor_final', Validators.required],
      paymentMethod: ['cash', Validators.required],
      paymentAmount: [this.cartTotals.total, [Validators.required, Validators.min(0.01)]]
    });

    // Observar cambios en el método de pago
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(() => {
      this.onPaymentMethodChange();
    });

    // Observar cambios en el monto
    this.paymentForm.get('paymentAmount')?.valueChanges.subscribe(() => {
      this.calculateChange();
    });

    this.calculateChange();
  }

  onPaymentMethodChange(): void {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    
    if (paymentMethod === 'cash') {
      this.paymentForm.patchValue({ paymentAmount: this.cartTotals.total });
    } else {
      // Para tarjeta y transferencia, el monto es exacto
      this.paymentForm.patchValue({ paymentAmount: this.cartTotals.total });
    }
    this.calculateChange();
  }

  calculateChange(): void {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    const paymentAmount = this.paymentForm.get('paymentAmount')?.value || 0;

    if (paymentMethod === 'cash') {
      this.change = paymentAmount - this.cartTotals.total;
    } else {
      // Para tarjeta y transferencia no hay cambio
      this.change = 0;
    }
  }

  canConfirm(): boolean {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    const paymentAmount = this.paymentForm.get('paymentAmount')?.value || 0;

    if (paymentMethod === 'cash') {
      return paymentAmount >= this.cartTotals.total && paymentAmount > 0;
    }
    // Para tarjeta y transferencia, debe ser el monto exacto
    return Math.abs(paymentAmount - this.cartTotals.total) < 0.01 && paymentAmount > 0;
  }

  setExactAmount(): void {
    this.paymentForm.patchValue({ paymentAmount: this.cartTotals.total });
    this.calculateChange();
  }

  onConfirm(): void {
    if (!this.canConfirm()) {
      return;
    }

    const formValue = this.paymentForm.value;
    const result = {
      customerName: formValue.customerName || undefined,
      customerDocument: formValue.customerDocument || undefined,
      customerEmail: formValue.customerEmail || undefined,
      invoiceType: formValue.invoiceType,
      method: formValue.paymentMethod,
      amount: formValue.paymentAmount,
      change: this.change
    };

    this.close.emit(result);
  }

  onCancel(): void {
    this.close.emit(null);
  }

  getAbsChange(): number {
    return Math.abs(this.change);
  }

  private calculateTotalsFromItems(items: CartItem[]): { subtotal: number; taxAmount: number; total: number } {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    const taxAmount = items.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const itemTax = itemTotal * (item.tax / 100);
      return sum + itemTax;
    }, 0);

    const total = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }
}

