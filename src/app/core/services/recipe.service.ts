import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Recipe, 
  RecipeCreate,
  ProductionOrder,
  ProductionOrderCreate
} from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private apiUrl = `${environment.apiUrl}/recipes`;
  private productionUrl = `${environment.apiUrl}/production-orders`;

  constructor(private http: HttpClient) {}

  // Recetas
  getRecipes(): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(this.apiUrl);
  }

  getRecipe(id: number): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.apiUrl}/${id}`);
  }

  createRecipe(recipe: RecipeCreate): Observable<Recipe> {
    return this.http.post<Recipe>(this.apiUrl, recipe);
  }

  updateRecipe(id: number, recipe: Partial<RecipeCreate>): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.apiUrl}/${id}`, recipe);
  }

  deleteRecipe(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Órdenes de Producción
  getProductionOrders(status?: string): Observable<ProductionOrder[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ProductionOrder[]>(this.productionUrl, { params });
  }

  getProductionOrder(id: number): Observable<ProductionOrder> {
    return this.http.get<ProductionOrder>(`${this.productionUrl}/${id}`);
  }

  createProductionOrder(order: ProductionOrderCreate): Observable<ProductionOrder> {
    return this.http.post<ProductionOrder>(this.productionUrl, order);
  }

  startProductionOrder(id: number): Observable<any> {
    return this.http.post(`${this.productionUrl}/${id}/start`, {});
  }

  completeProductionOrder(id: number, quantity_produced: number): Observable<any> {
    return this.http.post(`${this.productionUrl}/${id}/complete`, { quantity_produced });
  }
}

