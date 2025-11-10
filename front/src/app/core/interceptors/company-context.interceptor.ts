import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CompanyContextService } from '../services/company-context.service';

@Injectable()
export class CompanyContextInterceptor implements HttpInterceptor {

  constructor(private companyContextService: CompanyContextService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Solo aplicar el interceptor a requests de la API
    if (!req.url.includes('/api/')) {
      return next.handle(req);
    }

    // Obtener contexto actual
    const context = this.companyContextService.getCurrentContext();
    if (!context) {
      return next.handle(req);
    }

    // No agregar company_id para usuarios SUDO en ciertas rutas
    if (context.user.is_sudo && this.isSudoRoute(req.url)) {
      return next.handle(req);
    }

    // Agregar company_id a las requests que lo necesiten
    const companyId = this.companyContextService.getCurrentCompanyId();
    if (companyId && this.shouldAddCompanyId(req.url)) {
      // Clonar la request y agregar parámetros de compañía
      let modifiedReq: HttpRequest<any>;

      if (req.method === 'GET') {
        // Para GET, agregar como query parameter
        modifiedReq = req.clone({
          setParams: {
            company_id: companyId.toString()
          }
        });
      } else {
        // Para POST/PUT/DELETE, agregar al body si es necesario
        let modifiedBody = req.body;
        
        if (this.shouldAddCompanyIdToBody(req.url) && req.body && typeof req.body === 'object') {
          modifiedBody = {
            ...req.body,
            company_id: companyId
          };
        }

        modifiedReq = req.clone({
          body: modifiedBody,
          setParams: {
            company_id: companyId.toString()
          }
        });
      }

      return next.handle(modifiedReq);
    }

    return next.handle(req);
  }

  /**
   * Verificar si la ruta es específica para SUDO y no necesita filtro de compañía
   */
  private isSudoRoute(url: string): boolean {
    const sudoRoutes = [
      '/api/companies',  // Lista de compañías para SUDO
      '/api/companies/', // Operaciones de compañías para SUDO
    ];

    return sudoRoutes.some(route => url.includes(route));
  }

  /**
   * Verificar si la URL necesita company_id como parámetro
   */
  private shouldAddCompanyId(url: string): boolean {
    // Rutas que NO necesitan company_id
    const excludeRoutes = [
      '/api/auth/',
      '/api/health',
      '/api/companies', // Manejo especial para compañías
    ];

    // Verificar si la URL debe excluirse
    const shouldExclude = excludeRoutes.some(route => url.includes(route));
    if (shouldExclude) {
      return false;
    }

    // Rutas que SÍ necesitan company_id
    const includeRoutes = [
      '/api/products',
      '/api/sales',
      '/api/users',
      '/api/fiscal-documents',
      '/api/categories',
      '/api/inventory',
      '/api/reports'
    ];

    return includeRoutes.some(route => url.includes(route));
  }

  /**
   * Verificar si se debe agregar company_id al body de la request
   */
  private shouldAddCompanyIdToBody(url: string): boolean {
    // Rutas donde el company_id debe ir en el body para creación/actualización
    const bodyRoutes = [
      '/api/products',
      '/api/sales',
      '/api/users',
      '/api/fiscal-documents'
    ];

    return bodyRoutes.some(route => url.includes(route));
  }
}
