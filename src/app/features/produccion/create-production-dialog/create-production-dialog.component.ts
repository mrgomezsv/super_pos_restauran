import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { RecipeService } from '../../../core/services/recipe.service';
import { ProductService } from '../../../core/services/product.service';
import { Recipe, ProductionOrderCreate, ProductionConsumptionCreate } from '../../../core/models/recipe.model';
import { Product } from '../../../core/models/product.model';

interface IngredientAvailability {
  ingredientId: number;
  ingredientName: string;
  required: number;
  available: number;
  unitOfMeasure: string;
  unitCost: number;
  isAvailable: boolean;
  shortfall: number;
}

@Component({
  selector: 'app-create-production-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-production-dialog.component.html',
  styleUrls: ['./create-production-dialog.component.scss']
})
export class CreateProductionDialogComponent implements OnInit, OnDestroy {
  productionForm!: FormGroup;
  isLoading = false;
  isSaving = false;
  recipe: Recipe | null = null;
  ingredients: Product[] = [];
  ingredientAvailability: IngredientAvailability[] = [];
  hasInsufficientStock = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private recipeService: RecipeService,
    private productService: ProductService,
    private toastr: ToastrService,
    private dialogRef: MatDialogRef<CreateProductionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { recipe: Recipe }
  ) {
    this.recipe = data.recipe;
    this.initializeForm();
  }

  ngOnInit(): void {
    if (this.recipe) {
      this.loadIngredientAvailability();
      this.productionForm.patchValue({
        recipe_id: this.recipe.id,
        unit_of_measure: this.recipe.unit_of_measure,
        quantity_to_produce: this.recipe.batch_size
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.productionForm = this.fb.group({
      recipe_id: [this.recipe?.id || '', Validators.required],
      quantity_to_produce: [1, [Validators.required, Validators.min(0.01)]],
      unit_of_measure: [this.recipe?.unit_of_measure || 'unidad', Validators.required],
      planned_start_date: [''],
      planned_end_date: [''],
      notes: ['']
    });

    // Recalcular disponibilidad cuando cambie la cantidad
    this.productionForm.get('quantity_to_produce')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.calculateIngredientAvailability();
    });
  }

  private loadIngredientAvailability(): void {
    if (!this.recipe || !this.recipe.ingredients) return;

    this.isLoading = true;

    // Cargar ingredientes desde Firestore
    this.productService.getIngredients().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (ingredients) => {
        this.ingredients = ingredients;
        this.calculateIngredientAvailability();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading ingredients:', error);
        this.toastr.error('Error al cargar los ingredientes');
        this.isLoading = false;
      }
    });
  }

  private calculateIngredientAvailability(): void {
    if (!this.recipe || !this.recipe.ingredients) return;

    const quantityToProduce = this.productionForm.get('quantity_to_produce')?.value || 1;
    const batchSize = this.recipe.batch_size || 1;
    const multiplier = quantityToProduce / batchSize;

    this.ingredientAvailability = this.recipe.ingredients.map(recipeIngredient => {
      const ingredient = this.ingredients.find(i => i.id === recipeIngredient.ingredient_product_id);
      const required = recipeIngredient.quantity * multiplier;
      const available = ingredient?.stock || 0;
      const isAvailable = available >= required;
      const shortfall = Math.max(0, required - available);

      // Calcular costo unitario
      const unitCost = ingredient ? (ingredient.cost > 0 ? ingredient.cost : ingredient.price) : 0;

      return {
        ingredientId: recipeIngredient.ingredient_product_id,
        ingredientName: ingredient?.name || recipeIngredient.ingredient_product_name || 'Desconocido',
        required: required,
        available: available,
        unitOfMeasure: recipeIngredient.unit_of_measure,
        unitCost: unitCost,
        isAvailable: isAvailable,
        shortfall: shortfall
      };
    });

    // Verificar si hay stock insuficiente
    this.hasInsufficientStock = this.ingredientAvailability.some(ing => !ing.isAvailable);
  }

  getIngredientStatusClass(ingredient: IngredientAvailability): string {
    if (ingredient.isAvailable) {
      return 'available';
    } else if (ingredient.available > 0) {
      return 'partial';
    } else {
      return 'unavailable';
    }
  }

  getIngredientStatusIcon(ingredient: IngredientAvailability): string {
    if (ingredient.isAvailable) {
      return 'check_circle';
    } else if (ingredient.available > 0) {
      return 'warning';
    } else {
      return 'error';
    }
  }

  getIngredientStatusText(ingredient: IngredientAvailability): string {
    if (ingredient.isAvailable) {
      return 'Disponible';
    } else if (ingredient.available > 0) {
      return `Faltan ${ingredient.shortfall.toFixed(2)} ${ingredient.unitOfMeasure}`;
    } else {
      return 'Sin stock';
    }
  }

  onSave(): void {
    if (this.productionForm.valid && !this.hasInsufficientStock) {
      this.isSaving = true;

      const formValue = this.productionForm.getRawValue();
      const quantityToProduce = formValue.quantity_to_produce;
      const batchSize = this.recipe?.batch_size || 1;
      const multiplier = quantityToProduce / batchSize;

      // Crear items de consumo basados en los ingredientes de la receta
      const consumptionItems: ProductionConsumptionCreate[] = this.ingredientAvailability.map(ing => ({
        ingredient_product_id: ing.ingredientId,
        quantity_required: ing.required,
        quantity_consumed: 0, // Se consumirá al iniciar la producción
        unit_of_measure: ing.unitOfMeasure,
        unit_cost: ing.unitCost
      }));

      const productionOrderData: ProductionOrderCreate = {
        recipe_id: this.recipe!.id,
        quantity_to_produce: quantityToProduce,
        unit_of_measure: formValue.unit_of_measure,
        planned_start_date: formValue.planned_start_date || undefined,
        planned_end_date: formValue.planned_end_date || undefined,
        notes: formValue.notes || undefined,
        consumption_items: consumptionItems
      };

      this.recipeService.createProductionOrder(productionOrderData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Orden de producción creada exitosamente');
            this.dialogRef.close(true);
          },
          error: (error) => {
            console.error('Error creating production order:', error);
            this.toastr.error(error.error?.detail || 'Error al crear la orden de producción');
            this.isSaving = false;
          }
        });
    } else {
      if (this.hasInsufficientStock) {
        this.toastr.warning('No hay suficiente stock de ingredientes para esta producción');
      } else {
        this.toastr.warning('Por favor, complete todos los campos requeridos');
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getTotalEstimatedCost(): number {
    return this.ingredientAvailability.reduce((total, ing) => {
      return total + (ing.required * ing.unitCost);
    }, 0);
  }
}

