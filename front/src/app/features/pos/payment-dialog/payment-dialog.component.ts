import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { CartItem } from '../../../core/models/sale.model';
import { FiscalDocument } from '../../../core/models/fiscal-document.model';
import { FiscalDocumentService } from '../../../core/services/fiscal-document.service';

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
  paymentForm!: FormGroup;
  change = 0;
  cartTotals: {
    subtotal: number;
    taxAmount: number;
    total: number;
  };
  fiscalDocuments: FiscalDocument[] = [];
  isLoadingDocuments = true;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private fiscalDocumentService: FiscalDocumentService,
    public dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { total: number; items: CartItem[] }
  ) {
    this.cartTotals = { subtotal: 0, taxAmount: 0, total: 0 };
  }

  ngOnInit(): void {
    this.cartTotals = this.calculateTotalsFromItems(this.data.items);
    this.loadFiscalDocuments();
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFiscalDocuments(): void {
    this.isLoadingDocuments = true;
    this.fiscalDocumentService.getFiscalDocuments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documents) => {
          // Filtrar solo documentos activos
          this.fiscalDocuments = documents.filter(d => d.isActive);
          this.isLoadingDocuments = false;
          
          // Si hay documentos, establecer el primero como predeterminado
          if (this.fiscalDocuments.length > 0) {
            this.paymentForm.patchValue({ invoiceType: this.fiscalDocuments[0].code });
          }
        },
        error: (error) => {
          console.error('Error loading fiscal documents:', error);
          this.isLoadingDocuments = false;
          // En caso de error, usar valores predeterminados
          this.fiscalDocuments = [
            { 
              id: 1, 
              code: 'consumidor_final', 
              name: 'Consumidor Final', 
              prefix: 'CF',
              initialCorrelative: 1,
              currentCorrelative: 1,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ];
        }
      });
  }

  private initializeForm(): void {
    this.paymentForm = this.fb.group({
      customerName: [''],
      customerDocument: [''],
      customerEmail: ['', [Validators.email]],
      invoiceType: ['', Validators.required],
      paymentMethod: ['cash', Validators.required],
      paymentAmount: ['', [Validators.required, Validators.min(0.01)]]
    });

    // Observar cambios en el método de pago
    this.paymentForm.get('paymentMethod')?.valueChanges.subscribe(() => {
      this.onPaymentMethodChange();
    });

    // Observar cambios en el monto
    this.paymentForm.get('paymentAmount')?.valueChanges.subscribe(() => {
      this.calculateChange();
    });

    // Inicializar con el método de pago por defecto
    this.onPaymentMethodChange();
  }

  onPaymentMethodChange(): void {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    
    if (paymentMethod === 'cash') {
      // Para efectivo, dejar el campo en blanco para que el usuario ingrese el monto recibido
      this.paymentForm.patchValue({ paymentAmount: '' });
    } else if (paymentMethod === 'bitcoin') {
      // Para Bitcoin, el monto es exacto en USD
      this.paymentForm.patchValue({ paymentAmount: this.cartTotals.total });
    } else {
      // Para tarjeta y transferencia, el monto es exacto
      this.paymentForm.patchValue({ paymentAmount: this.cartTotals.total });
    }
    this.calculateChange();
  }

  calculateChange(): void {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    const paymentAmount = parseFloat(this.paymentForm.get('paymentAmount')?.value) || 0;

    if (paymentMethod === 'cash') {
      this.change = paymentAmount - this.cartTotals.total;
    } else {
      // Para tarjeta, transferencia y Bitcoin no hay cambio
      this.change = 0;
    }
  }

  canConfirm(): boolean {
    const paymentMethod = this.paymentForm.get('paymentMethod')?.value;
    const paymentAmount = parseFloat(this.paymentForm.get('paymentAmount')?.value) || 0;

    if (paymentMethod === 'cash') {
      return paymentAmount >= this.cartTotals.total && paymentAmount > 0;
    }
    // Para tarjeta, transferencia y Bitcoin, debe ser el monto exacto
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

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close(null);
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

