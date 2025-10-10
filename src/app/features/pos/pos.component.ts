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
import { NotificationService } from '../../core/services/notification.service';
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
    MatTooltipModule,
    PaymentDialogComponent
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
  showPaymentDialog = false;
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
    private toastr: ToastrService,
    private notificationService: NotificationService
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
    // Atajos de teclado mejorados
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
      case 'F3':
        event.preventDefault();
        this.clearCart();
        break;
      case 'F4':
        event.preventDefault();
        this.setExactAmount();
        break;
      case 'Escape':
        event.preventDefault();
        if (this.searchTerm) {
          this.clearSearch();
        } else if (this.cartItems.length > 0) {
          this.clearCart();
        }
        break;
      case 'Delete':
        // Si hay productos en el carrito, eliminar el último
        if (this.cartItems.length > 0 && !event.ctrlKey) {
          event.preventDefault();
          this.removeFromCart(this.cartItems.length - 1);
        }
        break;
      case 'Enter':
        // Si no hay focus en input, procesar pago
        if (document.activeElement?.tagName !== 'INPUT' && this.cartItems.length > 0) {
          event.preventDefault();
          this.openPaymentDialog();
        }
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

  // Búsqueda rápida por código de barras (enter)
  onSearchKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const searchTerm = this.searchTerm.trim();
      
      // Si parece ser un código de barras (solo números y más de 8 dígitos)
      if (/^\d{8,}$/.test(searchTerm)) {
        this.searchByBarcode(searchTerm);
      } else {
        this.searchProducts();
      }
    }
  }

  private searchByBarcode(barcode: string): void {
    // Simular búsqueda por código de barras
    const product = this.products.find(p => p.barcode === barcode);
    if (product) {
      this.addToCart(product);
      this.searchTerm = '';
    } else {
      this.notificationService.barcodeNotFound(barcode);
      this.playSound('error');
    }
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
      this.notificationService.productOutOfStock(product.name);
      this.playSound('error');
      return;
    }

    const existingItem = this.cartItems.find(item => item.productId === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        this.notificationService.insufficientStock(product.name);
        this.playSound('error');
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
    this.notificationService.productAdded(product.name);
    this.playSound('success');
    this.addHapticFeedback();
  }

  increaseQuantity(index: number): void {
    const item = this.cartItems[index];
    const product = this.products.find(p => p.id === item.productId);
    
    if (product && item.quantity < product.stock) {
      item.quantity += 1;
      item.total = item.unitPrice * item.quantity;
      this.calculateCartTotals();
      this.playSound('click');
    } else {
      this.toastr.warning('No hay suficiente stock disponible');
      this.playSound('error');
    }
  }

  decreaseQuantity(index: number): void {
    const item = this.cartItems[index];
    if (item.quantity > 1) {
      item.quantity -= 1;
      item.total = item.unitPrice * item.quantity;
      this.calculateCartTotals();
      this.playSound('click');
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
    this.playSound('click');
  }

  clearCart(): void {
    this.cartItems = [];
    this.calculateCartTotals();
    this.notificationService.cartCleared();
  }

  private calculateCartTotals(): void {
    if (this.cartItems.length === 0) {
      this.cartTotals = { subtotal: 0, taxAmount: 0, total: 0 };
      return;
    }

    const subtotal = this.cartItems.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      return sum + itemTotal;
    }, 0);

    const taxAmount = this.cartItems.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const itemTax = itemTotal * (item.tax / 100);
      return sum + itemTax;
    }, 0);

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
      this.playSound('error');
      return;
    }

    if (value === '.' && this.paymentAmount.includes('.')) {
      this.playSound('error');
      return; // No permitir múltiples puntos decimales
    }

    this.paymentAmount += value;
    this.playSound('click');
  }

  clearPayment(): void {
    this.paymentAmount = '';
    this.playSound('click');
  }

  getPaymentAmount(): number {
    return parseFloat(this.paymentAmount) || 0;
  }

  // Efectos de sonido mejorados con configuración
  private playSound(type: 'success' | 'error' | 'click' | 'payment'): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Configuraciones de sonido mejoradas
      const soundConfig = {
        success: {
          frequency: [800, 1200],
          duration: 0.15,
          volume: 0.08,
          type: 'sine'
        },
        error: {
          frequency: [300, 150],
          duration: 0.25,
          volume: 0.1,
          type: 'square'
        },
        click: {
          frequency: [1000],
          duration: 0.08,
          volume: 0.06,
          type: 'sine'
        },
        payment: {
          frequency: [600, 800, 1000],
          duration: 0.3,
          volume: 0.1,
          type: 'sine'
        }
      };
      
      const config = soundConfig[type];
      oscillator.type = config.type as OscillatorType;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(config.volume, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);
      
      if (config.frequency.length === 1) {
        oscillator.frequency.setValueAtTime(config.frequency[0], audioContext.currentTime);
      } else {
        oscillator.frequency.setValueAtTime(config.frequency[0], audioContext.currentTime);
        for (let i = 1; i < config.frequency.length; i++) {
          oscillator.frequency.exponentialRampToValueAtTime(
            config.frequency[i], 
            audioContext.currentTime + (config.duration / config.frequency.length) * i
          );
        }
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);
    } catch (error) {
      console.debug('Audio not supported');
    }
  }

  // Feedback táctil para dispositivos móviles
  private addHapticFeedback(): void {
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(50); // Vibración corta de 50ms
      }
    } catch (error) {
      // Silenciar errores de vibración
      console.debug('Vibration not supported');
    }
  }

  setExactAmount(): void {
    if (this.cartItems.length === 0) {
      this.notificationService.warning('Agrega productos al carrito primero');
      this.playSound('error');
      return;
    }
    
    // Abrir diálogo de pago directamente
    this.openPaymentDialog();
    this.playSound('click');
  }

  addDiscount(): void {
    if (this.cartItems.length === 0) {
      this.notificationService.warning('Agrega productos al carrito primero');
      this.playSound('error');
      return;
    }
    
    // Solicitar porcentaje de descuento
    const discount = prompt('Ingrese el porcentaje de descuento (0-100):');
    
    if (discount === null) {
      return; // Usuario canceló
    }
    
    const discountValue = parseFloat(discount);
    
    if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
      this.notificationService.error('Porcentaje de descuento inválido');
      this.playSound('error');
      return;
    }
    
    // Aplicar descuento a cada item
    const discountMultiplier = 1 - (discountValue / 100);
    this.cartItems.forEach(item => {
      item.unitPrice = item.unitPrice * discountMultiplier;
      item.total = item.unitPrice * item.quantity;
    });
    
    this.calculateCartTotals();
    this.notificationService.success(`Descuento del ${discountValue}% aplicado`);
    this.playSound('success');
  }

  printReceipt(): void {
    if (this.cartItems.length === 0) {
      this.notificationService.warning('No hay productos en el carrito');
      this.playSound('error');
      return;
    }
    
    // Generar contenido del recibo
    const receiptContent = this.generateReceiptContent();
    
    // Abrir ventana de impresión
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Esperar a que cargue y luego imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      
      this.notificationService.info('Preparando impresión...');
      this.playSound('click');
    } else {
      this.notificationService.error('No se pudo abrir la ventana de impresión');
      this.playSound('error');
    }
  }

  private generateReceiptContent(): string {
    const date = new Date().toLocaleString('es-ES');
    const items = this.cartItems.map(item => `
      <tr>
        <td>${item.productName}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">$${item.unitPrice.toFixed(2)}</td>
        <td style="text-align: right;">$${item.total.toFixed(2)}</td>
      </tr>
    `).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo - Super POS</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            max-width: 300px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          th {
            border-bottom: 1px solid #000;
            padding: 5px 0;
            text-align: left;
            font-size: 12px;
          }
          td {
            padding: 5px 0;
            font-size: 12px;
          }
          .totals {
            border-top: 2px dashed #000;
            padding-top: 10px;
            margin-top: 15px;
          }
          .totals div {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
          }
          .total-row {
            font-weight: bold;
            font-size: 14px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #000;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            border-top: 2px dashed #000;
            padding-top: 10px;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SUPER POS</h1>
          <p>Sistema de Punto de Ventas</p>
          <p>Fecha: ${date}</p>
          <p>Cajero: ${this.currentUser?.name || 'N/A'}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align: center;">Cant.</th>
              <th style="text-align: right;">Precio</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>
        
        <div class="totals">
          <div>
            <span>Subtotal:</span>
            <span>$${this.cartTotals.subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span>Impuestos:</span>
            <span>$${this.cartTotals.taxAmount.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>TOTAL:</span>
            <span>$${this.cartTotals.total.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>¡Gracias por su compra!</p>
          <p>Vuelva pronto</p>
        </div>
      </body>
      </html>
    `;
  }

  processPayment(): void {
    if (!this.selectedPaymentMethod) {
      this.toastr.warning('Selecciona un método de pago');
      this.playSound('error');
      return;
    }

    const amount = parseFloat(this.paymentAmount);
    if (isNaN(amount) || amount < this.cartTotals.total) {
      this.toastr.warning('El monto debe ser mayor o igual al total');
      this.playSound('error');
      return;
    }

    const change = amount - this.cartTotals.total;
    this.playSound('payment');
    
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

    this.showPaymentDialog = true;
  }

  closePaymentDialog(result?: any): void {
    this.showPaymentDialog = false;
    if (result) {
      this.processPaymentFromDialog(result);
    }
  }

  private processPaymentFromDialog(paymentData: any): void {
    const sale: Sale = {
      id: 0, // Se asignará en el backend
      invoiceNumber: '', // Se generará en el backend
      invoiceType: paymentData.invoiceType || 'consumidor_final',
      customerName: paymentData.customerName,
      customerDocument: paymentData.customerDocument,
      customerEmail: paymentData.customerEmail,
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
        this.notificationService.success('Venta procesada exitosamente');
        this.playSound('payment');
        this.addHapticFeedback();
        
        // Mostrar información del cambio si es efectivo
        if (paymentData.method === 'cash' && paymentData.change > 0) {
          this.notificationService.info(`Cambio: $${paymentData.change.toFixed(2)}`);
        }
        
        this.clearCart();
        this.loadProducts(); // Recargar productos para actualizar stock
      },
      error: (error) => {
        console.error('Error processing sale:', error);
        this.notificationService.error('Error al procesar la venta');
        this.playSound('error');
      }
    });
  }
}