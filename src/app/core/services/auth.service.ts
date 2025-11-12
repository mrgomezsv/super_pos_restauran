import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import {
  Auth,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { FirebaseError } from '@angular/fire/app';
import { User, LoginRequest, UserCompany } from '../models/user.model';

interface FirestoreUserDoc {
  id: string;
  email: string;
  name: string;
  lastName?: string;
  fullName?: string;
  username?: string;
  role: string;
  status?: string;
  phone?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  primaryCompanyId?: string;
  companies?: UserCompany[];
  permissions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'pos_token';
  private readonly USER_KEY = 'pos_user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    this.loadStoredAuth();
    this.listenToAuthChanges();
  }

  /**
   * Iniciar sesión con Firebase Auth
   */
  login(credentials: LoginRequest): Observable<User> {
    return from(signInWithEmailAndPassword(this.auth, credentials.email, credentials.password)).pipe(
      switchMap((credential) =>
        from(this.updateSessionFromFirebaseUser(credential.user))
      ),
      tap(user => {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      }),
      catchError(error => throwError(() => this.transformFirebaseError(error)))
    );
  }

  /**
   * Cerrar sesión
   */
  logout(): void {
    signOut(this.auth).finally(() => {
      this.clearStoredAuth();
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      // Limpiar también datos de contexto de compañía
      localStorage.removeItem('selectedCompanyId');
      localStorage.removeItem('companyContext');
    });
  }

  /**
   * Obtener token actual almacenado
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtener usuario actual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Verificar autenticación
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Verificar rol del usuario
   */
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
   * Verificar si el usuario pertenece a alguna compañía
   */
  hasCompany(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    const companies = user.companies ?? [];
    return !!(user.primaryCompanyId || companies.length > 0);
  }

  /**
   * Obtener ID de compañía principal del usuario
   */
  getUserCompanyId(): string | null {
    const user = this.getCurrentUser();
    if (!user) return null;

    const companies = user.companies ?? [];
    return user.primaryCompanyId || companies[0]?.id || null;
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

    if (user.role === 'sudo') return true;

    const companies = user.companies ?? [];
    return companies.length > 1;
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
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  /**
   * Escuchar cambios de autenticación de Firebase
   */
  private listenToAuthChanges(): void {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.updateSessionFromFirebaseUser(firebaseUser);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } else {
        this.clearStoredAuth();
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }
    });
  }

  /**
   * Actualizar sesión local a partir del usuario de Firebase
   */
  private async updateSessionFromFirebaseUser(firebaseUser: FirebaseUser): Promise<User> {
    const token = await firebaseUser.getIdToken(true);
    const profile = await this.fetchOrCreateUserProfile(firebaseUser);
    this.storeAuth(token, profile);
    return profile;
  }

  /**
   * Obtener o crear perfil del usuario en Firestore
   */
  private async fetchOrCreateUserProfile(firebaseUser: FirebaseUser): Promise<User> {
    const docRef = doc(this.firestore, 'accounts', firebaseUser.uid);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      const baseProfile: FirestoreUserDoc = {
        id: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        name: firebaseUser.displayName?.split(' ').slice(0, -1).join(' ') || firebaseUser.displayName || '',
        lastName: firebaseUser.displayName?.split(' ').slice(-1).join(' ') || '',
        fullName: firebaseUser.displayName || '',
        role: 'cashier',
        status: 'active',
        phone: firebaseUser.phoneNumber || '',
        username: firebaseUser.email?.split('@')[0] || '',
        companies: [],
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, {
        ...baseProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return this.transformFirestoreUser(baseProfile);
    }

    const data = snap.data() as FirestoreUserDoc;
    const profile = this.transformFirestoreUser({
      ...data,
      id: data.id || firebaseUser.uid,
      email: data.email || firebaseUser.email || ''
    });

    // Actualizar última fecha de acceso
    await setDoc(docRef, {
      lastLoginAt: new Date().toISOString(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return profile;
  }

  /**
   * Transformar documento de Firestore a interfaz de usuario interna
   */
  private transformFirestoreUser(docData: FirestoreUserDoc): User {
    return {
      id: docData.id,
      email: docData.email,
      name: docData.name || '',
      lastName: docData.lastName || '',
      fullName: docData.fullName || [docData.name, docData.lastName].filter(Boolean).join(' ') || docData.email,
      username: docData.username,
      role: (docData.role as User['role']) || 'cashier',
      status: (docData.status as User['status']) || 'active',
      isActive: (docData.status ?? 'active') === 'active',
      phone: docData.phone,
      photoUrl: docData.photoUrl,
      createdAt: docData.createdAt,
      updatedAt: docData.updatedAt,
      lastLoginAt: docData.lastLoginAt,
      primaryCompanyId: docData.primaryCompanyId,
      companies: docData.companies ?? [],
      permissions: docData.permissions ?? []
    };
  }

  /**
   * Almacenar token y usuario en localStorage
   */
  private storeAuth(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  /**
   * Limpiar almacenamiento local
   */
  private clearStoredAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Cargar sesión desde localStorage al iniciar
   */
  private loadStoredAuth(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const parsed = JSON.parse(userStr);
        const user: User = {
          ...parsed,
          companies: parsed?.companies ?? [],
          permissions: parsed?.permissions ?? [],
          status: parsed?.status ?? 'active',
          isActive: parsed?.isActive ?? (parsed?.status ?? 'active') === 'active'
        };
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (error) {
        this.clearStoredAuth();
      }
    }
  }

  /**
   * Convertir errores de Firebase a mensajes legibles
   */
  private transformFirebaseError(error: unknown): Error {
    if (error instanceof FirebaseError) {
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          return new Error('Credenciales inválidas. Verifica tu correo y contraseña.');
        case 'auth/too-many-requests':
          return new Error('Demasiados intentos fallidos. Intenta nuevamente más tarde.');
        case 'auth/network-request-failed':
          return new Error('Error de red al intentar conectarse. Verifica tu conexión.');
        default:
          return new Error(error.message);
      }
    }
    return new Error('Ocurrió un error inesperado durante la autenticación.');
  }
}
