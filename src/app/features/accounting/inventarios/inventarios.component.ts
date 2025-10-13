import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../../core/services/accounting.service';
import { InventoryMovement, Product } from '../../../core/models/accounting.models';

@Component({
  selector: 'app-accounting-inventarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventarios.component.html',
  styleUrls: ['./inventarios.component.scss']
})
export class AccountingInventariosComponent implements OnInit {
  movements: InventoryMovement[] = [];
  products: Product[] = [];
  loading = false;
  error: string | null = null;

  // Filtros
  filters = {
    productId: '',
    startDate: '',
    endDate: '',
    movementType: ''
  };

  // Totales
  totalEntries = 0;
  totalExits = 0;
  totalCost = 0;

  constructor(private accountingService: AccountingService) {}

  ngOnInit(): void {
    this.loadInventoryMovements();
    this.loadProducts();
  }

  loadInventoryMovements(): void {
    this.loading = true;
    this.error = null;

    this.accountingService.getInventoryMovements(this.filters).subscribe({
      next: (data) => {
        this.movements = data.movements || [];
        this.calculateTotals();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading inventory movements:', error);
        this.error = 'Error al cargar movimientos de inventario';
        this.loading = false;
      }
    });
  }

  loadProducts(): void {
    this.accountingService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
      },
      error: (error) => {
        console.error('Error loading products:', error);
      }
    });
  }

  calculateTotals(): void {
    this.totalEntries = this.movements
      .filter(m => m.movementType === 'entrada')
      .reduce((sum, m) => sum + m.quantity, 0);

    this.totalExits = this.movements
      .filter(m => m.movementType === 'salida')
      .reduce((sum, m) => sum + m.quantity, 0);

    this.totalCost = this.movements
      .reduce((sum, m) => sum + m.totalCost, 0);
  }

  applyFilters(): void {
    this.loadInventoryMovements();
  }

  clearFilters(): void {
    this.filters = {
      productId: '',
      startDate: '',
      endDate: '',
      movementType: ''
    };
    this.loadInventoryMovements();
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('es-SV');
  }

  getMovementTypeLabel(type: string): string {
    switch (type) {
      case 'entrada': return 'Entrada';
      case 'salida': return 'Salida';
      default: return type;
    }
  }

  getMovementTypeBadgeClass(type: string): string {
    switch (type) {
      case 'entrada': return 'badge-success';
      case 'salida': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getProductName(productId: number): string {
    const product = this.products.find(p => p.id === productId);
    return product ? product.name : `Producto ${productId}`;
  }
}


