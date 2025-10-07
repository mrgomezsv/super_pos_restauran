import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { CartItem } from '../../../core/models/sale.model';


interface PaymentDialogData {
  total: number;
  items: CartItem[];
}

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './payment-dialog.component.html',
  styleUrls: ['./payment-dialog.component.scss']
})
export class PaymentDialogComponent implements OnInit {
  customerName = '';
  customerDocument = '';
  customerEmail = '';
  invoiceType: 'consumidor_final' | 'credito_fiscal' = 'consumidor_final';
  paymentMethod: 'cash' | 'card' | 'transfer' = 'cash';
  paymentAmount = 0;
  change = 0;
  cartTotals: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };

  constructor(
    public dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentDialogData
  ) {
    // Calcular totales basados en los items
    this.cartTotals = this.calculateTotalsFromItems(data.items);
  }

  ngOnInit(): void {
    this.paymentAmount = this.data.total;
    this.calculateChange();
  }

  onPaymentMethodChange(): void {
    // Al cambiar método de pago, ajustar el monto
    if (this.paymentMethod === 'cash') {
      this.paymentAmount = this.data.total;
    } else {
      // Para tarjeta y transferencia, el monto es exacto
      this.paymentAmount = this.data.total;
    }
    this.calculateChange();
  }

  onPaymentAmountChange(): void {
    this.calculateChange();
  }

  calculateChange(): void {
    if (this.paymentMethod === 'cash') {
      this.change = this.paymentAmount - this.data.total;
    } else {
      // Para tarjeta y transferencia no hay cambio
      this.change = 0;
    }
  }

  canConfirm(): boolean {
    if (this.paymentMethod === 'cash') {
      return this.paymentAmount >= this.data.total && this.paymentAmount > 0;
    }
    // Para tarjeta y transferencia, debe ser el monto exacto
    return Math.abs(this.paymentAmount - this.data.total) < 0.01 && this.paymentAmount > 0;
  }

  setExactAmount(): void {
    this.paymentAmount = this.data.total;
    this.calculateChange();
  }

  onConfirm(): void {
    if (!this.canConfirm()) {
      return;
    }

    const result = {
      customerName: this.customerName || undefined,
      customerDocument: this.customerDocument || undefined,
      customerEmail: this.customerEmail || undefined,
      invoiceType: this.invoiceType,
      method: this.paymentMethod,
      amount: this.paymentAmount,
      change: this.change
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
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