import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ComplementService } from '../../../core/services/complement.service';
import { ProductComplement, CartItemComplement } from '../../../core/models/complement.model';
import { Product } from '../../../core/models/product.model';

export interface ComplementSelectorData {
  product: Product;
  quantity: number;
}

@Component({
  selector: 'app-complement-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './complement-selector-dialog.component.html',
  styleUrls: ['./complement-selector-dialog.component.scss']
})
export class ComplementSelectorDialogComponent implements OnInit, OnDestroy {
  complementForm!: FormGroup;
  isLoading = true;
  complements: ProductComplement[] = [];
  product: Product;
  quantity: number;
  selectedComplements: CartItemComplement[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private complementService: ComplementService,
    private dialogRef: MatDialogRef<ComplementSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ComplementSelectorData
  ) {
    this.product = data.product;
    this.quantity = data.quantity;
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadComplements();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get complementCheckboxes(): FormArray {
    return this.complementForm.get('complements') as FormArray;
  }

  private initializeForm(): void {
    this.complementForm = this.fb.group({
      complements: this.fb.array([])
    });
  }

  private loadComplements(): void {
    this.isLoading = true;

    this.complementService.getProductComplements(this.product.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (complements) => {
          // Ordenar por display_order
          this.complements = complements.sort((a, b) => a.display_order - b.display_order);
          
          // Crear checkboxes para cada complemento
          this.complements.forEach(complement => {
            const control = this.fb.group({
              complement_id: [complement.id],
              complement_product_id: [complement.complement_product_id],
              complement_product_name: [complement.complement_product_name || ''],
              complement_name: [complement.name],
              price: [complement.price],
              is_required: [complement.is_required],
              selected: [complement.is_required] // Si es requerido, se selecciona automáticamente
            });

            // Si es requerido, deshabilitar el checkbox
            if (complement.is_required) {
              control.get('selected')?.disable();
            }

            this.complementCheckboxes.push(control);
          });

          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading complements:', error);
          this.isLoading = false;
        }
      });
  }

  onConfirm(): void {
    const selectedComplements: CartItemComplement[] = [];

    this.complementCheckboxes.controls.forEach(control => {
      const isSelected = control.get('selected')?.value;
      if (isSelected) {
        selectedComplements.push({
          complement_product_id: control.get('complement_product_id')?.value,
          complement_product_name: control.get('complement_product_name')?.value,
          complement_name: control.get('complement_name')?.value,
          price: control.get('price')?.value || 0,
          quantity: this.quantity // Misma cantidad que el producto principal
        });
      }
    });

    this.selectedComplements = selectedComplements;
    this.dialogRef.close(selectedComplements);
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getTotalComplementPrice(): number {
    return this.complementCheckboxes.controls.reduce((total, control) => {
      if (control.get('selected')?.value) {
        return total + (control.get('price')?.value || 0) * this.quantity;
      }
      return total;
    }, 0);
  }

  hasRequiredComplements(): boolean {
    return this.complementCheckboxes.controls.some(control => 
      control.get('is_required')?.value && !control.get('selected')?.value
    );
  }
}

