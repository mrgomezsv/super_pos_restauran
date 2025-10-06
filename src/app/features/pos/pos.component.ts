import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { NgxSpinnerService } from 'ngx-spinner';

import { ProductService } from '../../core/services/product.service';
import { SaleService } from '../../core/services/sale.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
import { CartItem, Sale, PaymentMethod } from '../../core/models/sale.model';
import { CustomerDialogComponent } from './customer-dialog/customer-dialog.component';
import { PaymentDialogComponent } from './payment-dialog/payment-dialog.component';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTableModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTabsModule,
    MatStepperModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="pos-container">
      <!-- Header -->
      <div class="pos-header">
        <h1>Punto de Venta</h1>
        <div class="header-actions">
          <button mat-raised-button color="primary" (click)="openCustomerDialog()">
            <mat-icon>person_add</mat-icon>
            Cliente
          </button>
          <button mat-raised-button color="accent" (click)="clearCart()">
            <mat-icon>clear_all</mat-icon>
            Limpiar
          </button>
        </div>
      </div>

      <div class="pos-content">
        <!-- Left Panel - Product Search & Categories -->
        <div class="left-panel">
          <mat-card class="search-card">
            <mat-card-header>
              <mat-card-title>Buscar Producto</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Código o Nombre</mat-label>
                <input matInput 
                       [(ngModel)]="searchTerm" 
                       (keyup.enter)="searchProduct()"
                       placeholder="Ingrese código de barras o nombre">
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              
              <button mat-raised-button 
                      color="primary" 
                      class="full-width" 
                      (click)="searchProduct()"
                      [disabled]="!searchTerm">
                Buscar
              </button>
            </mat-card-content>
          </mat-card>

          <!-- Product Categories -->
          <mat-card class="categories-card">
            <mat-card-header>
              <mat-card-title>Categorías</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="categories-grid">
                <button mat-raised-button 
                        *ngFor="let category of categories" 
                        [class.selected]="selectedCategory === category"
                        (click)="selectCategory(category)"
                        class="category-button">
                  {{ category }}
                </button>
                <button mat-raised-button 
                        [class.selected]="!selectedCategory"
                        (click)="selectCategory(null)"
                        class="category-button">
                  Todas
                </button>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Product Grid -->
          <mat-card class="products-card">
            <mat-card-header>
              <mat-card-title>Productos</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="products-grid" *ngIf="!isLoadingProducts">
                <div class="product-item" 
                     *ngFor="let product of filteredProducts" 
                     (click)="addToCart(product)">
                  <div class="product-image">
                    <mat-icon>inventory_2</mat-icon>
                  </div>
                  <div class="product-info">
                    <h4 class="product-name">{{ product.name }}</h4>
                    <p class="product-code">{{ product.code }}</p>
                    <p class="product-price">${{ product.price | number:'1.2-2' }}</p>
                    <p class="product-stock" [class.low-stock]="product.stock <= product.minStock">
                      Stock: {{ product.stock }}
                    </p>
                  </div>
                </div>
              </div>
              
              <div class="loading-container" *ngIf="isLoadingProducts">
                <mat-spinner diameter="40"></mat-spinner>
                <p>Cargando productos...</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Right Panel - Cart & Checkout -->
        <div class="right-panel">
          <!-- Cart -->
          <mat-card class="cart-card">
            <mat-card-header>
              <mat-card-title>Carrito de Compras</mat-card-title>
              <span class="cart-count">{{ cartItems.length }} items</span>
            </mat-card-header>
            <mat-card-content>
              <div class="cart-items" *ngIf="cartItems.length > 0; else emptyCart">
                <div class="cart-item" *ngFor="let item of cartItems; let i = index">
                  <div class="item-info">
                    <h4>{{ item.product.name }}</h4>
                    <p>${{ item.unitPrice | number:'1.2-2' }} x {{ item.quantity }}</p>
                  </div>
                  <div class="item-actions">
                    <button mat-icon-button (click)="decreaseQuantity(i)">
                      <mat-icon>remove</mat-icon>
                    </button>
                    <span class="quantity">{{ item.quantity }}</span>
                    <button mat-icon-button (click)="increaseQuantity(i)">
                      <mat-icon>add</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="removeFromCart(i)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                  <div class="item-total">
                    ${{ item.total | number:'1.2-2' }}
                  </div>
                </div>
              </div>

              <ng-template #emptyCart>
                <div class="empty-cart">
                  <mat-icon>shopping_cart</mat-icon>
                  <p>Carrito vacío</p>
                </div>
              </ng-template>
            </mat-card-content>
          </mat-card>

          <!-- Cart Summary -->
          <mat-card class="summary-card" *ngIf="cartItems.length > 0">
            <mat-card-content>
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>${{ cartTotals.subtotal | number:'1.2-2' }}</span>
              </div>
              <div class="summary-row">
                <span>Impuestos:</span>
                <span>${{ cartTotals.taxAmount | number:'1.2-2' }}</span>
              </div>
              <div class="summary-row total-row">
                <span>Total:</span>
                <span>${{ cartTotals.total | number:'1.2-2' }}</span>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Checkout -->
          <mat-card class="checkout-card" *ngIf="cartItems.length > 0">
            <mat-card-content>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Tipo de Factura</mat-label>
                <mat-select [(ngModel)]="invoiceType">
                  <mat-option value="consumidor_final">Consumidor Final</mat-option>
                  <mat-option value="credito_fiscal">Crédito Fiscal</mat-option>
                </mat-select>
              </mat-form-field>

              <button mat-raised-button 
                      color="primary" 
                      class="checkout-button full-width"
                      (click)="proceedToCheckout()"
                      [disabled]="isProcessingSale">
                <mat-spinner *ngIf="isProcessingSale" diameter="20"></mat-spinner>
                <span *ngIf="!isProcessingSale">
                  <mat-icon>payment</mat-icon>
                  Proceder al Pago
                </span>
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pos-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f5f5f5;
    }

    .pos-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      background-color: #1976d2;
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .pos-header h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .pos-content {
      flex: 1;
      display: flex;
      gap: 16px;
      padding: 16px;
      overflow: hidden;
    }

    .left-panel {
      flex: 2;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .right-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
      overflow-y: auto;
    }

    .full-width {
      width: 100%;
    }

    .search-card,
    .categories-card,
    .products-card,
    .cart-card,
    .summary-card,
    .checkout-card {
      margin-bottom: 16px;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
    }

    .category-button {
      font-size: 12px;
    }

    .category-button.selected {
      background-color: #1976d2;
      color: white;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .product-item {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
      background-color: white;
    }

    .product-item:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .product-image {
      text-align: center;
      margin-bottom: 8px;
    }

    .product-image mat-icon {
      font-size: 32px;
      color: #666;
    }

    .product-name {
      font-size: 14px;
      font-weight: 500;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-code {
      font-size: 12px;
      color: #666;
      margin: 0 0 4px 0;
    }

    .product-price {
      font-size: 16px;
      font-weight: 600;
      color: #1976d2;
      margin: 0 0 4px 0;
    }

    .product-stock {
      font-size: 12px;
      margin: 0;
    }

    .product-stock.low-stock {
      color: #f44336;
      font-weight: 500;
    }

    .loading-container {
      text-align: center;
      padding: 40px;
    }

    .cart-count {
      background-color: #1976d2;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .cart-items {
      max-height: 300px;
      overflow-y: auto;
    }

    .cart-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #eee;
      gap: 12px;
    }

    .item-info {
      flex: 1;
    }

    .item-info h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
    }

    .item-info p {
      margin: 0;
      font-size: 12px;
      color: #666;
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .quantity {
      min-width: 20px;
      text-align: center;
      font-weight: 500;
    }

    .item-total {
      font-weight: 600;
      color: #1976d2;
    }

    .empty-cart {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .empty-cart mat-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .total-row {
      font-weight: 600;
      font-size: 1.1rem;
      border-top: 1px solid #ddd;
      padding-top: 8px;
      color: #1976d2;
    }

    .checkout-button {
      height: 48px;
      font-size: 16px;
    }
  `]
})
export class PosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Product search and filtering
  searchTerm = '';
  selectedCategory: string | null = null;
  categories: string[] = [];
  filteredProducts: Product[] = [];
  isLoadingProducts = false;

  // Cart management
  cartItems: CartItem[] = [];
  cartTotals = { subtotal: 0, taxAmount: 0, total: 0 };

  // Sale configuration
  invoiceType: 'consumidor_final' | 'credito_fiscal' = 'consumidor_final';
  isProcessingSale = false;

  // Customer information
  customerInfo = {
    name: '',
    document: '',
    email: ''
  };

  constructor(
    private productService: ProductService,
    private saleService: SaleService,
    private authService: AuthService,
    private dialog: MatDialog,
    private toastr: ToastrService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProducts() {
    this.isLoadingProducts = true;
    this.productService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.filteredProducts = products.filter(p => p.isActive);
          this.isLoadingProducts = false;
        },
        error: (error) => {
          this.isLoadingProducts = false;
          this.toastr.error('Error al cargar productos', 'Error');
        }
      });
  }

  loadCategories() {
    this.productService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          this.categories = categories.map(c => c.name);
        },
        error: (error) => {
          console.error('Error loading categories:', error);
        }
      });
  }

  searchProduct() {
    if (!this.searchTerm.trim()) return;

    this.isLoadingProducts = true;
    this.productService.getProducts({ search: this.searchTerm })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.filteredProducts = products.filter(p => p.isActive);
          this.isLoadingProducts = false;
        },
        error: (error) => {
          this.isLoadingProducts = false;
          this.toastr.error('Error al buscar productos', 'Error');
        }
      });
  }

  selectCategory(category: string | null) {
    this.selectedCategory = category;
    this.filterProducts();
  }

  filterProducts() {
    if (this.selectedCategory) {
      this.filteredProducts = this.filteredProducts.filter(
        p => p.category === this.selectedCategory
      );
    }
  }

  addToCart(product: Product) {
    const existingItem = this.cartItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        existingItem.quantity++;
        this.updateItemTotal(existingItem);
        this.calculateCartTotals();
      } else {
        this.toastr.warning('Stock insuficiente', 'Advertencia');
      }
    } else {
      if (product.stock > 0) {
        const newItem: CartItem = {
          product,
          quantity: 1,
          unitPrice: product.price,
          subtotal: product.price,
          tax: product.taxRate,
          total: this.calculateItemTotal(product.price, 1, product.taxRate)
        };
        this.cartItems.push(newItem);
        this.calculateCartTotals();
      } else {
        this.toastr.warning('Producto sin stock', 'Advertencia');
      }
    }
  }

  increaseQuantity(index: number) {
    const item = this.cartItems[index];
    if (item.quantity < item.product.stock) {
      item.quantity++;
      this.updateItemTotal(item);
      this.calculateCartTotals();
    } else {
      this.toastr.warning('Stock insuficiente', 'Advertencia');
    }
  }

  decreaseQuantity(index: number) {
    const item = this.cartItems[index];
    if (item.quantity > 1) {
      item.quantity--;
      this.updateItemTotal(item);
      this.calculateCartTotals();
    } else {
      this.removeFromCart(index);
    }
  }

  removeFromCart(index: number) {
    this.cartItems.splice(index, 1);
    this.calculateCartTotals();
  }

  clearCart() {
    this.cartItems = [];
    this.calculateCartTotals();
  }

  private updateItemTotal(item: CartItem) {
    item.subtotal = item.unitPrice * item.quantity;
    item.total = this.calculateItemTotal(item.unitPrice, item.quantity, item.tax);
  }

  private calculateItemTotal(unitPrice: number, quantity: number, taxRate: number): number {
    const subtotal = unitPrice * quantity;
    const tax = subtotal * (taxRate / 100);
    return subtotal + tax;
  }

  private calculateCartTotals() {
    const totals = this.saleService.calculateCartTotals(this.cartItems);
    this.cartTotals = totals;
  }

  openCustomerDialog() {
    const dialogRef = this.dialog.open(CustomerDialogComponent, {
      width: '400px',
      data: { ...this.customerInfo }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.customerInfo = result;
      }
    });
  }

  proceedToCheckout() {
    if (this.cartItems.length === 0) {
      this.toastr.warning('Agregue productos al carrito', 'Advertencia');
      return;
    }

    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '500px',
      data: {
        cartItems: this.cartItems,
        cartTotals: this.cartTotals,
        invoiceType: this.invoiceType,
        customerInfo: this.customerInfo
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.processSale(result);
      }
    });
  }

  private processSale(paymentData: any) {
    this.isProcessingSale = true;
    this.spinner.show();

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.toastr.error('Usuario no autenticado', 'Error');
      return;
    }

    const saleData = {
      customerName: this.customerInfo.name || undefined,
      customerDocument: this.customerInfo.document || undefined,
      customerEmail: this.customerInfo.email || undefined,
      invoiceType: this.invoiceType,
      items: this.cartItems,
      subtotal: this.cartTotals.subtotal,
      taxAmount: this.cartTotals.taxAmount,
      discountAmount: 0,
      total: this.cartTotals.total,
      paymentMethod: paymentData.paymentMethod,
      paymentAmount: paymentData.paymentAmount,
      change: paymentData.change,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      status: 'completed' as const
    };

    this.saleService.createSale(saleData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sale) => {
          this.isProcessingSale = false;
          this.spinner.hide();
          this.toastr.success('Venta procesada exitosamente', 'Éxito');
          this.clearCart();
          this.customerInfo = { name: '', document: '', email: '' };
          // Aquí podrías abrir un diálogo para imprimir el ticket
        },
        error: (error) => {
          this.isProcessingSale = false;
          this.spinner.hide();
          this.toastr.error('Error al procesar la venta', 'Error');
        }
      });
  }
}
