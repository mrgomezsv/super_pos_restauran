import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { User, UserCompany } from '../models/user.model';

export interface CompanyInfo extends UserCompany {}

export interface CompanyContext {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    is_sudo: boolean;
  };
  company?: CompanyInfo;
  permissions: string[];
}

export type AvailableCompany = CompanyInfo;

@Injectable({
  providedIn: 'root'
})
export class CompanyContextService {
  private currentContextSubject = new BehaviorSubject<CompanyContext | null>(null);
  private availableCompaniesSubject = new BehaviorSubject<AvailableCompany[]>([]);
  private selectedCompanyIdSubject = new BehaviorSubject<string | null>(null);

  public currentContext$ = this.currentContextSubject.asObservable();
  public availableCompanies$ = this.availableCompaniesSubject.asObservable();
  public selectedCompanyId$ = this.selectedCompanyIdSubject.asObservable();

  constructor(private authService: AuthService) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.initializeContext(user);
      } else {
        this.clearContext();
      }
    });
  }

  private initializeContext(user: User): void {
    const companies = user.companies ?? [];
    this.availableCompaniesSubject.next(companies);

    const defaultCompanyId = user.primaryCompanyId || companies[0]?.id || null;

    if (defaultCompanyId) {
      this.switchToCompany(defaultCompanyId).subscribe();
    } else {
      const context: CompanyContext = {
        user: this.mapUserToContext(user),
        permissions: user.permissions ?? []
      };
      this.currentContextSubject.next(context);
      this.selectedCompanyIdSubject.next(null);
      localStorage.removeItem('selectedCompanyId');
      localStorage.setItem('companyContext', JSON.stringify(context));
    }
  }

  switchToCompany(companyId: string | null | undefined): Observable<CompanyContext> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    if (!companyId) {
      const context: CompanyContext = {
        user: this.mapUserToContext(currentUser),
        permissions: currentUser.permissions ?? []
      };
      this.currentContextSubject.next(context);
      this.selectedCompanyIdSubject.next(null);
      localStorage.removeItem('selectedCompanyId');
      localStorage.setItem('companyContext', JSON.stringify(context));
      return of(context);
    }

    const companies = currentUser.companies ?? [];
    const company = companies.find(c => c.id === companyId) || null;

    const context: CompanyContext = {
      user: this.mapUserToContext(currentUser),
      company: company || undefined,
      permissions: currentUser.permissions ?? []
    };

    this.currentContextSubject.next(context);
    this.selectedCompanyIdSubject.next(company?.id || null);

    localStorage.setItem('companyContext', JSON.stringify(context));
    if (company?.id) {
      localStorage.setItem('selectedCompanyId', company.id);
    } else {
      localStorage.removeItem('selectedCompanyId');
    }

    return of(context);
  }

  loadAvailableCompanies(): Observable<AvailableCompany[]> {
    const user = this.authService.getCurrentUser();
    const companies = user?.companies ?? [];
    this.availableCompaniesSubject.next(companies);
    return of(companies);
  }

  getCurrentContext(): CompanyContext | null {
    return this.currentContextSubject.value;
  }

  getCurrentCompany(): CompanyInfo | null {
    return this.getCurrentContext()?.company ?? null;
  }

  getCurrentCompanyId(): string | null {
    return this.selectedCompanyIdSubject.value;
  }

  isSudo(): boolean {
    return this.getCurrentContext()?.user?.is_sudo ?? false;
  }

  hasPermission(permission: string): boolean {
    const context = this.getCurrentContext();
    if (!context) return false;
    if (context.user.is_sudo) return true;
    return context.permissions.includes(permission);
  }

  canAccess(requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => this.hasPermission(permission));
  }

  getCurrentUser(): CompanyContext['user'] | null {
    return this.getCurrentContext()?.user ?? null;
  }

  hasCompanySelected(): boolean {
    return !!this.getCurrentCompanyId();
  }

  getCompanyFilterParams(): { [key: string]: string } {
    const companyId = this.getCurrentCompanyId();
    if (companyId && !this.isSudo()) {
      return { company_id: companyId };
    }
    return {};
  }

  clearContext(): void {
    this.currentContextSubject.next(null);
    this.availableCompaniesSubject.next([]);
    this.selectedCompanyIdSubject.next(null);
    localStorage.removeItem('selectedCompanyId');
    localStorage.removeItem('companyContext');
  }

  restoreContextFromStorage(): void {
    const savedCompanyId = localStorage.getItem('selectedCompanyId');
    const savedContext = localStorage.getItem('companyContext');

    if (savedContext) {
      try {
        const context: CompanyContext = JSON.parse(savedContext);
        this.currentContextSubject.next(context);
        this.selectedCompanyIdSubject.next(savedCompanyId || null);
        if (context.company) {
          this.availableCompaniesSubject.next(
            this.mergeCompanyInList(context.company)
          );
        }
      } catch (error) {
        console.error('Error al restaurar contexto:', error);
        this.clearContext();
      }
    }
  }

  createCompany(): Observable<never> {
    return throwError(() => new Error('La creación de compañías aún no está implementada con Firebase'));
  }

  updateCompanyStatus(): Observable<never> {
    return throwError(() => new Error('La actualización de compañías aún no está implementada con Firebase'));
  }

  getSubscriptionLimits(): {
    maxUsers: number;
    maxProducts: number;
    maxSalesPerMonth: number;
  } | null {
    const company = this.getCurrentCompany();
    if (!company) {
      return null;
    }

    return {
      maxUsers: company.maxUsers ?? Number.POSITIVE_INFINITY,
      maxProducts: company.maxProducts ?? Number.POSITIVE_INFINITY,
      maxSalesPerMonth: company.maxSalesPerMonth ?? Number.POSITIVE_INFINITY
    };
  }

  canAddMoreUsers(currentUserCount: number): boolean {
    const limits = this.getSubscriptionLimits();
    return !limits || currentUserCount < limits.maxUsers;
  }

  canAddMoreProducts(currentProductCount: number): boolean {
    const limits = this.getSubscriptionLimits();
    return !limits || currentProductCount < limits.maxProducts;
  }

  canAddMoreSales(currentMonthlySales: number): boolean {
    const limits = this.getSubscriptionLimits();
    return !limits || currentMonthlySales < limits.maxSalesPerMonth;
  }

  private mapUserToContext(user: User): CompanyContext['user'] {
    return {
      id: user.id,
      name: user.fullName || user.name || user.email,
      email: user.email,
      role: user.role,
      is_sudo: user.role === 'sudo'
    };
  }

  private mergeCompanyInList(company: CompanyInfo): CompanyInfo[] {
    const list = this.availableCompaniesSubject.value;
    const exists = list.find(c => c.id === company.id);
    if (exists) {
      return list.map(c => (c.id === company.id ? company : c));
    }
    return [...list, company];
  }
}
