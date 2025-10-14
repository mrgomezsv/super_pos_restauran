import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { User, LoginRequest, LoginResponse } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000/api';
  private readonly TOKEN_KEY = 'pos_token';
  private readonly USER_KEY = 'pos_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadStoredAuth();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          this.storeAuth(response.token, response.user);
          this.currentUserSubject.next(response.user);
          this.isAuthenticatedSubject.next(true);
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    // Limpiar también datos de contexto de compañía
    localStorage.removeItem('selectedCompanyId');
    localStorage.removeItem('companyContext');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  isCashier(): boolean {
    return this.hasRole('cashier');
  }

  isManager(): boolean {
    return this.hasRole('manager');
  }

  /**
   * Verificar si el usuario es SUDO (super administrador)
   */
  isSudo(): boolean {
    return this.hasRole('sudo');
  }

  /**
   * Verificar si el usuario pertenece a una compañía
   */
  hasCompany(): boolean {
    const user = this.getCurrentUser();
    return !!(user && user.company_id);
  }

  /**
   * Obtener ID de compañía del usuario
   */
  getUserCompanyId(): number | null {
    const user = this.getCurrentUser();
    return user?.company_id || null;
  }

  /**
   * Verificar si el usuario puede gestionar múltiples compañías
   */
  canManageMultipleCompanies(): boolean {
    return this.isSudo();
  }

  /**
   * Verificar si el usuario necesita seleccionar una compañía para trabajar
   */
  needsCompanySelection(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // SUDO siempre necesita seleccionar compañía
    if (user.role === 'sudo') return true;
    
    // Otros usuarios no necesitan si ya tienen una compañía asignada
    return !user.company_id;
  }

  /**
   * Verificar si el usuario puede crear compañías
   */
  canCreateCompanies(): boolean {
    return this.isSudo();
  }

  /**
   * Obtener header de autorización para requests HTTP
   */
  getAuthHeader(): { [header: string]: string } {
    const token = this.getToken();
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }

  private storeAuth(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        this.logout();
      }
    }
  }
}
