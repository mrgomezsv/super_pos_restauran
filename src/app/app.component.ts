import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { AuthService } from './core/services/auth.service';
import { User } from './core/models/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatListModule
  ],
  template: `
    <div class="app-container">
      <mat-toolbar color="primary" *ngIf="isLoggedIn">
        <button mat-icon-button (click)="sidenav.toggle()">
          <mat-icon>menu</mat-icon>
        </button>
        
        <span class="app-title">Super POS</span>
        
        <span class="spacer"></span>
        
        <button mat-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
          {{ currentUser?.name }}
          <mat-icon>arrow_drop_down</mat-icon>
        </button>
        
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="goToDashboard()">
            <mat-icon>dashboard</mat-icon>
            Dashboard
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            Cerrar Sesión
          </button>
        </mat-menu>
      </mat-toolbar>

      <mat-sidenav-container class="sidenav-container" *ngIf="isLoggedIn">
        <mat-sidenav #sidenav mode="side" opened class="sidenav">
          <mat-nav-list>
            <a mat-list-item routerLink="/pos" routerLinkActive="active">
              <mat-icon matListItemIcon>point_of_sale</mat-icon>
              <span matListItemTitle>Punto de Venta</span>
            </a>
            
            <a mat-list-item routerLink="/products" routerLinkActive="active">
              <mat-icon matListItemIcon>inventory</mat-icon>
              <span matListItemTitle>Productos</span>
            </a>
            
            <a mat-list-item routerLink="/reports" routerLinkActive="active">
              <mat-icon matListItemIcon>assessment</mat-icon>
              <span matListItemTitle>Reportes</span>
            </a>
            
            <a mat-list-item routerLink="/users" routerLinkActive="active" *ngIf="currentUser?.role === 'admin'">
              <mat-icon matListItemIcon>people</mat-icon>
              <span matListItemTitle>Usuarios</span>
            </a>
          </mat-nav-list>
        </mat-sidenav>
        
        <mat-sidenav-content class="main-content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>

      <div class="auth-content" *ngIf="!isLoggedIn">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .app-title {
      margin-left: 16px;
      font-weight: 500;
    }

    .sidenav-container {
      flex: 1;
    }

    .sidenav {
      width: 250px;
    }

    .main-content {
      padding: 20px;
      background-color: #f5f5f5;
      min-height: calc(100vh - 64px);
    }

    .auth-content {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .active {
      background-color: rgba(0, 0, 0, 0.04);
    }

    mat-nav-list a {
      text-decoration: none;
      color: inherit;
    }
  `]
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isLoggedIn = isAuth;
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
