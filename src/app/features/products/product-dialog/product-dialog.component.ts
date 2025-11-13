import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ProductService } from '../../../core/services/product.service';
import { Product } from '../../../core/models/product.model';

@Component({
    selector: 'app-product-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatIconModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatTooltipModule
    ],
    templateUrl: './product-dialog.component.html',
    styleUrls: ['./product-dialog.component.scss']
})
export class ProductDialogComponent implements OnInit, OnDestroy {
  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<boolean>();

  productForm!: FormGroup;
  isEdit = false;
  readonly unitHint = 'Ej: unidad, g, kg, lb, ml, porción';
  unitOptions: string[] = [
    'unidad',
    'pieza',
    'porción',
    'gramo',
    'kilogramo',
    'onza',
    'libra',
    'mililitro',
    'litro',
    'taza',
    'cucharada',
    'cucharadita',
    'paquete',
    'bolsa',
    'botella',
    'lata',
    'bandeja'
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private toastr: ToastrService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.isEdit = !!this.product;

    if (this.isEdit && this.product) {
      this.ensureUnitOption(this.product.unitOfMeasure);
      this.productForm.patchValue({
        ...this.product,
        quantityToAdd: 0
      });
    } else {
      // Para ingredientes nuevos, consultar el siguiente SKU que se asignará
      this.loadNextSKU();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.productForm = this.fb.group({
      code: [{ value: '', disabled: true }], // SKU autogenerado, solo lectura
      unitOfMeasure: ['unidad', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.minLength(2)]], // Descripción del ingrediente
      quantityToAdd: [0, [Validators.required, Validators.min(0)]],
      stock: [{ value: 0, disabled: true }],
      brand: [''],
      isActive: [true]
    });
  }

  private loadNextSKU(): void {
    this.productService.getNextSKU()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.productForm.patchValue({ code: response.nextSKU });
        },
        error: (error) => {
          console.error('Error loading next SKU:', error);
          // Si falla, mostrar placeholder genérico
          this.productForm.patchValue({ code: '' });
        }
      });
  }

  private ensureUnitOption(unit?: string): void {
    const value = unit?.trim();
    if (value && !this.unitOptions.includes(value)) {
      this.unitOptions = [...this.unitOptions, value];
    }
  }



  onSave(): void {
    if (this.productForm.valid) {
      const productData = { ...this.productForm.getRawValue() };
      const quantityToAdd = Number(productData.quantityToAdd) || 0;
      const currentStock = this.product?.stock ?? 0;

      if (this.isEdit) {
        productData.stock = currentStock + quantityToAdd;
      } else {
        productData.stock = quantityToAdd;
      }

      productData.minStock = 0;
      productData.maxStock = null;
      delete productData.quantityToAdd;
      
      if (this.isEdit && this.product) {
        // Para edición, usar updateIngredient con Firestore
        // Obtener el ID de Firestore (puede estar en _firestoreId o en id si es string)
        const productId = (this.product as any)._firestoreId || 
                         (typeof this.product.id === 'string' ? this.product.id : this.product.id.toString());
        delete productData.code;
        this.productService.updateIngredient(productId, productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Ingrediente actualizado exitosamente');
              this.close.emit(true);
            },
            error: (error) => {
              console.error('Error updating ingredient:', error);
              this.toastr.error('Error al actualizar el ingrediente');
            }
          });
      } else {
        // Para creación, usar createIngredient con Firestore (SKU se genera automáticamente)
        delete productData.code;
        this.productService.createIngredient(productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              // Mostrar el SKU asignado
              this.toastr.success(`✅ Ingrediente creado exitosamente`, `SKU asignado: ${response.code}`);
              this.close.emit(true);
            },
            error: (error) => {
              console.error('Error creating ingredient:', error);
              this.toastr.error('Error al crear el ingrediente');
            }
          });
      }
    } else {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, completa todos los campos requeridos');
    }
  }

  onCancel(): void {
    this.close.emit(false);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.productForm.get(controlName);
    if (control?.hasError('required')) {
      return 'Este campo es requerido';
    }
    if (control?.hasError('minlength')) {
      return `Mínimo ${control.errors?.['minlength'].requiredLength} caracteres`;
    }
    if (control?.hasError('min')) {
      return `El valor mínimo es ${control.errors?.['min'].min}`;
    }
    return '';
  }
}
