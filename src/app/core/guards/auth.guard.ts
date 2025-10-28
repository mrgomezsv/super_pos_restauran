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

  // Para usuarios SUDO, permitir acceso pero sugerir selección de compañía
  if (authService.isSudo()) {
    return true; // SUDO puede acceder a todo, la selección de compañía es opcional
  }

  // Para usuarios normales, verificar que tengan compañía asignada
  if (!authService.hasCompany()) {
    console.error('Usuario sin compañía asignada');
    router.navigate(['/login']);
    return false;
  }

  return true;
};
