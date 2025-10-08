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
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.scss'],
  host: {
    'class': 'custom-dialog-container'
  }
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
