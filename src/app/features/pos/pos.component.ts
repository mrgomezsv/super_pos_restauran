import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
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

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
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
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})
export class PosComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = [];
  cartItems: CartItem[] = [];
  cartTotals: CartTotals = { subtotal: 0, taxAmount: 0, total: 0 };
  currentUser: User | null = null;
  searchTerm = '';
  selectedCategory = '';
  isLoadingProducts = true;
  currentTime = new Date();
  
  // Payment related
  selectedPaymentMethod: string | null = null;
  paymentAmount = '';
  
  // Payment methods
  paymentMethods: PaymentMethod[] = [
    { id: 'cash', name: 'Efectivo', icon: 'money' },
    { id: 'card', name: 'Tarjeta', icon: 'credit_card' },
    { id: 'transfer', name: 'Transferencia', icon: 'account_balance' }
  ];
  
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private productService: ProductService,
    private saleService: SaleService,
    private authService: AuthService,
    private dialog: MatDialog,
    private toastr: ToastrService
  ) {
    // Configurar búsqueda con debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchProducts();
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadProducts();
    this.loadCategories();
    this.updateCurrentTime();
    
    // Actualizar tiempo cada minuto
    setInterval(() => {
      this.updateCurrentTime();
    }, 60000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    // Atajos de teclado
    switch (event.key) {
      case 'F1':
        event.preventDefault();
        this.focusSearch();
        break;
      case 'F2':
        event.preventDefault();
        if (this.cartItems.length > 0) {
          this.openPaymentDialog();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.clearSearch();
        break;
    }
  }

  private updateCurrentTime(): void {
    this.currentTime = new Date();
  }

  private loadProducts(): void {
    this.isLoadingProducts = true;
    this.productService.getProducts().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (products) => {
        this.products = products;
        this.filteredProducts = products;
        this.isLoadingProducts = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.toastr.error('Error al cargar los productos');
        this.isLoadingProducts = false;
      }
    });
  }

  private loadCategories(): void {
    const categories = new Set<string>();
    this.products.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    this.categories = Array.from(categories).sort();
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filterProducts();
  }

  filterProducts(): void {
    let filtered = this.products;
    
    // Filtrar por categoría
    if (this.selectedCategory) {
      filtered = filtered.filter(product => product.category === this.selectedCategory);
    }
    
    // Filtrar por búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.code.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        (product.barcode && product.barcode.toLowerCase().includes(term)) ||
        (product.description && product.description.toLowerCase().includes(term))
      );
    }
    
    this.filteredProducts = filtered;
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchTerm);
  }

  searchProducts(): void {
    this.filterProducts();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.filterProducts();
  }

  focusSearch(): void {
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }

  getProductIcon(category: string): string {
    const iconMap: { [key: string]: string } = {
      'Bebidas': 'local_drink',
      'Panadería': 'bakery_dining',
      'Lácteos': 'agriculture',
      'Carnes': 'set_meal',
      'Frutas': 'apple',
      'Verduras': 'eco',
      'Limpieza': 'cleaning_services',
      'Higiene': 'soap',
      'Default': 'inventory_2'
    };
    return iconMap[category] || iconMap['Default'];
  }

  getProductCategory(productId: number): string {
    const product = this.products.find(p => p.id === productId);
    return product?.category || 'Default';
  }

  getStockClass(stock: number, minStock: number): string {
    if (stock <= 0) return 'stock-out';
    if (stock <= minStock) return 'stock-low';
    if (stock <= minStock * 2) return 'stock-medium';
    return 'stock-high';
  }

  getStockIcon(stock: number, minStock: number): string {
    if (stock <= 0) return 'error_outline';
    if (stock <= minStock) return 'warning';
    return 'check_circle';
  }

  addToCart(product: Product): void {
    if (product.stock <= 0) {
      this.toastr.warning('Producto sin stock disponible');
      return;
    }

    const existingItem = this.cartItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        this.toastr.warning('No hay suficiente stock disponible');
        return;
      }
      existingItem.quantity += 1;
      existingItem.total = existingItem.unitPrice * existingItem.quantity;
    } else {
      const newItem: CartItem = {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
        total: product.price,
        tax: 13, // 13% de impuesto
        subtotal: product.price
      };
      this.cartItems.push(newItem);
    }

    this.calculateCartTotals();
    this.toastr.success(`${product.name} agregado al carrito`);
  }

  increaseQuantity(index: number): void {
    const item = this.cartItems[index];
    const product = this.products.find(p => p.id === item.productId);
    
    if (product && item.quantity < product.stock) {
      item.quantity += 1;
      item.total = item.unitPrice * item.quantity;
      this.calculateCartTotals();
    } else {
      this.toastr.warning('No hay suficiente stock disponible');
    }
  }

  decreaseQuantity(index: number): void {
    const item = this.cartItems[index];
    if (item.quantity > 1) {
      item.quantity -= 1;
      item.total = item.unitPrice * item.quantity;
      this.calculateCartTotals();
    }
  }

  updateItemQuantity(index: number, quantity: number): void {
    if (quantity < 1) {
      this.removeFromCart(index);
      return;
    }

    const item = this.cartItems[index];
    const product = this.products.find(p => p.id === item.productId);
    
    if (product && quantity <= product.stock) {
      item.quantity = quantity;
      item.total = item.unitPrice * item.quantity;
      this.calculateCartTotals();
    } else {
      this.toastr.warning('No hay suficiente stock disponible');
      // Restaurar cantidad anterior
      item.quantity = Math.min(quantity, product?.stock || 1);
      item.total = item.unitPrice * item.quantity;
      this.calculateCartTotals();
    }
  }

  removeFromCart(index: number): void {
    this.cartItems.splice(index, 1);
    this.calculateCartTotals();
  }

  clearCart(): void {
    this.cartItems = [];
    this.calculateCartTotals();
    this.toastr.info('Carrito limpiado');
  }

  private calculateCartTotals(): void {
    const subtotal = this.cartItems.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = this.cartItems.reduce((sum, item) => sum + (item.total * (item.tax / 100)), 0);
    const total = subtotal + taxAmount;

    this.cartTotals = {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  // Payment methods
  selectPaymentMethod(method: string): void {
    this.selectedPaymentMethod = method;
    this.paymentAmount = '';
  }

  addToPayment(value: string): void {
    if (!this.selectedPaymentMethod) {
      this.toastr.warning('Selecciona un método de pago primero');
      return;
    }

    if (value === '.' && this.paymentAmount.includes('.')) {
      return; // No permitir múltiples puntos decimales
    }

    this.paymentAmount += value;
  }

  clearPayment(): void {
    this.paymentAmount = '';
  }

  getPaymentAmount(): number {
    return parseFloat(this.paymentAmount) || 0;
  }

  setExactAmount(): void {
    this.paymentAmount = this.cartTotals.total.toString();
  }

  addDiscount(): void {
    // TODO: Implementar descuentos
    this.toastr.info('Funcionalidad de descuentos próximamente');
  }

  printReceipt(): void {
    // TODO: Implementar impresión
    this.toastr.info('Funcionalidad de impresión próximamente');
  }

  processPayment(): void {
    if (!this.selectedPaymentMethod) {
      this.toastr.warning('Selecciona un método de pago');
      return;
    }

    const amount = parseFloat(this.paymentAmount);
    if (isNaN(amount) || amount < this.cartTotals.total) {
      this.toastr.warning('El monto debe ser mayor o igual al total');
      return;
    }

    const change = amount - this.cartTotals.total;
    
    // Crear la venta
    const sale: Sale = {
      id: 0, // Se asignará en el backend
      invoiceNumber: '', // Se generará en el backend
      invoiceType: 'consumidor_final',
      items: this.cartItems,
      subtotal: this.cartTotals.subtotal,
      taxAmount: this.cartTotals.taxAmount,
      discountAmount: 0,
      total: this.cartTotals.total,
      paymentMethod: this.selectedPaymentMethod as 'cash' | 'card' | 'transfer',
      paymentAmount: amount,
      change: change,
      cashierId: this.currentUser?.id || 0,
      cashierName: this.currentUser?.name || '',
      createdAt: new Date(),
      status: 'completed'
    };

    this.saleService.createSale(sale).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.toastr.success(`Venta procesada exitosamente. Cambio: $${change.toFixed(2)}`);
        this.clearCart();
        this.clearPayment();
        this.selectedPaymentMethod = null;
        
        // Mostrar resumen de la venta
        this.showSaleSummary(response, change);
      },
      error: (error) => {
        console.error('Error processing sale:', error);
        this.toastr.error('Error al procesar la venta');
      }
    });
  }

  private showSaleSummary(sale: any, change: number): void {
    const summary = `
      Venta #${sale.id}
      Total: $${sale.total}
      Pagado: $${sale.amountPaid}
      Cambio: $${change.toFixed(2)}
      Método: ${this.getPaymentMethodName(sale.paymentMethod)}
    `;
    
    // TODO: Mostrar en un modal o imprimir ticket
    console.log('Sale Summary:', summary);
  }

  private getPaymentMethodName(method: string): string {
    const paymentMethod = this.paymentMethods.find(pm => pm.id === method);
    return paymentMethod?.name || method;
  }

  openPaymentDialog(): void {
    if (this.cartItems.length === 0) {
      this.toastr.warning('Agrega productos al carrito primero');
      return;
    }

    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '500px',
      data: {
        total: this.cartTotals.total,
        items: this.cartItems
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Procesar pago desde el diálogo
        this.processPaymentFromDialog(result);
      }
    });
  }

  private processPaymentFromDialog(paymentData: any): void {
    const sale: Sale = {
      id: 0, // Se asignará en el backend
      invoiceNumber: '', // Se generará en el backend
      invoiceType: 'consumidor_final',
      items: this.cartItems,
      subtotal: this.cartTotals.subtotal,
      taxAmount: this.cartTotals.taxAmount,
      discountAmount: 0,
      total: this.cartTotals.total,
      paymentMethod: paymentData.method as 'cash' | 'card' | 'transfer',
      paymentAmount: paymentData.amount,
      change: paymentData.change,
      cashierId: this.currentUser?.id || 0,
      cashierName: this.currentUser?.name || '',
      createdAt: new Date(),
      status: 'completed'
    };

    this.saleService.createSale(sale).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.toastr.success('Venta procesada exitosamente');
        this.clearCart();
      },
      error: (error) => {
        console.error('Error processing sale:', error);
        this.toastr.error('Error al procesar la venta');
      }
    });
  }
}