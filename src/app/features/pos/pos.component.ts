import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';

import { ProductService } from '../../core/services/product.service';
import { SaleService } from '../../core/services/sale.service';
import { AuthService } from '../../core/services/auth.service';
import { Product } from '../../core/models/product.model';
import { CartItem, Sale } from '../../core/models/sale.model';
import { User } from '../../core/models/user.model';
import { PaymentDialogComponent } from './payment-dialog/payment-dialog.component';

interface CartTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})
export class PosComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  cartItems: CartItem[] = [];
  cartTotals: CartTotals = { subtotal: 0, taxAmount: 0, total: 0 };
  currentUser: User | null = null;
  searchTerm = '';
  isLoadingProducts = true;
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private saleService: SaleService,
    private authService: AuthService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProducts(): void {
    this.isLoadingProducts = true;
    
    this.productService.getProducts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          this.products = products.filter(p => p.isActive);
          this.filteredProducts = this.products;
          this.isLoadingProducts = false;
        },
        error: (error) => {
          console.error('Error loading products:', error);
          this.toastr.error('Error al cargar los productos');
          this.isLoadingProducts = false;
        }
      });
  }

  searchProducts(): void {
    if (!this.searchTerm.trim()) {
      this.filteredProducts = this.products;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredProducts = this.products.filter(product =>
      product.code.toLowerCase().includes(term) ||
      product.name.toLowerCase().includes(term) ||
      (product.barcode && product.barcode.toLowerCase().includes(term))
    );
  }

  addToCart(product: Product): void {
    if (product.stock <= 0) {
      this.toastr.warning('Producto sin stock disponible');
      return;
    }

    const existingItem = this.cartItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        existingItem.quantity++;
        this.updateCartItemTotals(existingItem);
      } else {
        this.toastr.warning('Stock insuficiente');
        return;
      }
    } else {
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        subtotal: product.price,
        tax: product.taxRate,
        total: product.price * (1 + product.taxRate / 100)
      };
      
      this.cartItems.push(newItem);
    }

    this.calculateCartTotals();
    this.toastr.success(`${product.name} agregado al carrito`);
  }

  removeFromCart(index: number): void {
    this.cartItems.splice(index, 1);
    this.calculateCartTotals();
  }

  increaseQuantity(index: number): void {
    const item = this.cartItems[index];
    const product = this.products.find(p => p.id === item.productId);
    
    if (product && item.quantity < product.stock) {
      item.quantity++;
      this.updateCartItemTotals(item);
      this.calculateCartTotals();
    } else {
      this.toastr.warning('Stock insuficiente');
    }
  }

  decreaseQuantity(index: number): void {
    const item = this.cartItems[index];
    
    if (item.quantity > 1) {
      item.quantity--;
      this.updateCartItemTotals(item);
      this.calculateCartTotals();
    } else {
      this.removeFromCart(index);
    }
  }

  clearCart(): void {
    this.cartItems = [];
    this.calculateCartTotals();
  }

  private updateCartItemTotals(item: CartItem): void {
    item.subtotal = item.unitPrice * item.quantity;
    item.total = item.subtotal * (1 + item.tax / 100);
  }

  private calculateCartTotals(): void {
    this.cartTotals.subtotal = this.cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    this.cartTotals.taxAmount = this.cartItems.reduce((sum, item) => sum + (item.total - item.subtotal), 0);
    this.cartTotals.total = this.cartItems.reduce((sum, item) => sum + item.total, 0);
  }

  openPaymentDialog(): void {
    if (this.cartItems.length === 0) {
      this.toastr.warning('El carrito está vacío');
      return;
    }

    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '500px',
      data: {
        cartItems: this.cartItems,
        cartTotals: this.cartTotals,
        currentUser: this.currentUser
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.processSale(result);
      }
    });
  }

  private processSale(paymentData: any): void {
    const saleData: Omit<Sale, 'id' | 'createdAt'> = {
      invoiceNumber: this.generateInvoiceNumber(),
      customerName: paymentData.customerName,
      customerDocument: paymentData.customerDocument,
      customerEmail: paymentData.customerEmail,
      invoiceType: paymentData.invoiceType,
      items: this.cartItems,
      subtotal: this.cartTotals.subtotal,
      taxAmount: this.cartTotals.taxAmount,
      discountAmount: 0,
      total: this.cartTotals.total,
      paymentMethod: paymentData.paymentMethod,
      paymentAmount: paymentData.paymentAmount,
      change: paymentData.change,
      cashierId: this.currentUser?.id || 0,
      cashierName: this.currentUser?.name || '',
      status: 'completed'
    };

    this.saleService.createSale(saleData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sale) => {
          this.toastr.success('Venta procesada exitosamente');
          this.clearCart();
          // Aquí podrías abrir un diálogo de recibo o redirigir
        },
        error: (error) => {
          console.error('Error processing sale:', error);
          this.toastr.error('Error al procesar la venta');
        }
      });
  }

  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    return `CF-${year}${month}${day}-${random}`;
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
}