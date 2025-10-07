import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

import { SaleService } from '../../core/services/sale.service';
import { AuthService } from '../../core/services/auth.service';
import { SaleSummary } from '../../core/models/sale.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatGridListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  salesSummary: SaleSummary | null = null;
  currentUser: User | null = null;
  isLoading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private saleService: SaleService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadSalesSummary();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSalesSummary(): void {
    this.isLoading = true;
    
    this.saleService.getSalesSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.salesSummary = summary;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading sales summary:', error);
          this.isLoading = false;
        }
      });
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
}