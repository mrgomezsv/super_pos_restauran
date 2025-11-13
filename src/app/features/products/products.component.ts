import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { ProductDialogComponent } from './product-dialog/product-dialog.component';

@Component({
    selector: 'app-products',
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
  allProducts: Product[] = []; // Lista completa para filtrar
  displayedColumns: string[] = ['code', 'name', 'unitOfMeasure', 'status', 'actions'];
  isLoading = true;
  filtersForm: FormGroup;
  private destroy$ = new Subject<void>();
  
  // Dropdown states
  isStatusDropdownOpen = false;

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filtersForm = this.fb.group({
      search: [''],
      isActive: ['']
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    
    // Búsqueda en tiempo real
    this.filtersForm.get('search')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
    
    // Filtro de estado en tiempo real
    this.filtersForm.get('isActive')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProducts(): void {
    this.isLoading = true;
    
    // Usar getIngredients() para cargar desde Firestore
    this.productService.getIngredients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.allProducts = products;
          this.applyFilters(); // Aplicar filtros después de cargar
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading ingredients:', error);
          this.toastr.error('Error al cargar los ingredientes');
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    const filters = this.filtersForm.value;
    
    // Aplicar filtros sobre la lista completa
    let filtered = [...this.allProducts];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== '') {
      filtered = filtered.filter(p => p.isActive === filters.isActive);
    }
    
    this.products = filtered;
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.applyFilters(); // Aplicar filtros (que mostrará todos al estar vacío)
  }

  showProductDialog = false;
  selectedProduct: Product | null = null;
  private scrollYPosition = 0;

  openProductDialog(product?: Product): void {
    // Si es un ingrediente nuevo (no edición), validar límite
    if (!product) {
      const limits = this.productService.getProductLimits();
      if (limits.hasLimits && this.products.length >= limits.maxProducts) {
        this.toastr.warning(
          `Has alcanzado el límite de ${limits.maxProducts} ingredientes de tu plan`,
          'Límite Alcanzado'
        );
        return;
      }
    }

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
    if (confirm(`¿Está seguro de eliminar el ingrediente "${product.name}"?`)) {
      // Obtener el ID de Firestore
      const productId = (product as any)._firestoreId || 
                       (typeof product.id === 'string' ? product.id : product.id.toString());
      
      this.productService.deleteIngredient(productId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Ingrediente eliminado exitosamente');
            this.loadProducts();
          },
          error: (error) => {
            console.error('Error deleting ingredient:', error);
            this.toastr.error('Error al eliminar el ingrediente');
          }
        });
    }
  }

  // Dropdown methods for Status
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  selectStatus(value: string | boolean): void {
    this.filtersForm.get('isActive')?.setValue(value);
    this.applyFilters();
    this.isStatusDropdownOpen = false;
  }

  getStatusDisplayValue(): string {
    const status = this.filtersForm.get('isActive')?.value;
    if (status === '') {
      return 'Todos los estados';
    } else if (status === true) {
      return 'Ingredientes Activos';
    } else if (status === false) {
      return 'Ingredientes Inactivos';
    }
    return 'Todos los estados';
  }

  // Cerrar dropdowns cuando se hace clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select-field')) {
      this.isStatusDropdownOpen = false;
    }
  }

  // Método para obtener límites de ingredientes según suscripción
  getProductLimits() {
    return this.productService.getProductLimits();
  }
}