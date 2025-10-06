import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-payment-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCardModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>payment</mat-icon>
      Procesar Pago
    </h2>

    <mat-dialog-content>
      <!-- Order Summary -->
      <mat-card class="summary-card">
        <mat-card-header>
          <mat-card-title>Resumen de la Venta</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${{ data.cartTotals.subtotal | number:'1.2-2' }}</span>
          </div>
          <div class="summary-row">
            <span>Impuestos:</span>
            <span>${{ data.cartTotals.taxAmount | number:'1.2-2' }}</span>
          </div>
          <mat-divider></mat-divider>
          <div class="summary-row total-row">
            <span>Total a Pagar:</span>
            <span>${{ data.cartTotals.total | number:'1.2-2' }}</span>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Payment Form -->
      <form [formGroup]="paymentForm" class="payment-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Método de Pago</mat-label>
          <mat-select formControlName="paymentMethod" (selectionChange)="onPaymentMethodChange()">
            <mat-option value="cash">Efectivo</mat-option>
            <mat-option value="card">Tarjeta</mat-option>
            <mat-option value="transfer">Transferencia</mat-option>
          </mat-select>
          <mat-icon matSuffix>payment</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Monto Recibido</mat-label>
          <input matInput 
                 type="number" 
                 formControlName="paymentAmount" 
                 placeholder="0.00"
                 (input)="calculateChange()">
          <span matPrefix>$&nbsp;</span>
          <mat-icon matSuffix>attach_money</mat-icon>
        </mat-form-field>

        <div class="change-display" *ngIf="change > 0">
          <mat-card class="change-card">
            <mat-card-content>
              <div class="change-info">
                <mat-icon class="change-icon">monetization_on</mat-icon>
                <div>
                  <h3>Cambio:</h3>
                  <p class="change-amount">${{ change | number:'1.2-2' }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="insufficient-funds" *ngIf="change < 0">
          <mat-card class="error-card">
            <mat-card-content>
              <div class="error-info">
                <mat-icon class="error-icon">warning</mat-icon>
                <div>
                  <h3>Fondos Insuficientes</h3>
                  <p>Faltan ${{ Math.abs(change) | number:'1.2-2' }}</p>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button 
              color="primary" 
              (click)="onConfirm()"
              [disabled]="paymentForm.invalid || change < 0">
        <mat-icon>check_circle</mat-icon>
        Confirmar Pago
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .summary-card,
    .change-card,
    .error-card {
      margin-bottom: 16px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .total-row {
      font-weight: 600;
      font-size: 1.1rem;
      color: #1976d2;
    }

    .payment-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .full-width {
      width: 100%;
    }

    .change-display {
      margin-top: 16px;
    }

    .change-info,
    .error-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .change-icon {
      color: #4caf50;
      font-size: 32px;
    }

    .error-icon {
      color: #f44336;
      font-size: 32px;
    }

    .change-amount {
      font-size: 1.5rem;
      font-weight: 600;
      color: #4caf50;
      margin: 0;
    }

    .error-info h3 {
      color: #f44336;
      margin: 0 0 4px 0;
    }

    .error-info p {
      color: #f44336;
      font-weight: 500;
      margin: 0;
    }

    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class PaymentDialogComponent implements OnInit {
  paymentForm: FormGroup;
  change = 0;
  Math = Math;

  constructor(
    public dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.paymentForm = this.fb.group({
      paymentMethod: ['cash', [Validators.required]],
      paymentAmount: [0, [Validators.required, Validators.min(0.01)]]
    });
  }

  ngOnInit() {
    // Si es efectivo, establecer el monto recibido como el total
    if (this.paymentForm.get('paymentMethod')?.value === 'cash') {
      this.paymentForm.patchValue({
        paymentAmount: this.data.cartTotals.total
      });
      this.calculateChange();
    }
  }

  onPaymentMethodChange() {
    const method = this.paymentForm.get('paymentMethod')?.value;
    
    if (method === 'cash') {
      this.paymentForm.patchValue({
        paymentAmount: this.data.cartTotals.total
      });
    } else {
      // Para tarjeta y transferencia, el monto es exacto
      this.paymentForm.patchValue({
        paymentAmount: this.data.cartTotals.total
      });
    }
    
    this.calculateChange();
  }

  calculateChange() {
    const paymentAmount = this.paymentForm.get('paymentAmount')?.value || 0;
    this.change = paymentAmount - this.data.cartTotals.total;
  }

  onCancel() {
    this.dialogRef.close();
  }

  onConfirm() {
    if (this.paymentForm.valid) {
      const paymentData = {
        ...this.paymentForm.value,
        change: this.change
      };
      this.dialogRef.close(paymentData);
    }
  }
}
