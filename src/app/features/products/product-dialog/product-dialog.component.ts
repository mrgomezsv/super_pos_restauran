import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
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
  categories: ProductCategory[] = [];
  isEdit = false;
  isLoadingCategories = false;
  showNewCategoryDialog = false;
  newCategoryName = '';
  isCreatingCategory = false;
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
    } else {
      // Para productos nuevos, consultar el siguiente SKU que se asignará
      this.loadNextSKU();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.productForm = this.fb.group({
      code: [''], // Solo para mostrar, se genera automáticamente en el backend
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
    this.isLoadingCategories = true;
    this.productService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories;
          this.isLoadingCategories = false;
        },
        error: (error) => {
          console.error('Error loading categories:', error);
          this.toastr.error('Error al cargar las categorías');
          this.isLoadingCategories = false;
        }
      });
  }

  getCategoryIcon(categoryName: string): string {
    const iconMap: { [key: string]: string } = {
      'Bebidas': 'local_drink',
      'Panadería': 'bakery_dining',
      'Lácteos': 'water_drop',
      'Carnes': 'restaurant',
      'Frutas y Verduras': 'eco',
      'Limpieza': 'cleaning_services',
      'Higiene': 'soap',
      'Cereales': 'grain',
      'Snacks': 'cookie',
      'Congelados': 'ac_unit',
      'Enlatados': 'inventory_2',
      'Especias': 'restaurant_menu',
      'Aceites': 'oil_barrel',
      'Pasta': 'dinner_dining',
      'Dulces': 'cake'
    };
    return iconMap[categoryName] || 'category';
  }

  onCategoryChange(event: any): void {
    if (event.value === '__NEW_CATEGORY__') {
      this.openNewCategoryDialog();
    }
  }

  openNewCategoryDialog(): void {
    this.showNewCategoryDialog = true;
    this.newCategoryName = '';
    // Reset form to avoid selecting the __NEW_CATEGORY__ option
    this.productForm.patchValue({ category: '' });
  }

  closeNewCategoryDialog(): void {
    this.showNewCategoryDialog = false;
    this.newCategoryName = '';
    this.isCreatingCategory = false;
  }

  createNewCategory(): void {
    if (!this.newCategoryName?.trim()) return;

    this.isCreatingCategory = true;
    const categoryData = {
      name: this.newCategoryName.trim(),
      isActive: true
    };

    this.productService.createCategory(categoryData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newCategory) => {
          this.categories.push(newCategory);
          this.productForm.patchValue({ category: newCategory.name });
          this.closeNewCategoryDialog();
          this.toastr.success(`Categoría "${newCategory.name}" creada exitosamente`);
        },
        error: (error) => {
          console.error('Error creating category:', error);
          this.toastr.error('Error al crear la categoría');
          this.isCreatingCategory = false;
        }
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



  onSave(): void {
    if (this.productForm.valid) {
      const productData = { ...this.productForm.value };
      
      if (this.isEdit && this.product) {
        // Para edición, mantener el código existente pero no enviarlo
        delete productData.code;
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
        // Para creación, remover el código del payload (se genera automáticamente en el backend)
        delete productData.code;
        this.productService.createProduct(productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              // Mostrar el SKU asignado por el backend
              this.toastr.success(`✅ Producto creado exitosamente`, `SKU asignado: ${response.code}`);
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
