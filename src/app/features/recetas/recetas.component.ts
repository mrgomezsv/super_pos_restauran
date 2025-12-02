import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
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
import { RecipeDialogComponent } from './recipe-dialog/recipe-dialog.component';

@Component({
    selector: 'app-recetas',
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
  allRecipes: Recipe[] = []; // Lista completa para filtrar
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
    
    // Búsqueda en tiempo real
    this.filtersForm.get('search')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
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
          this.allRecipes = recipes;
          this.applyFilters(); // Aplicar filtros después de cargar
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
    const filters = this.filtersForm.value;
    
    // Aplicar filtros sobre la lista completa
    let filtered = [...this.allRecipes];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.name.toLowerCase().includes(searchLower) ||
        recipe.code.toLowerCase().includes(searchLower) ||
        (recipe.product_name && recipe.product_name.toLowerCase().includes(searchLower))
      );
    }
    
    this.recipes = filtered;
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.applyFilters(); // Aplicar filtros (que mostrará todos al estar vacío)
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  openRecipeDialog(recipe?: Recipe): void {
    const dialogRef = this.dialog.open(RecipeDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      hasBackdrop: true,
      data: { 
        recipe: recipe || null,
        viewMode: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRecipes();
      }
    });
  }

  deleteRecipe(recipe: Recipe): void {
    if (confirm(`¿Está seguro de eliminar la receta "${recipe.name}"?`)) {
      this.recipeService.deleteRecipe(recipe.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Receta eliminada exitosamente');
            this.loadRecipes();
          },
          error: (error) => {
            console.error('Error deleting recipe:', error);
            this.toastr.error(error.error?.detail || 'Error al eliminar la receta');
          }
        });
    }
  }

  viewRecipeDetails(recipe: Recipe): void {
    // Cargar receta completa con ingredientes
    this.recipeService.getRecipe(recipe.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fullRecipe) => {
          // Abrir diálogo en modo solo lectura
          const dialogRef = this.dialog.open(RecipeDialogComponent, {
            width: '900px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            disableClose: false,
            hasBackdrop: true,
            data: { 
              recipe: fullRecipe, 
              viewMode: true 
            }
          });

          dialogRef.afterClosed().subscribe();
        },
        error: (error) => {
          console.error('Error loading recipe details:', error);
          this.toastr.error('Error al cargar los detalles de la receta');
        }
      });
  }
}

