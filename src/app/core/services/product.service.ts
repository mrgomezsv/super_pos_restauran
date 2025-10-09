import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Product, ProductCategory, ProductSearchFilters } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

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
    return this.http.get<{ nextSKU: string }>(`${this.API_URL}/products/next-sku`);
  }

}
