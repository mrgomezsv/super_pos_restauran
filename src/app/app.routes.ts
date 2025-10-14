import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  // Accounting routes
  {
    path: 'accounting/diario',
    loadComponent: () => import('./features/accounting/diario/diario.component').then(m => m.AccountingDiarioComponent),
    canActivate: [authGuard]
  },
  {
    path: 'accounting/mayor',
    loadComponent: () => import('./features/accounting/mayor/mayor.component').then(m => m.AccountingMayorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'accounting/inventarios',
    loadComponent: () => import('./features/accounting/inventarios/inventarios.component').then(m => m.AccountingInventariosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'accounting/vat/ventas',
    loadComponent: () => import('./features/accounting/vat-sales/vat-sales.component').then(m => m.AccountingVatSalesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'accounting/vat/compras',
    loadComponent: () => import('./features/accounting/vat-purchases/vat-purchases.component').then(m => m.AccountingVatPurchasesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'accounting/trial-balance',
    loadComponent: () => import('./features/accounting/trial-balance/trial-balance.component').then(m => m.AccountingTrialBalanceComponent),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'pos',
    loadComponent: () => import('./features/pos/pos.component').then(m => m.PosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
    canActivate: [authGuard]
  },
  // Admin routes
  {
    path: 'admin/business-config',
    loadComponent: () => import('./features/admin/business-config/business-config.component').then(m => m.BusinessConfigComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'admin/fiscal-documents',
    loadComponent: () => import('./features/fiscal-documents/fiscal-documents.component').then(m => m.FiscalDocumentsComponent),
    canActivate: [adminGuard]
  },
  // SUDO routes
  {
    path: 'sudo/empresas-clientes',
    loadComponent: () => import('./features/sudo/empresas-clientes/empresas-clientes.component').then(m => m.EmpresasClientesComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'sudo/usuario-sudo',
    loadComponent: () => import('./features/sudo/usuario-sudo/usuario-sudo.component').then(m => m.UsuarioSudoComponent),
    canActivate: [adminGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];