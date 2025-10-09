import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { ProductService } from '../../../core/services/product.service';
import { Product, ProductCategory } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './product-dialog.component.html',
  styleUrls: ['./product-dialog.component.scss']
})
export class ProductDialogComponent implements OnInit, OnDestroy {
  @Input() product: Product | null = null;
  @Output() close = new EventEmitter<boolean>();

  productForm!: FormGroup;
  categories: ProductCategory[] = [];
  isEdit = false;
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
    this.loadCategories();
    
    if (this.isEdit && this.product) {
      this.productForm.patchValue(this.product);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.productForm = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(3)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      category: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0.01)]],
      cost: [0, Validators.min(0)],
      taxRate: [15, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      minStock: [0, [Validators.required, Validators.min(0)]],
      maxStock: [0],
      brand: [''],
      barcode: [''],
      isActive: [true]
    });
  }

  private loadCategories(): void {
    this.productService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.toastr.error('Error al cargar las categorías');
        }
      });
  }

  onSave(): void {
    if (this.productForm.valid) {
      const productData = this.productForm.value;
      
      if (this.isEdit && this.product) {
        this.productService.updateProduct(this.product.id, productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Producto actualizado exitosamente');
              this.close.emit(true);
            },
            error: (error) => {
              console.error('Error updating product:', error);
              this.toastr.error('Error al actualizar el producto');
            }
          });
      } else {
        this.productService.createProduct(productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toastr.success('Producto creado exitosamente');
              this.close.emit(true);
            },
            error: (error) => {
              console.error('Error creating product:', error);
              this.toastr.error('Error al crear el producto');
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
