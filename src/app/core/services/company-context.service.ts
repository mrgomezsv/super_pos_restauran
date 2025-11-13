import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class CompanyContextService {
  private currentContextSubject = new BehaviorSubject<CompanyContext | null>(null);

  public currentContext$ = this.currentContextSubject.asObservable();

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
    // Para una sola compañía, tomamos la primera si existe
    const company = user.companies && user.companies.length > 0 ? user.companies[0] : undefined;

    const context: CompanyContext = {
      user: this.mapUserToContext(user),
      company: company,
      permissions: user.permissions ?? []
    };

    this.currentContextSubject.next(context);
    localStorage.setItem('companyContext', JSON.stringify(context));
  }

  getCurrentContext(): CompanyContext | null {
    return this.currentContextSubject.value;
  }

  getCurrentCompany(): CompanyInfo | null {
    return this.getCurrentContext()?.company ?? null;
  }

  getCurrentCompanyId(): string | null {
    return this.getCurrentCompany()?.id ?? null;
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
    return !!this.getCurrentCompany();
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
    localStorage.removeItem('companyContext');
  }

  restoreContextFromStorage(): void {
    const savedContext = localStorage.getItem('companyContext');

    if (savedContext) {
      try {
        const context: CompanyContext = JSON.parse(savedContext);
        this.currentContextSubject.next(context);
      } catch (error) {
        console.error('Error al restaurar contexto:', error);
        this.clearContext();
      }
    }
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
}
