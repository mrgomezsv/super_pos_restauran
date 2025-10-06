import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ToastrService } from 'ngx-toastr';

import { ProductService } from '../../../core/services/product.service';
import { Product, ProductCategory } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-dialog',
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
    MatCheckboxModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ isEdit ? 'edit' : 'add' }}</mat-icon>
      {{ isEdit ? 'Editar Producto' : 'Nuevo Producto' }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="productForm" class="product-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Código del Producto</mat-label>
            <input matInput formControlName="code" placeholder="Ej: PROD001">
            <mat-icon matSuffix>qr_code</mat-icon>
            <mat-error *ngIf="productForm.get('code')?.hasError('required')">
              El código es requerido
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Categoría</mat-label>
            <mat-select formControlName="category">
              <mat-option *ngFor="let category of categories" [value]="category.name">
                {{ category.name }}
              </mat-option>
            </mat-select>
            <mat-icon matSuffix>category</mat-icon>
            <mat-error *ngIf="productForm.get('category')?.hasError('required')">
              La categoría es requerida
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nombre del Producto</mat-label>
          <input matInput formControlName="name" placeholder="Ingrese el nombre del producto">
          <mat-icon matSuffix>inventory</mat-icon>
          <mat-error *ngIf="productForm.get('name')?.hasError('required')">
            El nombre es requerido
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Descripción</mat-label>
          <textarea matInput 
                    formControlName="description" 
                    placeholder="Descripción del producto (opcional)"
                    rows="3">
          </textarea>
          <mat-icon matSuffix>description</mat-icon>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Precio de Venta</mat-label>
            <input matInput 
                   type="number" 
                   formControlName="price" 
                   placeholder="0.00"
                   step="0.01">
            <span matPrefix>$&nbsp;</span>
            <mat-icon matSuffix>attach_money</mat-icon>
            <mat-error *ngIf="productForm.get('price')?.hasError('required')">
              El precio es requerido
            </mat-error>
            <mat-error *ngIf="productForm.get('price')?.hasError('min')">
              El precio debe ser mayor a 0
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Costo</mat-label>
            <input matInput 
                   type="number" 
                   formControlName="cost" 
                   placeholder="0.00"
                   step="0.01">
            <span matPrefix>$&nbsp;</span>
            <mat-icon matSuffix>monetization_on</mat-icon>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Stock Actual</mat-label>
            <input matInput 
                   type="number" 
                   formControlName="stock" 
                   placeholder="0">
            <mat-icon matSuffix>inventory_2</mat-icon>
            <mat-error *ngIf="productForm.get('stock')?.hasError('required')">
              El stock es requerido
            </mat-error>
            <mat-error *ngIf="productForm.get('stock')?.hasError('min')">
              El stock no puede ser negativo
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Stock Mínimo</mat-label>
            <input matInput 
                   type="number" 
                   formControlName="minStock" 
                   placeholder="0">
            <mat-icon matSuffix>warning</mat-icon>
            <mat-error *ngIf="productForm.get('minStock')?.hasError('required')">
              El stock mínimo es requerido
            </mat-error>
            <mat-error *ngIf="productForm.get('minStock')?.hasError('min')">
              El stock mínimo no puede ser negativo
            </mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Stock Máximo</mat-label>
            <input matInput 
                   type="number" 
                   formControlName="maxStock" 
                   placeholder="0">
            <mat-icon matSuffix>storage</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Porcentaje de Impuesto</mat-label>
            <input matInput 
                   type="number" 
                   formControlName="taxRate" 
                   placeholder="15"
                   step="0.01">
            <span matSuffix>%</span>
            <mat-icon matSuffix>percent</mat-icon>
            <mat-error *ngIf="productForm.get('taxRate')?.hasError('required')">
              El porcentaje de impuesto es requerido
            </mat-error>
            <mat-error *ngIf="productForm.get('taxRate')?.hasError('min')">
              El porcentaje no puede ser negativo
            </mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Marca</mat-label>
          <input matInput formControlName="brand" placeholder="Marca del producto (opcional)">
          <mat-icon matSuffix>business</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Código de Barras</mat-label>
          <input matInput formControlName="barcode" placeholder="Código de barras (opcional)">
          <mat-icon matSuffix>qr_code_scanner</mat-icon>
        </mat-form-field>

        <div class="checkbox-row">
          <mat-checkbox formControlName="isActive">
            Producto Activo
          </mat-checkbox>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button 
              color="primary" 
              (click)="onSave()"
              [disabled]="productForm.invalid">
        <mat-icon>save</mat-icon>
        {{ isEdit ? 'Actualizar' : 'Crear' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .product-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 500px;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .half-width {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .checkbox-row {
      margin-top: 16px;
    }

    mat-dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .product-form {
        min-width: auto;
      }

      .form-row {
        flex-direction: column;
        gap: 8px;
      }

      .half-width {
        width: 100%;
      }
    }
  `]
})
export class ProductDialogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  productForm: FormGroup;
  categories: ProductCategory[] = [];
  isEdit = false;

  constructor(
    public dialogRef: MatDialogRef<ProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Product | null,
    private fb: FormBuilder,
    private productService: ProductService,
    private toastr: ToastrService
  ) {
    this.productForm = this.fb.group({
      code: ['', [Validators.required]],
      name: ['', [Validators.required]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0.01)]],
      cost: [0],
      category: ['', [Validators.required]],
      brand: [''],
      stock: [0, [Validators.required, Validators.min(0)]],
      minStock: [0, [Validators.required, Validators.min(0)]],
      maxStock: [0],
      barcode: [''],
      taxRate: [15, [Validators.required, Validators.min(0)]],
      isActive: [true]
    });
  }

  ngOnInit() {
    this.loadCategories();
    
    if (this.data) {
      this.isEdit = true;
      this.productForm.patchValue(this.data);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories() {
    this.productService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
        },
        error: (error) => {
          console.error('Error loading categories:', error);
        }
      });
  }

  onCancel() {
    this.dialogRef.close();
  }

  onSave() {
    if (this.productForm.valid) {
      const productData = this.productForm.value;

      if (this.isEdit && this.data) {
        this.productService.updateProduct(this.data.id, productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (product) => {
              this.toastr.success('Producto actualizado exitosamente', 'Éxito');
              this.dialogRef.close(product);
            },
            error: (error) => {
              this.toastr.error('Error al actualizar producto', 'Error');
            }
          });
      } else {
        this.productService.createProduct(productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (product) => {
              this.toastr.success('Producto creado exitosamente', 'Éxito');
              this.dialogRef.close(product);
            },
            error: (error) => {
              this.toastr.error('Error al crear producto', 'Error');
            }
          });
      }
    }
  }
}
