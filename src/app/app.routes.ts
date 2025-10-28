import { Routes } from '@angular/router';
import { authGuard, authWithCompanyGuard } from './core/guards/auth.guard';
import { adminGuard, adminWithCompanyGuard } from './core/guards/admin.guard';
import { companyGuard, sudoGuard, companyAdminGuard } from './core/guards/company.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  // Accounting routes (requieren compañía)
  {
    path: 'accounting/diario',
    loadComponent: () => import('./features/accounting/diario/diario.component').then(m => m.AccountingDiarioComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'accounting/mayor',
    loadComponent: () => import('./features/accounting/mayor/mayor.component').then(m => m.AccountingMayorComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'accounting/inventarios',
    loadComponent: () => import('./features/accounting/inventarios/inventarios.component').then(m => m.AccountingInventariosComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'accounting/vat/ventas',
    loadComponent: () => import('./features/accounting/vat-sales/vat-sales.component').then(m => m.AccountingVatSalesComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'accounting/vat/compras',
    loadComponent: () => import('./features/accounting/vat-purchases/vat-purchases.component').then(m => m.AccountingVatPurchasesComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'accounting/trial-balance',
    loadComponent: () => import('./features/accounting/trial-balance/trial-balance.component').then(m => m.AccountingTrialBalanceComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'pos',
    loadComponent: () => import('./features/pos/pos.component').then(m => m.PosComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authWithCompanyGuard]
  },
  {
    path: 'products',
    loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
    canActivate: [authWithCompanyGuard]
  },
  // Admin routes (requieren permisos de administración en la compañía)
  {
    path: 'admin/business-config',
    loadComponent: () => import('./features/admin/business-config/business-config.component').then(m => m.BusinessConfigComponent),
    canActivate: [companyAdminGuard]
  },
  {
    path: 'admin/categories',
    loadComponent: () => import('./features/admin/categories/categories.component').then(m => m.AdminCategoriesComponent),
    canActivate: [companyAdminGuard]
  },
  {
    path: 'admin/suppliers',
    loadComponent: () => import('./features/admin/suppliers/suppliers.component').then(m => m.AdminSuppliersComponent),
    canActivate: [companyAdminGuard]
  },
  {
    path: 'admin/cash-register',
    loadComponent: () => import('./features/admin/cash-register/cash-register.component').then(m => m.AdminCashRegisterComponent),
    canActivate: [companyAdminGuard]
  },
  {
    path: 'admin/discounts',
    loadComponent: () => import('./features/admin/discounts/discounts.component').then(m => m.AdminDiscountsComponent),
    canActivate: [companyAdminGuard]
  },
  {
    path: 'admin/inventory-alerts',
    loadComponent: () => import('./features/admin/inventory-alerts/inventory-alerts.component').then(m => m.AdminInventoryAlertsComponent),
    canActivate: [companyAdminGuard]
  },
  {
    path: 'admin/audit-logs',
    loadComponent: () => import('./features/admin/audit-logs/audit-logs.component').then(m => m.AdminAuditLogsComponent),
    canActivate: [companyAdminGuard]
  },
  {
    path: 'admin/fiscal-documents',
    loadComponent: () => import('./features/fiscal-documents/fiscal-documents.component').then(m => m.FiscalDocumentsComponent),
    canActivate: [companyAdminGuard]
  },
  // SUDO routes (solo para usuarios SUDO)
  {
    path: 'sudo/empresas-clientes',
    loadComponent: () => import('./features/sudo/empresas-clientes/empresas-clientes.component').then(m => m.EmpresasClientesComponent),
    canActivate: [sudoGuard]
  },
  {
    path: 'sudo/usuario-sudo',
    loadComponent: () => import('./features/sudo/usuario-sudo/usuario-sudo.component').then(m => m.UsuarioSudoComponent),
    canActivate: [sudoGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];