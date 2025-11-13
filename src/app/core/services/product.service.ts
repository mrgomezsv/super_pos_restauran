import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Firestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, limit, where, serverTimestamp } from '@angular/fire/firestore';
import { Product, ProductCategory, ProductSearchFilters } from '../models/product.model';
import { CompanyContextService } from './company-context.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly API_URL = environment.apiUrl || 'http://localhost:3000/api';
  private readonly INGREDIENTS_COLLECTION = 'ingredients';

  constructor(
    private http: HttpClient,
    private firestore: Firestore,
    private companyContextService: CompanyContextService
  ) {}

  getProducts(filters?: ProductSearchFilters): Observable<Product[]> {
    let params = new HttpParams();
    
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.category) {
      params = params.set('category', filters.category);
    }
    if (filters?.brand) {
      params = params.set('brand', filters.brand);
    }
    if (filters?.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }

    return this.http.get<Product[]>(`${this.API_URL}/products`, { params });
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.API_URL}/products/${id}`);
  }

  getProductByCode(code: string): Observable<Product> {
    return this.http.get<Product>(`${this.API_URL}/products/code/${code}`);
  }

  getProductByBarcode(barcode: string): Observable<Product> {
    return this.http.get<Product>(`${this.API_URL}/products/barcode/${barcode}`);
  }

  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Observable<Product> {
    return this.http.post<Product>(`${this.API_URL}/products`, product);
  }

  updateProduct(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.API_URL}/products/${id}`, product);
  }

  deleteProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/products/${id}`);
  }

  getCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(`${this.API_URL}/products/categories`);
  }

  createCategory(category: Omit<ProductCategory, 'id'>): Observable<ProductCategory> {
    return this.http.post<ProductCategory>(`${this.API_URL}/products/categories`, category);
  }

  updateCategory(id: number, category: Partial<ProductCategory>): Observable<ProductCategory> {
    return this.http.put<ProductCategory>(`${this.API_URL}/products/categories/${id}`, category);
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/products/categories/${id}`);
  }

  getNextSKU(): Observable<{ nextSKU: string }> {
    // Obtener el último SKU de la colección de ingredientes
    const ingredientsRef = collection(this.firestore, this.INGREDIENTS_COLLECTION);
    const q = query(ingredientsRef, orderBy('code', 'desc'), limit(1));
    
    return from(getDocs(q)).pipe(
      map((snapshot) => {
        if (snapshot.empty) {
          // Si no hay ingredientes, empezar con 000001
          return { nextSKU: '000001' };
        }
        
        const lastDoc = snapshot.docs[0];
        const lastCode = lastDoc.data()['code'] || '000000';
        const lastNumber = parseInt(lastCode, 10) || 0;
        const nextNumber = lastNumber + 1;
        const nextSKU = nextNumber.toString().padStart(6, '0');
        
        return { nextSKU };
      }),
      catchError((error) => {
        console.error('Error getting next SKU:', error);
        // En caso de error, retornar un SKU por defecto
        return of({ nextSKU: '000001' });
      })
    );
  }

  /**
   * Crear ingrediente en Firestore
   */
  createIngredient(ingredient: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'code'>): Observable<Product> {
    return this.getNextSKU().pipe(
      switchMap(({ nextSKU }) => {
        const ingredientsRef = collection(this.firestore, this.INGREDIENTS_COLLECTION);
        const newDocRef = doc(ingredientsRef);
        
        const ingredientData = {
          id: newDocRef.id,
          code: nextSKU,
          name: ingredient.name,
          unitOfMeasure: ingredient.unitOfMeasure,
          stock: ingredient.stock || 0,
          minStock: ingredient.minStock || 0,
          maxStock: ingredient.maxStock || null,
          brand: ingredient.brand || '',
          isActive: ingredient.isActive !== undefined ? ingredient.isActive : true,
          productType: 'ingredient' as const,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        return from(setDoc(newDocRef, ingredientData)).pipe(
          map(() => ({
            id: newDocRef.id as any, // Guardar el document ID de Firestore
            code: nextSKU,
            name: ingredient.name,
            description: '',
            price: 0,
            cost: 0,
            category: '',
            brand: ingredient.brand || '',
            stock: ingredient.stock || 0,
            minStock: ingredient.minStock || 0,
            maxStock: ingredient.maxStock || null,
            isActive: ingredient.isActive !== undefined ? ingredient.isActive : true,
            barcode: '',
            taxRate: 0,
            productType: 'ingredient' as const,
            unitOfMeasure: ingredient.unitOfMeasure,
            createdAt: new Date(),
            updatedAt: new Date(),
            _firestoreId: newDocRef.id // Guardar también el ID de Firestore para uso interno
          } as Product & { _firestoreId?: string }))
        );
      })
    );
  }

  /**
   * Obtener todos los ingredientes de Firestore
   */
  getIngredients(): Observable<Product[]> {
    const ingredientsRef = collection(this.firestore, this.INGREDIENTS_COLLECTION);
    const q = query(ingredientsRef, orderBy('code', 'asc'));
    
    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          // Guardar el document ID de Firestore en el campo id (como string para compatibilidad)
          const firestoreId = docSnap.id;
          return {
            id: firestoreId as any, // Guardar el ID de Firestore (string) pero mantener compatibilidad
            code: data['code'] || '',
            name: data['name'] || '',
            description: '',
            price: 0,
            cost: 0,
            category: '',
            brand: data['brand'] || '',
            stock: data['stock'] || 0,
            minStock: data['minStock'] || 0,
            maxStock: data['maxStock'] || null,
            isActive: data['isActive'] !== undefined ? data['isActive'] : true,
            barcode: '',
            taxRate: 0,
            productType: 'ingredient' as const,
            unitOfMeasure: data['unitOfMeasure'] || 'unidad',
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            _firestoreId: firestoreId // Guardar también el ID de Firestore para uso interno
          } as Product & { _firestoreId?: string };
        });
      }),
      catchError((error) => {
        console.error('Error getting ingredients:', error);
        return of([]);
      })
    );
  }

  /**
   * Actualizar ingrediente en Firestore
   */
  updateIngredient(id: string, ingredient: Partial<Product>): Observable<Product> {
    const ingredientRef = doc(this.firestore, this.INGREDIENTS_COLLECTION, id);
    
    const updateData: any = {
      ...ingredient,
      updatedAt: serverTimestamp()
    };
    
    // Eliminar campos que no deben actualizarse
    delete updateData.id;
    delete updateData.code;
    delete updateData.createdAt;
    
    return from(setDoc(ingredientRef, updateData, { merge: true })).pipe(
      switchMap(() => from(getDoc(ingredientRef))),
      map((docSnap) => {
        if (!docSnap.exists()) {
          throw new Error('Ingrediente no encontrado');
        }
        const data = docSnap.data();
        const firestoreId = docSnap.id;
        return {
          id: firestoreId as any, // Guardar el document ID de Firestore
          code: data?.['code'] || '',
          name: data?.['name'] || '',
          description: '',
          price: 0,
          cost: 0,
          category: '',
          brand: data?.['brand'] || '',
          stock: data?.['stock'] || 0,
          minStock: data?.['minStock'] || 0,
          maxStock: data?.['maxStock'] || null,
          isActive: data?.['isActive'] !== undefined ? data?.['isActive'] : true,
          barcode: '',
          taxRate: 0,
          productType: 'ingredient' as const,
          unitOfMeasure: data?.['unitOfMeasure'] || 'unidad',
          createdAt: data?.['createdAt']?.toDate() || new Date(),
          updatedAt: data?.['updatedAt']?.toDate() || new Date(),
          _firestoreId: firestoreId // Guardar también el ID de Firestore para uso interno
        } as Product & { _firestoreId?: string };
      })
    );
  }

  // Métodos relacionados con contexto de compañía
  
  /**
   * Verificar si se pueden agregar más productos según los límites de suscripción
   */
  canAddMoreProducts(currentProductCount?: number): Observable<boolean> {
    return new Observable(observer => {
      // Si no se proporciona el count actual, obtenerlo
      if (currentProductCount === undefined) {
        this.getProducts().subscribe(products => {
          const count = products.length;
          const canAdd = this.companyContextService.canAddMoreProducts(count);
          observer.next(canAdd);
          observer.complete();
        });
      } else {
        const canAdd = this.companyContextService.canAddMoreProducts(currentProductCount);
        observer.next(canAdd);
        observer.complete();
      }
    });
  }

  /**
   * Obtener información de límites de productos
   */
  getProductLimits() {
    const limits = this.companyContextService.getSubscriptionLimits();
    return {
      maxProducts: limits?.maxProducts || Infinity,
      hasLimits: !!limits
    };
  }

  /**
   * Verificar si el usuario tiene permisos para gestionar productos
   */
  canManageProducts(): boolean {
    return this.companyContextService.canAccess([
      'products.create',
      'products.update',
      'products.delete'
    ]);
  }

  /**
   * Verificar si el usuario puede ver productos
   */
  canViewProducts(): boolean {
    return this.companyContextService.hasPermission('products.read');
  }

  /**
   * Obtener contexto actual de compañía (útil para debugging)
   */
  getCurrentCompanyContext() {
    return this.companyContextService.getCurrentContext();
  }

}
