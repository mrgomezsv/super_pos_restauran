import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CompanyContextService } from '../services/company-context.service';

// Modo desarrollo: permite acceso sin autenticación
const DEVELOPMENT_MODE = false; // Cambiar a false en producción

/**
 * Guard básico de autenticación
 * Verifica que el usuario esté autenticado
 */
export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // En desarrollo, permitir acceso
  if (DEVELOPMENT_MODE) {
    console.warn('⚠️ DEVELOPMENT MODE: Acceso sin autenticación');
    return true;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Guard de autenticación con verificación de compañía
 * Verifica autenticación y que el usuario tenga acceso a una compañía
 */
export const authWithCompanyGuard = () => {
  const authService = inject(AuthService);
  const companyContextService = inject(CompanyContextService);
  const router = inject(Router);

  // En desarrollo, permitir acceso
  if (DEVELOPMENT_MODE) {
    console.warn('⚠️ DEVELOPMENT MODE: Acceso sin verificación de compañía');
    return true;
  }

  // Verificar autenticación primero
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Para una sola compañía, permitir acceso a todos los usuarios autenticados
  // La compañía se asigna automáticamente si existe
  return true;
};
