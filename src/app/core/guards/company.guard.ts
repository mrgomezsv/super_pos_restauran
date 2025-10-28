import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { CompanyContextService } from '../services/company-context.service';

/**
 * Guard para verificar que el usuario tenga acceso a una compañía
 * y que haya seleccionado una compañía válida para trabajar
 */
// Modo desarrollo
const DEVELOPMENT_MODE = false; // Cambiar a false en producción

export const companyGuard = () => {
  const authService = inject(AuthService);
  const companyContextService = inject(CompanyContextService);
  const router = inject(Router);

  // En desarrollo, permitir acceso
  if (DEVELOPMENT_MODE) {
    console.warn('⚠️ DEVELOPMENT MODE: Acceso sin verificación de compañía');
    return true;
  }

  // Primero verificar autenticación
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Para usuarios SUDO, siempre permitir acceso pero verificar selección de compañía
  if (authService.isSudo()) {
    const hasCompanySelected = companyContextService.hasCompanySelected();
    if (!hasCompanySelected) {
      // Redirigir a una página de selección de compañía o dashboard
      router.navigate(['/dashboard']); // Asumiendo que el dashboard maneja la selección
      return false;
    }
    return true;
  }

  // Para usuarios normales, verificar que tengan una compañía asignada
  if (!authService.hasCompany()) {
    console.error('Usuario sin compañía asignada');
    router.navigate(['/login']);
    return false;
  }

  // Verificar que el contexto esté inicializado
  const context = companyContextService.getCurrentContext();
  if (!context || !context.company) {
    // Intentar inicializar contexto
    const userCompanyId = authService.getUserCompanyId();
    if (userCompanyId) {
      return companyContextService.switchToCompany(userCompanyId).pipe(
        map(() => true),
        catchError((error) => {
          console.error('Error al inicializar contexto de compañía:', error);
          router.navigate(['/login']);
          return of(false);
        })
      );
    } else {
      router.navigate(['/login']);
      return false;
    }
  }

  return true;
};

/**
 * Guard que requiere que el usuario tenga permisos específicos en la compañía actual
 */
export const companyPermissionGuard = (requiredPermissions: string[]) => {
  return () => {
    const authService = inject(AuthService);
    const companyContextService = inject(CompanyContextService);
    const router = inject(Router);

    // Verificar autenticación primero
    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    // Verificar permisos
    const hasPermission = companyContextService.canAccess(requiredPermissions);
    if (!hasPermission) {
      // Redirigir a página sin permisos o dashboard
      router.navigate(['/dashboard']);
      return false;
    }

    return true;
  };
};

/**
 * Guard específico para funciones administrativas de compañía
 */
export const companyAdminGuard = () => {
  const authService = inject(AuthService);
  const companyContextService = inject(CompanyContextService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Verificar si es SUDO o admin de compañía
  if (authService.isSudo()) {
    return true;
  }

  if (authService.isAdmin() && companyContextService.hasPermission('company.manage')) {
    return true;
  }

  router.navigate(['/dashboard']);
  return false;
};

/**
 * Guard para operaciones que requieren ser SUDO
 */
export const sudoGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isSudo()) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};

/**
 * Guard que verifica límites de suscripción
 */
export const subscriptionLimitGuard = (limitType: 'users' | 'products' | 'sales') => {
  return () => {
    const companyContextService = inject(CompanyContextService);
    const router = inject(Router);

    // Para usuarios SUDO, no aplicar límites
    if (companyContextService.isSudo()) {
      return true;
    }

    const limits = companyContextService.getSubscriptionLimits();
    if (!limits) {
      return true; // Sin límites configurados
    }

    // Aquí se podría hacer una verificación más específica del uso actual
    // Por ahora, solo verificar que existan los límites
    
    switch (limitType) {
      case 'users':
        // Se podría verificar count actual de usuarios vs límite
        break;
      case 'products':
        // Se podría verificar count actual de productos vs límite
        break;
      case 'sales':
        // Se podría verificar count de ventas del mes vs límite
        break;
    }

    return true;
  };
};
