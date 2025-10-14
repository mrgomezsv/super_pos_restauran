import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { catchError, map, tap } from 'rxjs/operators';

export interface CompanyInfo {
  id: number;
  nombre: string;
  razonSocial: string;
  nit: string;
  estado: string;
  subscriptionPlan: string;
  maxUsers: number;
  maxProducts: number;
  maxSalesPerMonth: number;
}

export interface UserContext {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  company_id?: number;
  is_sudo: boolean;
}

export interface CompanyContext {
  user: UserContext;
  company?: CompanyInfo;
  permissions: string[];
}

export interface AvailableCompany {
  id: number;
  nombre: string;
  razonSocial: string;
  nit: string;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyContextService {
  private readonly apiUrl = environment.apiUrl || 'http://localhost:3000/api';
  
  private currentContextSubject = new BehaviorSubject<CompanyContext | null>(null);
  private availableCompaniesSubject = new BehaviorSubject<AvailableCompany[]>([]);
  private selectedCompanyIdSubject = new BehaviorSubject<number | null>(null);

  public currentContext$ = this.currentContextSubject.asObservable();
  public availableCompanies$ = this.availableCompaniesSubject.asObservable();
  public selectedCompanyId$ = this.selectedCompanyIdSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Inicializar contexto cuando el usuario se loguea
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.initializeContext();
      } else {
        this.clearContext();
      }
    });
  }

  /**
   * Inicializar contexto del usuario
   */
  private initializeContext(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    // Para usuarios normales, usar su compañía por defecto
    if (currentUser.role !== 'sudo' && currentUser.company_id) {
      this.switchToCompany(currentUser.company_id);
    } else if (currentUser.role === 'sudo') {
      // Para SUDO, cargar lista de compañías disponibles
      this.loadAvailableCompanies();
    }
  }

  /**
   * Cambiar a una compañía específica
   */
  switchToCompany(companyId: number): Observable<CompanyContext> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    return this.http.get<CompanyContext>(`${this.apiUrl}/companies/${companyId}/context`, {
      params: { user_id: currentUser.id.toString() }
    }).pipe(
      tap(context => {
        this.currentContextSubject.next(context);
        this.selectedCompanyIdSubject.next(companyId);
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('selectedCompanyId', companyId.toString());
        localStorage.setItem('companyContext', JSON.stringify(context));
      }),
      catchError(error => {
        console.error('Error al cambiar contexto de compañía:', error);
        throw error;
      })
    );
  }

  /**
   * Cargar compañías disponibles para el usuario
   */
  loadAvailableCompanies(): Observable<AvailableCompany[]> {
    const context = this.getCurrentContext();
    if (!context) {
      return of([]);
    }

    // Simular endpoint que retorna compañías basado en el contexto del usuario
    return this.http.get<AvailableCompany[]>(`${this.apiUrl}/companies`, {
      params: { 
        active_only: 'true',
        // Agregar parámetros de contexto si es necesario
      }
    }).pipe(
      tap(companies => {
        this.availableCompaniesSubject.next(companies);
      }),
      catchError(error => {
        console.error('Error al cargar compañías disponibles:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener contexto actual
   */
  getCurrentContext(): CompanyContext | null {
    return this.currentContextSubject.value;
  }

  /**
   * Obtener compañía seleccionada actual
   */
  getCurrentCompany(): CompanyInfo | null {
    const context = this.getCurrentContext();
    return context?.company || null;
  }

  /**
   * Obtener ID de compañía actual para filtros
   */
  getCurrentCompanyId(): number | null {
    const company = this.getCurrentCompany();
    return company?.id || null;
  }

  /**
   * Verificar si el usuario es SUDO
   */
  isSudo(): boolean {
    const context = this.getCurrentContext();
    return context?.user?.is_sudo || false;
  }

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const context = this.getCurrentContext();
    if (!context) return false;

    // SUDO tiene todos los permisos
    if (context.user.is_sudo) return true;

    // Verificar permiso específico
    return context.permissions.includes(permission);
  }

  /**
   * Verificar si el usuario puede acceder a una funcionalidad
   */
  canAccess(requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => this.hasPermission(permission));
  }

  /**
   * Obtener información del usuario actual
   */
  getCurrentUser(): UserContext | null {
    const context = this.getCurrentContext();
    return context?.user || null;
  }

  /**
   * Verificar si hay una compañía seleccionada
   */
  hasCompanySelected(): boolean {
    return this.getCurrentCompanyId() !== null;
  }

  /**
   * Obtener parámetros de filtro de compañía para requests HTTP
   */
  getCompanyFilterParams(): { [key: string]: string } {
    const companyId = this.getCurrentCompanyId();
    if (companyId && !this.isSudo()) {
      return { company_id: companyId.toString() };
    }
    return {};
  }

  /**
   * Limpiar contexto (logout)
   */
  clearContext(): void {
    this.currentContextSubject.next(null);
    this.availableCompaniesSubject.next([]);
    this.selectedCompanyIdSubject.next(null);
    
    // Limpiar localStorage
    localStorage.removeItem('selectedCompanyId');
    localStorage.removeItem('companyContext');
  }

  /**
   * Restaurar contexto desde localStorage (al recargar página)
   */
  restoreContextFromStorage(): void {
    const savedCompanyId = localStorage.getItem('selectedCompanyId');
    const savedContext = localStorage.getItem('companyContext');
    
    if (savedCompanyId && savedContext) {
      try {
        const context = JSON.parse(savedContext);
        this.currentContextSubject.next(context);
        this.selectedCompanyIdSubject.next(parseInt(savedCompanyId));
      } catch (error) {
        console.error('Error al restaurar contexto:', error);
        this.clearContext();
      }
    }
  }

  /**
   * Crear nueva compañía (solo para SUDO)
   */
  createCompany(companyData: any): Observable<any> {
    if (!this.isSudo()) {
      throw new Error('Solo usuarios SUDO pueden crear compañías');
    }

    return this.http.post(`${this.apiUrl}/companies`, companyData).pipe(
      tap(() => {
        // Recargar lista de compañías después de crear una nueva
        this.loadAvailableCompanies().subscribe();
      })
    );
  }

  /**
   * Actualizar estado de compañía (solo para SUDO)
   */
  updateCompanyStatus(companyId: number, newStatus: string): Observable<any> {
    if (!this.isSudo()) {
      throw new Error('Solo usuarios SUDO pueden actualizar estados de compañías');
    }

    return this.http.put(`${this.apiUrl}/companies/${companyId}/status`, {
      estado: newStatus
    }).pipe(
      tap(() => {
        // Recargar lista de compañías después de actualizar
        this.loadAvailableCompanies().subscribe();
      })
    );
  }

  /**
   * Obtener límites de la suscripción actual
   */
  getSubscriptionLimits(): {
    maxUsers: number;
    maxProducts: number;
    maxSalesPerMonth: number;
  } | null {
    const company = this.getCurrentCompany();
    if (!company) return null;

    return {
      maxUsers: company.maxUsers,
      maxProducts: company.maxProducts,
      maxSalesPerMonth: company.maxSalesPerMonth
    };
  }

  /**
   * Verificar si se puede agregar más usuarios
   */
  canAddMoreUsers(currentUserCount: number): boolean {
    const limits = this.getSubscriptionLimits();
    return !limits || currentUserCount < limits.maxUsers;
  }

  /**
   * Verificar si se pueden agregar más productos
   */
  canAddMoreProducts(currentProductCount: number): boolean {
    const limits = this.getSubscriptionLimits();
    return !limits || currentProductCount < limits.maxProducts;
  }

  /**
   * Verificar si se pueden hacer más ventas este mes
   */
  canAddMoreSales(currentMonthlySales: number): boolean {
    const limits = this.getSubscriptionLimits();
    return !limits || currentMonthlySales < limits.maxSalesPerMonth;
  }
}
