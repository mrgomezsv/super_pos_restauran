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
  productType: 'ingredient' | 'preparation' | 'final' = 'ingredient';
  readonly unitHint = 'Ej: unidad, g, kg, lb, ml, porción';
  unitOptions: string[] = [
'bandeja',
'blíster',
'bolsa',
'botella',
'caja',
'centigramo',
'centilitro',
'chorrito',
'chupito',
'copa',
'cucharada',
'cucharadita',
'cucharón',
'cuarto',
'decagramo',
'decilitro',
'diente',
'filete',
'frasco',
'galón',
'garrafón',
'gota',
    'gramo',
'jarra',
    'kilogramo',
'lata',
    'libra',
'litro',
'loncha',
'manojo',
    'mililitro',
'onza',
'onza líquida',
'paquete',
'pellizco',
'piezas',
'pinta',
'pizca',
'porción',
'pieza',
'rama',
'rebanada',
'rodaja',
'saco',
'sobre',
'tarro',
    'taza',
'tetrabrik',
'unidad',
'vaso'
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
      this.productType = this.product.productType || 'ingredient';
      this.ensureUnitOption(this.product.unitOfMeasure);
      this.productForm.patchValue({
        ...this.product,
        productType: this.product.productType || 'ingredient'
      });
      this.updateFormForProductType(this.productType);
    } else {
      // Para productos nuevos, consultar el siguiente SKU que se asignará (solo ingredientes)
      if (this.productType === 'ingredient') {
        this.loadNextSKU();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.productForm = this.fb.group({
      productType: ['ingredient', Validators.required],
      code: [{ value: '', disabled: true }], // SKU autogenerado, solo lectura
      unitOfMeasure: ['unidad', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      presentation: [''], // Presentación del producto (ej: "500 ml", "1 kg")
      price: [0, [Validators.min(0)]], // Solo para productos finales
      cost: [0, [Validators.min(0)]], // Solo para productos finales
      category: [''],
      taxRate: [13, [Validators.min(0), Validators.max(100)]], // Solo para productos finales
      isActive: [true]
    });

    // Actualizar campos según el tipo de producto
    this.productForm.get('productType')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(type => {
      this.productType = type;
      this.updateFormForProductType(type);
    });
  }

  private updateFormForProductType(type: string): void {
    const priceControl = this.productForm.get('price');
    const costControl = this.productForm.get('cost');
    const taxRateControl = this.productForm.get('taxRate');
    const categoryControl = this.productForm.get('category');

    if (type === 'ingredient') {
      // Para ingredientes, resetear precio y costo
      priceControl?.setValue(0);
      costControl?.setValue(0);
      taxRateControl?.setValue(0);
      priceControl?.clearValidators();
      costControl?.clearValidators();
      taxRateControl?.clearValidators();
    } else {
      // Para productos finales, hacer requeridos precio y costo
      priceControl?.setValidators([Validators.required, Validators.min(0)]);
      costControl?.setValidators([Validators.required, Validators.min(0)]);
      taxRateControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
      if (!priceControl?.value) priceControl?.setValue(0);
      if (!costControl?.value) costControl?.setValue(0);
      if (!taxRateControl?.value) taxRateControl?.setValue(13);
    }
    
    priceControl?.updateValueAndValidity();
    costControl?.updateValueAndValidity();
    taxRateControl?.updateValueAndValidity();
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
      const formValue = this.productForm.getRawValue();
      const productType = formValue.productType || 'ingredient';
      
      if (productType === 'ingredient') {
        this.saveIngredient(formValue);
      } else {
        this.saveFinalProduct(formValue, productType);
      }
    } else {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, completa todos los campos requeridos');
    }
  }

  private saveIngredient(productData: any): void {
    // El modal solo se usa para crear códigos de ingredientes
    // No se maneja stock aquí
    productData.stock = 0;
    productData.minStock = 0;
    productData.maxStock = null;
    productData.productType = 'ingredient';
    productData.price = 0;
    productData.cost = 0;
    productData.taxRate = 0;
    
    if (this.isEdit && this.product) {
      // Para edición, usar updateIngredient con Firestore
      const productId = (this.product as any)._firestoreId || 
                       (typeof this.product.id === 'string' ? this.product.id : this.product.id.toString());
      delete productData.code;
      delete productData.productType; // No cambiar tipo en edición
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
            this.toastr.success(`✅ Ingrediente creado exitosamente`, `SKU asignado: ${response.code}`);
            this.close.emit(true);
          },
          error: (error) => {
            console.error('Error creating ingredient:', error);
            this.toastr.error('Error al crear el ingrediente');
          }
        });
    }
  }

  private saveFinalProduct(productData: any, productType: 'preparation' | 'final'): void {
    // Preparar datos para producto final
    const finalProductData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      code: productData.code || '', // El backend generará el código si no se proporciona
      name: productData.name,
      description: productData.description || undefined,
      presentation: productData.presentation || undefined,
      price: productData.price || 0,
      cost: productData.cost || 0,
      category: productData.category || undefined,
      brand: undefined,
      stock: 0, // Stock inicial en 0
      minStock: 0,
      maxStock: null,
      isActive: productData.isActive !== false,
      barcode: undefined,
      taxRate: productData.taxRate || 13,
      productType: productType,
      unitOfMeasure: productData.unitOfMeasure
    };

    if (this.isEdit && this.product) {
      // Editar producto final en backend API
      this.productService.updateProduct(this.product.id, finalProductData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Producto actualizado exitosamente');
            this.close.emit(true);
          },
          error: (error) => {
            console.error('Error updating product:', error);
            this.toastr.error(error.error?.detail || 'Error al actualizar el producto');
          }
        });
    } else {
      // Crear producto final en backend API
      this.productService.createProduct(finalProductData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.toastr.success(`✅ Producto ${productType === 'final' ? 'final' : 'de preparación'} creado exitosamente`);
            this.close.emit(true);
          },
          error: (error) => {
            console.error('Error creating product:', error);
            this.toastr.error(error.error?.detail || 'Error al crear el producto');
          }
        });
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
