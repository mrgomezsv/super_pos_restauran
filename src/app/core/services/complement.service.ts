import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  ProductComplement, 
  ProductComplementCreate,
  ProductComplementGroup
} from '../models/complement.model';

@Injectable({
  providedIn: 'root'
})
export class ComplementService {
  private apiUrl = `${environment.apiUrl}/product-complements`;

  constructor(private http: HttpClient) {}

  // Obtener complementos de un producto
  getProductComplements(productId: number): Observable<ProductComplement[]> {
    return this.http.get<ProductComplement[]>(`${this.apiUrl}/product/${productId}`);
  }

  // Obtener todos los complementos
  getComplements(): Observable<ProductComplement[]> {
    return this.http.get<ProductComplement[]>(this.apiUrl);
  }

  // Obtener complemento por ID
  getComplement(id: number): Observable<ProductComplement> {
    return this.http.get<ProductComplement>(`${this.apiUrl}/${id}`);
  }

  // Crear complemento
  createComplement(complement: ProductComplementCreate): Observable<ProductComplement> {
    return this.http.post<ProductComplement>(this.apiUrl, complement);
  }

  // Actualizar complemento
  updateComplement(id: number, complement: Partial<ProductComplementCreate>): Observable<ProductComplement> {
    return this.http.put<ProductComplement>(`${this.apiUrl}/${id}`, complement);
  }

  // Eliminar complemento
  deleteComplement(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Obtener complementos agrupados por producto
  getComplementsByProduct(): Observable<ProductComplementGroup[]> {
    return this.http.get<ProductComplementGroup[]>(`${this.apiUrl}/grouped`);
  }
}

