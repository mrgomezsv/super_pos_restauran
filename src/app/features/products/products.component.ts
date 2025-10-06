import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
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
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="products-container">
      <div class="products-header">
        <h1>Gestión de Productos</h1>
        <button mat-raised-button color="primary" (click)="openProductDialog()">
          <mat-icon>add</mat-icon>
          Nuevo Producto
        </button>
      </div>

      <!-- Filters -->
      <mat-card class="filters-card">
        <mat-card-content>
          <form [formGroup]="filterForm" class="filters-form">
            <mat-form-field appearance="outline">
              <mat-label>Buscar</mat-label>
              <input matInput formControlName="search" placeholder="Código, nombre o descripción">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Categoría</mat-label>
              <mat-select formControlName="category">
                <mat-option value="">Todas</mat-option>
                <mat-option *ngFor="let category of categories" [value]="category.name">
                  {{ category.name }}
                </mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Estado</mat-label>
              <mat-select formControlName="isActive">
                <mat-option value="">Todos</mat-option>
                <mat-option [value]="true">Activos</mat-option>
                <mat-option [value]="false">Inactivos</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button type="submit" (click)="applyFilters()">
              <mat-icon>filter_list</mat-icon>
              Filtrar
            </button>

            <button mat-button type="button" (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Limpiar
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Products Table -->
      <mat-card class="products-table-card">
        <mat-card-content>
          <div class="table-container" *ngIf="!isLoading; else loadingTemplate">
            <table mat-table [dataSource]="products" class="products-table">
              <!-- Code Column -->
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef> Código </th>
                <td mat-cell *matCellDef="let product"> {{ product.code }} </td>
              </ng-container>

              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef> Nombre </th>
                <td mat-cell *matCellDef="let product"> 
                  <div class="product-name">
                    <strong>{{ product.name }}</strong>
                    <span class="product-description" *ngIf="product.description">
                      {{ product.description }}
                    </span>
                  </div>
                </td>
              </ng-container>

              <!-- Category Column -->
              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef> Categoría </th>
                <td mat-cell *matCellDef="let product"> 
                  <mat-chip>{{ product.category }}</mat-chip>
                </td>
              </ng-container>

              <!-- Price Column -->
              <ng-container matColumnDef="price">
                <th mat-header-cell *matHeaderCellDef> Precio </th>
                <td mat-cell *matCellDef="let product"> 
                  <span class="price">${{ product.price | number:'1.2-2' }}</span>
                </td>
              </ng-container>

              <!-- Stock Column -->
              <ng-container matColumnDef="stock">
                <th mat-header-cell *matHeaderCellDef> Stock </th>
                <td mat-cell *matCellDef="let product"> 
                  <span class="stock" [class.low-stock]="product.stock <= product.minStock">
                    {{ product.stock }}
                  </span>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef> Estado </th>
                <td mat-cell *matCellDef="let product"> 
                  <mat-chip [color]="product.isActive ? 'primary' : 'warn'" selected>
                    {{ product.isActive ? 'Activo' : 'Inactivo' }}
                  </mat-chip>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef> Acciones </th>
                <td mat-cell *matCellDef="let product"> 
                  <button mat-icon-button (click)="editProduct(product)" matTooltip="Editar">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteProduct(product)" matTooltip="Eliminar">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <mat-paginator
              [length]="totalProducts"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 25, 50, 100]"
              (page)="onPageChange($event)"
              showFirstLastButtons>
            </mat-paginator>
          </div>

          <ng-template #loadingTemplate>
            <div class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Cargando productos...</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .products-container {
      padding: 20px;
    }

    .products-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .products-header h1 {
      margin: 0;
      color: #1976d2;
    }

    .filters-card,
    .products-table-card {
      margin-bottom: 20px;
    }

    .filters-form {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filters-form mat-form-field {
      min-width: 200px;
    }

    .table-container {
      overflow-x: auto;
    }

    .products-table {
      width: 100%;
    }

    .product-name {
      display: flex;
      flex-direction: column;
    }

    .product-description {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    .price {
      font-weight: 600;
      color: #1976d2;
    }

    .stock {
      font-weight: 500;
    }

    .stock.low-stock {
      color: #f44336;
      font-weight: 600;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #666;
    }

    .loading-container p {
      margin-top: 16px;
    }

    @media (max-width: 768px) {
      .filters-form {
        flex-direction: column;
        align-items: stretch;
      }

      .filters-form mat-form-field {
        min-width: auto;
      }

      .products-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }
    }
  `]
})
export class ProductsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  products: Product[] = [];
  categories: ProductCategory[] = [];
  displayedColumns: string[] = ['code', 'name', 'category', 'price', 'stock', 'status', 'actions'];
  
  // Pagination
  totalProducts = 0;
  pageSize = 25;
  currentPage = 0;

  // Filters
  filterForm: FormGroup;
  isLoading = false;

  constructor(
    private productService: ProductService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      category: [''],
      isActive: ['']
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts() {
    this.isLoading = true;
    const filters = this.getFilters();
    
    this.productService.getProducts(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products;
          this.totalProducts = products.length;
          this.isLoading = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.toastr.error('Error al cargar productos', 'Error');
        }
      });
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

  applyFilters() {
    this.currentPage = 0;
    this.loadProducts();
  }

  clearFilters() {
    this.filterForm.reset();
    this.currentPage = 0;
    this.loadProducts();
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadProducts();
  }

  private getFilters() {
    const formValue = this.filterForm.value;
    const filters: any = {};

    if (formValue.search) {
      filters.search = formValue.search;
    }
    if (formValue.category) {
      filters.category = formValue.category;
    }
    if (formValue.isActive !== '') {
      filters.isActive = formValue.isActive;
    }

    return filters;
  }

  openProductDialog(product?: Product) {
    const dialogRef = this.dialog.open(ProductDialogComponent, {
      width: '600px',
      data: product || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadProducts();
      }
    });
  }

  editProduct(product: Product) {
    this.openProductDialog(product);
  }

  deleteProduct(product: Product) {
    if (confirm(`¿Está seguro de eliminar el producto "${product.name}"?`)) {
      this.productService.deleteProduct(product.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Producto eliminado exitosamente', 'Éxito');
            this.loadProducts();
          },
          error: (error) => {
            this.toastr.error('Error al eliminar producto', 'Error');
          }
        });
    }
  }
}
