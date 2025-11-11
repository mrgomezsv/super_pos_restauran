import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

interface DashboardMetrics {
  period: string;
  periodStart: string;
  periodEnd: string;
  salesMetrics: {
    totalSales: number;
    totalRevenue: number;
    totalTax: number;
    averageSale: number;
  };
  inventoryMetrics: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    inventoryValue: number;
  };
  dailySales: Array<{
    date: string;
    amount: number;
  }>;
  topProducts: Array<{
    productName: string;
    totalQuantity: number;
    totalAmount: number;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    icon: string;
  }>;
}

@Component({
    selector: 'app-dashboard',
    imports: [
        CommonModule,
        MatCardModule,
        MatGridListModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatButtonModule,
        MatSelectModule,
        MatFormFieldModule,
        MatChipsModule,
        MatTableModule,
        MatTooltipModule
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly api = `${environment.apiUrl}/dashboard/metrics`;
  
  metrics: DashboardMetrics | null = null;
  currentUser: User | null = null;
  isLoading = true;
  selectedPeriod = 'today';
  private destroy$ = new Subject<void>();

  displayedColumns = ['position', 'productName', 'totalQuantity', 'totalAmount'];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    
    // Esperar a que la autenticación esté completamente lista antes de cargar métricas
    // Esto evita errores 401 cuando el token aún no está disponible después del login
    const isCurrentlyAuth = this.authService.isAuthenticated();
    
    if (isCurrentlyAuth && this.authService.getToken()) {
      // Si ya está autenticado (p.ej. recarga de página), cargar métricas inmediatamente
      this.loadMetrics();
    } else {
      // Si no está autenticado todavía, esperar a que se complete el login
      this.authService.isAuthenticated$.pipe(
        takeUntil(this.destroy$),
        filter(isAuth => isAuth === true),
        take(1)
      ).subscribe(() => {
        // Verificar que el token esté disponible antes de hacer la petición
        // Usar un pequeño delay y verificación para asegurar sincronización
        const checkToken = () => {
          const token = this.authService.getToken();
          if (token) {
            this.loadMetrics();
          } else {
            // Si aún no hay token, esperar un poco más
            setTimeout(checkToken, 50);
          }
        };
        setTimeout(checkToken, 100);
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMetrics(): void {
    this.isLoading = true;
    
    this.http.get<DashboardMetrics>(this.api, { 
      params: { period: this.selectedPeriod } 
    }).subscribe({
      next: (data) => {
        this.metrics = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error cargando métricas:', error);
        this.toastr.error('Error al cargar métricas del dashboard');
        this.isLoading = false;
      }
    });
  }

  onPeriodChange(): void {
    this.loadMetrics();
  }

  refreshMetrics(): void {
    this.loadMetrics();
  }

  goToPOS(): void {
    this.router.navigate(['/pos']);
  }

  goToProducts(): void {
    this.router.navigate(['/products']);
  }

  goToReports(): void {
    this.router.navigate(['/reports']);
  }

  goToUsers(): void {
    this.router.navigate(['/users']);
  }

  getCurrentDate(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return today.toLocaleDateString('es-ES', options);
  }

  getRoleIcon(): string {
    if (!this.currentUser) return '👤';
    
    switch (this.currentUser.role) {
      case 'sudo':
        return '🔧';
      case 'admin':
        return '👑';
      case 'manager':
        return '👔';
      case 'cashier':
        return '💰';
      default:
        return '👤';
    }
  }

  getRoleText(): string {
    if (!this.currentUser) return 'Usuario';
    
    switch (this.currentUser.role) {
      case 'sudo':
        return 'Super Administrador';
      case 'admin':
        return 'Administrador';
      case 'manager':
        return 'Gerente';
      case 'cashier':
        return 'Cajero';
      default:
        return 'Usuario';
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getAlertColor(type: string): string {
    switch (type) {
      case 'error': return 'warn';
      case 'warning': return 'accent';
      case 'info': return 'primary';
      default: return 'primary';
    }
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  getPeriodLabel(period: string): string {
    switch (period) {
      case 'today': return 'Hoy';
      case 'week': return 'Última Semana';
      case 'month': return 'Último Mes';
      default: return 'Hoy';
    }
  }

  getBarHeight(amount: number, allAmounts: Array<{amount: number}>): number {
    if (!allAmounts.length) return 0;
    const maxAmount = Math.max(...allAmounts.map(d => d.amount));
    return maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}