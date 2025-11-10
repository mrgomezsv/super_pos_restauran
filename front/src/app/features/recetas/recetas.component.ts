import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToastrService } from 'ngx-toastr';

import { RecipeService } from '../../core/services/recipe.service';
import { ProductService } from '../../core/services/product.service';
import { Recipe, RecipeCreate } from '../../core/models/recipe.model';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './recetas.component.html',
  styleUrls: ['./recetas.component.scss']
})
export class RecetasComponent implements OnInit, OnDestroy {
  recipes: Recipe[] = [];
  displayedColumns: string[] = ['code', 'name', 'product_name', 'batch_size', 'cost_per_batch', 'status', 'actions'];
  isLoading = true;
  filtersForm: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(
    private recipeService: RecipeService,
    private productService: ProductService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.filtersForm = this.fb.group({
      search: ['']
    });
  }

  ngOnInit(): void {
    this.loadRecipes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRecipes(): void {
    this.isLoading = true;
    
    this.recipeService.getRecipes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recipes) => {
          this.recipes = recipes;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading recipes:', error);
          this.toastr.error('Error al cargar las recetas');
          this.isLoading = false;
        }
      });
  }

  applyFilters(): void {
    this.loadRecipes();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.loadRecipes();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  openRecipeDialog(recipe?: Recipe): void {
    // TODO: Implementar diálogo de receta
    this.toastr.info('Diálogo de receta en desarrollo');
  }

  deleteRecipe(recipe: Recipe): void {
    // TODO: Implementar confirmación y eliminación
    this.toastr.info('Eliminación de receta en desarrollo');
  }

  viewRecipeDetails(recipe: Recipe): void {
    // TODO: Implementar vista de detalles
    this.toastr.info('Vista de detalles en desarrollo');
  }
}

