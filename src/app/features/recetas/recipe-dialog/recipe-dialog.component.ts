import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';

import { RecipeService } from '../../../core/services/recipe.service';
import { ProductService } from '../../../core/services/product.service';
import { Recipe, RecipeCreate, RecipeIngredientCreate } from '../../../core/models/recipe.model';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-recipe-dialog',
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
    MatChipsModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './recipe-dialog.component.html',
  styleUrls: ['./recipe-dialog.component.scss']
})
export class RecipeDialogComponent implements OnInit, OnDestroy {
  recipeForm!: FormGroup;
  isEdit = false;
  isLoading = false;
  isSaving = false;
  viewMode = false;
  
  // Productos finales (desde backend API)
  finalProducts: Product[] = [];
  filteredFinalProducts: Product[] = [];
  
  // Ingredientes (desde Firestore)
  ingredients: Product[] = [];
  filteredIngredients: Product[] = [];
  
  // Autocomplete
  ingredientSearchControl = new FormControl('');
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private recipeService: RecipeService,
    private productService: ProductService,
    private toastr: ToastrService,
    private dialogRef: MatDialogRef<RecipeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { recipe?: Recipe; viewMode?: boolean }
  ) {
    this.initializeForm();
    this.recipe = data?.recipe || null;
    this.isEdit = !!this.recipe;
    this.viewMode = data?.viewMode || false;
  }

  recipe: Recipe | null = null;

  ngOnInit(): void {
    this.loadData();
    
    if (this.isEdit && this.recipe) {
      this.loadRecipeData();
    }
    
    if (this.viewMode) {
      this.recipeForm.disable();
    }
    
    // Configurar autocomplete de ingredientes
    this.setupIngredientAutocomplete();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.recipeForm = this.fb.group({
      product_id: ['', Validators.required],
      code: ['', [Validators.required, Validators.minLength(3)]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      batch_size: [1, [Validators.required, Validators.min(0.01)]],
      unit_of_measure: ['unidad', Validators.required],
      preparation_time: [0, [Validators.required, Validators.min(0)]],
      ingredients: this.fb.array([])
    });
  }

  get ingredientsFormArray(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  private loadData(): void {
    this.isLoading = true;
    
    // Cargar productos finales desde backend API
    const finalProducts$ = this.productService.getProducts({ isActive: true }).pipe(
      takeUntil(this.destroy$)
    );
    
    // Cargar ingredientes desde Firestore
    const ingredients$ = this.productService.getIngredients().pipe(
      takeUntil(this.destroy$)
    );
    
    forkJoin({
      products: finalProducts$,
      ingredients: ingredients$
    }).subscribe({
      next: ({ products, ingredients }) => {
        // Filtrar productos finales (que no sean ingredientes)
        // En el backend, los productos finales deberían tener productType: 'final' o 'preparation'
        // Por ahora, asumimos que todos los productos del backend son finales
        this.finalProducts = products.filter(p => 
          p.productType === 'final' || 
          p.productType === 'preparation' || 
          !p.productType || 
          p.productType !== 'ingredient'
        );
        this.filteredFinalProducts = [...this.finalProducts];
        
        // Los ingredientes vienen de Firestore
        this.ingredients = ingredients.filter(i => i.isActive);
        this.filteredIngredients = [...this.ingredients];
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.toastr.error('Error al cargar los datos');
        this.isLoading = false;
      }
    });
  }

  private loadRecipeData(): void {
    if (!this.recipe) return;
    
    this.recipeForm.patchValue({
      product_id: this.recipe.product_id,
      code: this.recipe.code,
      name: this.recipe.name,
      description: this.recipe.description || '',
      batch_size: this.recipe.batch_size,
      unit_of_measure: this.recipe.unit_of_measure,
      preparation_time: this.recipe.preparation_time
    });
    
    // Cargar ingredientes de la receta
    if (this.recipe.ingredients && this.recipe.ingredients.length > 0) {
      this.recipe.ingredients.forEach(ing => {
        this.addIngredient(ing.ingredient_product_id, ing.quantity, ing.unit_of_measure);
      });
    }
  }

  private setupIngredientAutocomplete(): void {
    this.ingredientSearchControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (typeof value === 'string') {
        const searchTerm = value.toLowerCase();
        this.filteredIngredients = this.ingredients.filter(ing =>
          ing.name.toLowerCase().includes(searchTerm) ||
          ing.code.toLowerCase().includes(searchTerm)
        );
      }
    });
  }

  addIngredient(ingredientId?: number, quantity?: number, unitOfMeasure?: string): void {
    const ingredientGroup = this.fb.group({
      ingredient_product_id: [ingredientId || '', Validators.required],
      quantity: [quantity || 0, [Validators.required, Validators.min(0.001)]],
      unit_of_measure: [unitOfMeasure || 'unidad', Validators.required],
      notes: ['']
    });
    
    // Calcular costo cuando cambie el ingrediente o cantidad
    ingredientGroup.get('ingredient_product_id')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.calculateCost();
    });
    
    ingredientGroup.get('quantity')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.calculateCost();
    });
    
    this.ingredientsFormArray.push(ingredientGroup);
  }

  removeIngredient(index: number): void {
    this.ingredientsFormArray.removeAt(index);
    this.calculateCost();
  }

  onIngredientSelected(ingredientId: number): void {
    const ingredient = this.ingredients.find(i => i.id === ingredientId);
    if (ingredient) {
      // Agregar ingrediente si no existe ya
      const existingIndex = this.ingredientsFormArray.controls.findIndex(
        control => control.get('ingredient_product_id')?.value === ingredientId
      );
      
      if (existingIndex === -1) {
        this.addIngredient(ingredientId, 1, ingredient.unitOfMeasure);
        this.ingredientSearchControl.setValue('');
      } else {
        this.toastr.warning('Este ingrediente ya está en la receta');
      }
    }
  }

  getIngredientName(ingredientId: number): string {
    const ingredient = this.ingredients.find(i => i.id === ingredientId);
    return ingredient ? ingredient.name : 'Desconocido';
  }

  getIngredientStock(ingredientId: number): number {
    const ingredient = this.ingredients.find(i => i.id === ingredientId);
    return ingredient ? ingredient.stock : 0;
  }

  calculateCost(): void {
    // El costo se calcula en el backend, pero podemos mostrar un estimado
    // basado en los costos de los ingredientes
    let totalCost = 0;
    
    this.ingredientsFormArray.controls.forEach(control => {
      const ingredientId = control.get('ingredient_product_id')?.value;
      const quantity = control.get('quantity')?.value || 0;
      
      if (ingredientId) {
        const ingredient = this.ingredients.find(i => i.id === ingredientId);
        if (ingredient) {
          // Usar costo del ingrediente si está disponible, sino precio
          const unitCost = ingredient.cost > 0 ? ingredient.cost : ingredient.price;
          totalCost += unitCost * quantity;
        }
      }
    });
    
    // Actualizar el costo estimado (el backend calculará el costo real)
    return totalCost;
  }

  getEstimatedCost(): number {
    return this.calculateCost();
  }

  onSave(): void {
    if (this.recipeForm.valid && this.ingredientsFormArray.length > 0) {
      this.isSaving = true;
      
      const formValue = this.recipeForm.getRawValue();
      const recipeData: RecipeCreate = {
        product_id: formValue.product_id,
        code: formValue.code,
        name: formValue.name,
        description: formValue.description || undefined,
        batch_size: formValue.batch_size,
        unit_of_measure: formValue.unit_of_measure,
        preparation_time: formValue.preparation_time,
        ingredients: formValue.ingredients.map((ing: any) => ({
          ingredient_product_id: ing.ingredient_product_id,
          quantity: ing.quantity,
          unit_of_measure: ing.unit_of_measure,
          notes: ing.notes || undefined
        })) as RecipeIngredientCreate[]
      };
      
      const operation = this.isEdit && this.recipe
        ? this.recipeService.updateRecipe(this.recipe.id, recipeData)
        : this.recipeService.createRecipe(recipeData);
      
      operation.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.toastr.success(
            this.isEdit ? 'Receta actualizada exitosamente' : 'Receta creada exitosamente'
          );
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error saving recipe:', error);
          this.toastr.error(
            error.error?.detail || 
            (this.isEdit ? 'Error al actualizar la receta' : 'Error al crear la receta')
          );
          this.isSaving = false;
        }
      });
    } else {
      this.markFormGroupTouched();
      if (this.ingredientsFormArray.length === 0) {
        this.toastr.warning('Debe agregar al menos un ingrediente a la receta');
      } else {
        this.toastr.warning('Por favor, complete todos los campos requeridos');
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.recipeForm.controls).forEach(key => {
      const control = this.recipeForm.get(key);
      control?.markAsTouched();
    });
    
    this.ingredientsFormArray.controls.forEach(control => {
      Object.keys(control.controls).forEach(key => {
        control.get(key)?.markAsTouched();
      });
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  getProductName(productId: number): string {
    const product = this.finalProducts.find(p => p.id === productId);
    return product ? product.name : 'Desconocido';
  }

  // Validar que hay suficiente stock de ingredientes
  validateIngredientStock(): boolean {
    let hasInsufficientStock = false;
    
    this.ingredientsFormArray.controls.forEach((control, index) => {
      const ingredientId = control.get('ingredient_product_id')?.value;
      const quantity = control.get('quantity')?.value || 0;
      
      if (ingredientId) {
        const ingredient = this.ingredients.find(i => i.id === ingredientId);
        if (ingredient && ingredient.stock < quantity) {
          hasInsufficientStock = true;
        }
      }
    });
    
    return !hasInsufficientStock;
  }
}

