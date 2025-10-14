import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { Router, RouterOutlet, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from './core/services/auth.service';
import { CompanyContextService, AvailableCompany, CompanyInfo } from './core/services/company-context.service';
import { User } from './core/models/user.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    MatListModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  isLoggedIn = false;
  currentUser: User | null = null;
  isUserMenuOpen = false;
  isLoginRoute = false;
  
  // Propiedades del selector de compañía
  availableCompanies: AvailableCompany[] = [];
  selectedCompany: CompanyInfo | null = null;
  isCompanySelectorOpen = false;

  constructor(
    private authService: AuthService,
    private companyContextService: CompanyContextService,
    private router: Router
  ) {}

  ngOnInit() {
    // Estado inicial de la ruta actual
    this.isLoginRoute = this.router.url.startsWith('/login');

    // Escuchar cambios de ruta para ocultar sidebar/header en /login
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isLoginRoute = event.urlAfterRedirects.startsWith('/login');
        // Toggle class on body for CSS hooks if needed
        if (this.isLoginRoute) {
          document.body.classList.add('login-route');
        } else {
          document.body.classList.remove('login-route');
        }
      }
    });

    this.authService.isAuthenticated$.subscribe(isAuth => {
      this.isLoggedIn = isAuth;
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    // Suscribirse a los cambios de contexto de compañía
    this.companyContextService.currentContext$.subscribe(context => {
      this.selectedCompany = context?.company || null;
    });

    // Suscribirse a las compañías disponibles
    this.companyContextService.availableCompanies$.subscribe(companies => {
      this.availableCompanies = companies;
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  // Métodos para selector de compañía
  toggleCompanySelector() {
    this.isCompanySelectorOpen = !this.isCompanySelectorOpen;
  }

  closeCompanySelector() {
    this.isCompanySelectorOpen = false;
  }

  selectCompany(company: AvailableCompany) {
    this.companyContextService.switchToCompany(company.id).subscribe({
      next: (context) => {
        console.log('Contexto de compañía cambiado:', context);
        this.closeCompanySelector();
        // Opcional: mostrar mensaje de éxito o recargar datos
      },
      error: (error) => {
        console.error('Error al cambiar compañía:', error);
        // Opcional: mostrar mensaje de error
      }
    });
  }

  canChangeCompany(): boolean {
    return this.authService.canManageMultipleCompanies();
  }

  getCompanyDisplayName(company: CompanyInfo | null): string {
    if (!company) return 'Seleccionar compañía';
    return company.nombre;
  }

  getCompanyStatusColor(estado: string): string {
    switch (estado) {
      case 'activa': return '#4caf50';
      case 'inactiva': return '#f44336';
      case 'suspendida': return '#ff9800';
      default: return '#757575';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const userInfo = target.closest('.user-info');
    const userPopover = target.closest('.user-popover');
    const companySelector = target.closest('.company-selector');
    const companyPopover = target.closest('.company-popover');
    
    // Cerrar menú de usuario
    if (!userInfo && !userPopover) {
      this.closeUserMenu();
    }

    // Cerrar selector de compañía
    if (!companySelector && !companyPopover) {
      this.closeCompanySelector();
    }
  }
}