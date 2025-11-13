import { Routes } from '@angular/router';
import { authGuard, authWithCompanyGuard } from './core/guards/auth.guard';
import { companyGuard, sudoGuard } from './core/guards/company.guard';
import { noCashierGuard } from './core/guards/no-cashier.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
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
    path: 'proveedores',
    loadComponent: () => import('./features/proveedores/proveedores.component').then(m => m.ProveedoresComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'users',
    loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent),
    canActivate: [companyGuard, noCashierGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent),
    canActivate: [authWithCompanyGuard, noCashierGuard]
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./features/configuracion/business-config.component').then(m => m.BusinessConfigComponent),
    canActivate: [companyGuard, noCashierGuard]
  },
  {
    path: 'recetas',
    loadComponent: () => import('./features/recetas/recetas.component').then(m => m.RecetasComponent),
    canActivate: [companyGuard]
  },
  {
    path: 'produccion',
    loadComponent: () => import('./features/produccion/produccion.component').then(m => m.ProduccionComponent),
    canActivate: [companyGuard]
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
    path: 'sudo/create-users',
    loadComponent: () => import('./features/sudo/create-users/create-users.component').then(m => m.CreateUsersComponent),
    canActivate: [sudoGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];