import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard que bloquea el acceso a cajeros (cashier role)
 * Utilizado para rutas que no deben ser accesibles por cajeros
 */
export const noCashierGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si el usuario actual es cajero, bloquear acceso
  if (authService.isCashier()) {
    console.warn('Los cajeros no tienen acceso a esta sección');
    router.navigate(['/pos']); // Redirigir a POS
    return false;
  }
  
  return true;
};

