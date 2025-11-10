import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CompanyContextService } from '../services/company-context.service';

/**
 * Guard básico de administrador
 * Verifica que el usuario sea administrador
 */
export const adminGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && (authService.isAdmin() || authService.isSudo())) {
    return true;
  }

  router.navigate(['/pos']);
  return false;
};

/**
 * Guard de administrador con verificación de compañía
 * Verifica que el usuario sea admin y tenga permisos en la compañía actual
 */
export const adminWithCompanyGuard = () => {
  const authService = inject(AuthService);
  const companyContextService = inject(CompanyContextService);
  const router = inject(Router);

  // Verificar autenticación
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // SUDO siempre tiene acceso
  if (authService.isSudo()) {
    return true;
  }

  // Verificar si es admin
  if (!authService.isAdmin()) {
    router.navigate(['/pos']);
    return false;
  }

  // Verificar que tenga compañía asignada
  if (!authService.hasCompany()) {
    router.navigate(['/login']);
    return false;
  }

  // Verificar permisos específicos de administración en la compañía
  if (!companyContextService.hasPermission('company.manage')) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
