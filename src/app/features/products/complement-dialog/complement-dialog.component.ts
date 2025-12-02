import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { ComplementService } from '../../../core/services/complement.service';
import { ProductService } from '../../../core/services/product.service';
import { ProductComplement, ProductComplementCreate } from '../../../core/models/complement.model';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-complement-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './complement-dialog.component.html',
  styleUrls: ['./complement-dialog.component.scss']
})
export class ComplementDialogComponent implements OnInit, OnDestroy {
  complementForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  product: Product;
  availableProducts: Product[] = []; // Productos que pueden ser complementos
  existingComplements: ProductComplement[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private complementService: ComplementService,
    private productService: ProductService,
    private toastr: ToastrService,
    private dialogRef: MatDialogRef<ComplementDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product }
  ) {
    this.product = data.product;
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get complementsFormArray(): FormArray {
    return this.complementForm.get('complements') as FormArray;
  }

  private initializeForm(): void {
    this.complementForm = this.fb.group({
      complements: this.fb.array([])
    });
  }

  private loadData(): void {
    this.isLoading = true;

    // Cargar productos disponibles para complementos (productos finales activos)
    const products$ = this.productService.getProducts({ isActive: true }).pipe(
      takeUntil(this.destroy$)
    );

    // Cargar complementos existentes del producto
    const complements$ = this.complementService.getProductComplements(this.product.id).pipe(
      takeUntil(this.destroy$)
    );

    forkJoin({
      products: products$,
      complements: complements$
    }).subscribe({
      next: ({ products, complements }) => {
        // Filtrar productos finales que pueden ser complementos (excluir el producto actual)
        this.availableProducts = products.filter(p => 
          (p.productType === 'final' || p.productType === 'preparation') &&
          p.id !== this.product.id &&
          p.isActive
        );

        this.existingComplements = complements;
        
        // Cargar complementos existentes en el formulario
        if (complements.length > 0) {
          complements.forEach(complement => {
            this.addComplement(
              complement.complement_product_id,
              complement.name,
              complement.price,
              complement.is_required,
              complement.display_order
            );
          });
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.toastr.error('Error al cargar los datos');
        this.isLoading = false;
      }
    });
  }

  addComplement(productId?: number, name?: string, price?: number, isRequired: boolean = false, displayOrder?: number): void {
    const complementGroup = this.fb.group({
      complement_product_id: [productId || '', Validators.required],
      name: [name || '', [Validators.required, Validators.minLength(2)]],
      price: [price || 0, [Validators.required, Validators.min(0)]],
      is_required: [isRequired],
      display_order: [displayOrder !== undefined ? displayOrder : this.complementsFormArray.length, [Validators.required, Validators.min(0)]]
    });

    // Actualizar nombre cuando cambie el producto
    complementGroup.get('complement_product_id')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(selectedProductId => {
      const selectedProduct = this.availableProducts.find(p => p.id === selectedProductId);
      if (selectedProduct && !complementGroup.get('name')?.dirty) {
        complementGroup.patchValue({ name: selectedProduct.name }, { emitEvent: false });
      }
    });

    this.complementsFormArray.push(complementGroup);
  }

  removeComplement(index: number): void {
    this.complementsFormArray.removeAt(index);
    // Reordenar display_order
    this.complementsFormArray.controls.forEach((control, idx) => {
      control.patchValue({ display_order: idx }, { emitEvent: false });
    });
  }

  onSave(): void {
    if (this.complementForm.valid) {
      this.isSaving = true;

      const formValue = this.complementForm.getRawValue();
      const complementsToSave: ProductComplementCreate[] = formValue.complements.map((comp: any) => ({
        product_id: this.product.id,
        complement_product_id: comp.complement_product_id,
        name: comp.name,
        price: comp.price || 0,
        is_required: comp.is_required || false,
        display_order: comp.display_order || 0
      }));

      // Eliminar complementos existentes que no están en el formulario
      const existingIds = this.existingComplements.map(c => c.id);
      const newProductIds = complementsToSave.map(c => c.complement_product_id);
      const toDelete = this.existingComplements.filter(c => !newProductIds.includes(c.complement_product_id));

      // Eliminar complementos removidos
      const deleteOperations = toDelete.map(complement =>
        this.complementService.deleteComplement(complement.id).pipe(
          takeUntil(this.destroy$)
        )
      );

      // Crear/actualizar complementos
      const saveOperations = complementsToSave.map(complement => {
        const existing = this.existingComplements.find(c => 
          c.complement_product_id === complement.complement_product_id
        );
        
        if (existing) {
          return this.complementService.updateComplement(existing.id, complement).pipe(
            takeUntil(this.destroy$)
          );
        } else {
          return this.complementService.createComplement(complement).pipe(
            takeUntil(this.destroy$)
          );
        }
      });

      // Ejecutar todas las operaciones
      forkJoin([...deleteOperations, ...saveOperations]).subscribe({
        next: () => {
          this.toastr.success('Complementos guardados exitosamente');
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error saving complements:', error);
          this.toastr.error(error.error?.detail || 'Error al guardar los complementos');
          this.isSaving = false;
        }
      });
    } else {
      this.markFormGroupTouched();
      this.toastr.warning('Por favor, complete todos los campos requeridos');
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private markFormGroupTouched(): void {
    this.complementsFormArray.controls.forEach(control => {
      Object.keys(control.controls).forEach(key => {
        control.get(key)?.markAsTouched();
      });
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getProductName(productId: number): string {
    const product = this.availableProducts.find(p => p.id === productId);
    return product ? product.name : 'Desconocido';
  }
}

