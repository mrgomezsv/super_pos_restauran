import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

// Modo desarrollo
const DEVELOPMENT_MODE = false; // Cambiar a false en producción

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();
    
    // En desarrollo, si no hay token, hacer la request sin autenticación
    if (!token && DEVELOPMENT_MODE) {
      console.warn('⚠️ DEVELOPMENT MODE: Request sin token de autenticación');
      return next.handle(req).pipe(
        catchError((error) => {
          console.warn('⚠️ Error en request (modo desarrollo):', error);
          // Retornar error para que el componente pueda manejarlo
          throw error;
        })
      );
    }
    
    if (!token) {
      return next.handle(req);
    }
    
    const authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    return next.handle(authReq);
  }
}


