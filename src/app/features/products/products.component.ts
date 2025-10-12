import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { ProductService } from '../../core/services/product.service';
import { Product, ProductCategory } from '../../core/models/product.model';
import { ProductDialogComponent } from './product-dialog/product-dialog.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    ProductDialogComponent
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  categories: ProductCategory[] = [];
  displayedColumns: string[] = ['code', 'name', 'category', 'price', 'stock', 'status', 'actions'];
  isLoading = true;
  filtersForm: FormGroup;
  private destroy$ = new Subject<void>();
  
  // Dropdown states
  isCategoryDropdownOpen = false;
  isStatusDropdownOpen = false;

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      category: [''],
      isActive: ['']
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProducts(): void {
    this.isLoading = true;
    
    this.productService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.toastr.error('Error al cargar los productos');
          this.isLoading = false;
        }
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
        }
      });
  }

  applyFilters(): void {
    const filters = this.filtersForm.value;
    this.isLoading = true;

    this.productService.getProducts(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error filtering products:', error);
          this.toastr.error('Error al filtrar los productos');
          this.isLoading = false;
        }
      });
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadProducts();
  }

  showProductDialog = false;
  selectedProduct: Product | null = null;
  private scrollYPosition = 0;

  openProductDialog(product?: Product): void {
    // Guardar la posición actual del scroll
    this.scrollYPosition = window.scrollY;
    
    // Agregar clase al body para prevenir layout shift
    document.body.classList.add('modal-open');
    document.body.style.top = `-${this.scrollYPosition}px`;
    
    this.selectedProduct = product || null;
    this.showProductDialog = true;
  }

  closeProductDialog(): void {
    // Remover clase del body al cerrar el modal
    document.body.classList.remove('modal-open');
    document.body.style.top = '';
    
    // Restaurar la posición del scroll
    window.scrollTo(0, this.scrollYPosition);
    
    this.showProductDialog = false;
    this.selectedProduct = null;
  }

  onProductDialogResult(result: boolean): void {
    this.closeProductDialog();
    if (result) {
      this.loadProducts();
    }
  }

  editProduct(product: Product): void {
    this.openProductDialog(product);
  }

  deleteProduct(product: Product): void {
    if (confirm(`¿Está seguro de eliminar el producto "${product.name}"?`)) {
      this.productService.deleteProduct(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Producto eliminado exitosamente');
            this.loadProducts();
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.toastr.error('Error al eliminar el producto');
          }
        });
    }
  }

  getStockClass(stock: number, minStock: number): string {
    if (stock <= minStock) {
      return 'stock-low';
    } else if (stock <= minStock * 2) {
      return 'stock-normal';
    } else {
      return 'stock-high';
    }
  }

  // Dropdown methods for Category
  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
    this.isStatusDropdownOpen = false; // Close other dropdown
  }

  selectCategory(value: string): void {
    this.filtersForm.get('category')?.setValue(value);
    this.isCategoryDropdownOpen = false;
  }

  getCategoryDisplayValue(): string {
    const category = this.filtersForm.get('category')?.value;
    if (!category) {
      return 'Todas las categorías';
    }
    return category;
  }

  // Dropdown methods for Status
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
    this.isCategoryDropdownOpen = false; // Close other dropdown
  }

  selectStatus(value: string | boolean): void {
    this.filtersForm.get('isActive')?.setValue(value);
    this.isStatusDropdownOpen = false;
  }

  getStatusDisplayValue(): string {
    const status = this.filtersForm.get('isActive')?.value;
    if (status === '') {
      return 'Todos los estados';
    } else if (status === true) {
      return 'Productos Activos';
    } else if (status === false) {
      return 'Productos Inactivos';
    }
    return 'Todos los estados';
  }

  // Cerrar dropdowns cuando se hace clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-field')) {
      this.isCategoryDropdownOpen = false;
      this.isStatusDropdownOpen = false;
    }
  }
}