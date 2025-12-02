import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl, AbstractControl } from '@angular/forms';
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
  
  // Recetas disponibles para usar como sub-recetas
  availableRecipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];
  
  // Autocomplete
  ingredientSearchControl = new FormControl('');
  recipeSearchControl = new FormControl('');
  ingredientTypeControl = new FormControl<'ingredient' | 'recipe'>('ingredient');
  
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
    
    // Cargar recetas disponibles (excluyendo la receta actual para evitar dependencias circulares)
    const recipes$ = this.recipeService.getRecipes().pipe(
      takeUntil(this.destroy$)
    );
    
    forkJoin({
      products: finalProducts$,
      ingredients: ingredients$,
      recipes: recipes$
    }).subscribe({
      next: ({ products, ingredients, recipes }) => {
        // Filtrar productos finales (que no sean ingredientes)
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
        
        // Filtrar recetas disponibles (excluir la receta actual si estamos editando)
        this.availableRecipes = recipes.filter(r => 
          r.isActive && (!this.recipe || r.id !== this.recipe.id)
        );
        this.filteredRecipes = [...this.availableRecipes];
        
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
    
    // Cargar ingredientes y sub-recetas de la receta
    if (this.recipe.ingredients && this.recipe.ingredients.length > 0) {
      this.recipe.ingredients.forEach(ing => {
        if (ing.is_sub_recipe && ing.ingredient_recipe_id) {
          this.addIngredient(undefined, ing.quantity, ing.unit_of_measure, true, ing.ingredient_recipe_id);
        } else {
          this.addIngredient(ing.ingredient_product_id, ing.quantity, ing.unit_of_measure, false);
        }
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

    this.recipeSearchControl.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(value => {
      if (typeof value === 'string') {
        const searchTerm = value.toLowerCase();
        this.filteredRecipes = this.availableRecipes.filter(recipe =>
          recipe.name.toLowerCase().includes(searchTerm) ||
          recipe.code.toLowerCase().includes(searchTerm)
        );
      }
    });
  }

  addIngredient(ingredientId?: number, quantity?: number, unitOfMeasure?: string, isSubRecipe: boolean = false, recipeId?: number): void {
    const ingredientGroup = this.fb.group({
      is_sub_recipe: [isSubRecipe, Validators.required],
      ingredient_product_id: [ingredientId || null],
      ingredient_recipe_id: [recipeId || null],
      quantity: [quantity || 0, [Validators.required, Validators.min(0.001)]],
      unit_of_measure: [unitOfMeasure || 'unidad', Validators.required],
      notes: ['']
    });

    // Validación condicional: requerir ingredient_product_id si no es sub-receta, o ingredient_recipe_id si es sub-receta
    ingredientGroup.get('is_sub_recipe')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isSub => {
      const productIdControl = ingredientGroup.get('ingredient_product_id');
      const recipeIdControl = ingredientGroup.get('ingredient_recipe_id');
      
      if (isSub) {
        productIdControl?.clearValidators();
        recipeIdControl?.setValidators([Validators.required]);
      } else {
        productIdControl?.setValidators([Validators.required]);
        recipeIdControl?.clearValidators();
      }
      
      productIdControl?.updateValueAndValidity({ emitEvent: false });
      recipeIdControl?.updateValueAndValidity({ emitEvent: false });
    });
    
    // Calcular costo cuando cambie el ingrediente, receta o cantidad
    ingredientGroup.get('ingredient_product_id')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.calculateCost();
    });

    ingredientGroup.get('ingredient_recipe_id')?.valueChanges.pipe(
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
        control => !control.get('is_sub_recipe')?.value && 
                   control.get('ingredient_product_id')?.value === ingredientId
      );
      
      if (existingIndex === -1) {
        this.addIngredient(ingredientId, 1, ingredient.unitOfMeasure, false);
        this.ingredientSearchControl.setValue('');
      } else {
        this.toastr.warning('Este ingrediente ya está en la receta');
      }
    }
  }

  onRecipeSelected(recipeId: number): void {
    const recipe = this.availableRecipes.find(r => r.id === recipeId);
    if (recipe) {
      // Validar dependencia circular (mejorado)
      if (this.checkCircularDependency(recipeId)) {
        this.toastr.error('No se puede agregar esta receta: crearía una dependencia circular');
        return;
      }

      // Agregar sub-receta si no existe ya
      const existingIndex = this.ingredientsFormArray.controls.findIndex(
        control => control.get('is_sub_recipe')?.value && 
                   control.get('ingredient_recipe_id')?.value === recipeId
      );
      
      if (existingIndex === -1) {
        this.addIngredient(undefined, 1, recipe.unit_of_measure, true, recipeId);
        this.recipeSearchControl.setValue('');
      } else {
        this.toastr.warning('Esta receta ya está en la lista');
      }
    }
  }

  private wouldCreateCircularDependency(recipeId: number): boolean {
    // Si estamos editando y la receta a agregar es la misma que estamos editando
    if (this.recipe && recipeId === this.recipe.id) {
      return true;
    }

    // Verificar si ya tenemos esta receta en los ingredientes actuales
    const alreadyInList = this.ingredientsFormArray.controls.some(control => {
      return control.get('is_sub_recipe')?.value && 
             control.get('ingredient_recipe_id')?.value === recipeId;
    });

    if (alreadyInList) {
      return false; // Ya está en la lista, no es circular
    }

    // Verificar dependencias indirectas: cargar la receta y verificar si contiene esta receta
    // Por ahora, solo verificamos dependencias directas en los ingredientes actuales
    // El backend debería hacer una validación más completa
    return false;
  }

  // Método para validar dependencias circulares recursivamente (mejorado)
  private checkCircularDependency(recipeId: number, visited: Set<number> = new Set()): boolean {
    if (visited.has(recipeId)) {
      return true; // Dependencia circular detectada
    }

    // Si estamos editando esta receta, es circular
    if (this.recipe && recipeId === this.recipe.id) {
      return true;
    }

    visited.add(recipeId);

    // Verificar si alguno de los ingredientes actuales es esta receta
    const hasThisRecipe = this.ingredientsFormArray.controls.some(control => {
      const isSubRecipe = control.get('is_sub_recipe')?.value;
      const subRecipeId = control.get('ingredient_recipe_id')?.value;
      
      if (isSubRecipe && subRecipeId === recipeId) {
        return true;
      }
      
      // Verificar recursivamente si alguna sub-receta contiene esta receta
      if (isSubRecipe && subRecipeId) {
        return this.checkCircularDependency(subRecipeId, new Set(visited));
      }
      
      return false;
    });

    visited.delete(recipeId);
    return hasThisRecipe;
  }

  getIngredientName(ingredientId: number): string {
    const ingredient = this.ingredients.find(i => i.id === ingredientId);
    return ingredient ? ingredient.name : 'Desconocido';
  }

  getIngredientStock(ingredientId: number): number {
    const ingredient = this.ingredients.find(i => i.id === ingredientId);
    return ingredient ? ingredient.stock : 0;
  }

  getRecipeName(recipeId: number): string {
    const recipe = this.availableRecipes.find(r => r.id === recipeId);
    return recipe ? recipe.name : 'Receta desconocida';
  }

  getRecipeBatchSize(recipeId: number): string {
    const recipe = this.availableRecipes.find(r => r.id === recipeId);
    if (recipe) {
      return `${recipe.batch_size} ${recipe.unit_of_measure}`;
    }
    return 'N/A';
  }

  getItemName(control: any): string {
    const isSubRecipe = control.get('is_sub_recipe')?.value;
    if (isSubRecipe) {
      const recipeId = control.get('ingredient_recipe_id')?.value;
      return recipeId ? this.getRecipeName(recipeId) : 'Receta no seleccionada';
    } else {
      const ingredientId = control.get('ingredient_product_id')?.value;
      return ingredientId ? this.getIngredientName(ingredientId) : 'Ingrediente no seleccionado';
    }
  }

  getItemType(control: any): string {
    return control.get('is_sub_recipe')?.value ? 'Sub-Receta' : 'Ingrediente';
  }

  calculateCost(): number {
    // El costo se calcula en el backend, pero podemos mostrar un estimado
    // basado en los costos de los ingredientes y sub-recetas (cálculo en cascada)
    let totalCost = 0;
    
    this.ingredientsFormArray.controls.forEach(control => {
      const isSubRecipe = control.get('is_sub_recipe')?.value;
      const quantity = control.get('quantity')?.value || 0;
      
      if (isSubRecipe) {
        // Si es una sub-receta, usar su costo por lote
        const recipeId = control.get('ingredient_recipe_id')?.value;
        if (recipeId) {
          const recipe = this.availableRecipes.find(r => r.id === recipeId);
          if (recipe) {
            const batchSize = recipe.batch_size || 1;
            const costPerUnit = recipe.cost_per_batch / batchSize;
            totalCost += costPerUnit * quantity;
          }
        }
      } else {
        // Si es un ingrediente, usar su costo unitario
        const ingredientId = control.get('ingredient_product_id')?.value;
        if (ingredientId) {
          const ingredient = this.ingredients.find(i => i.id === ingredientId);
          if (ingredient) {
            // Usar costo del ingrediente si está disponible, sino precio
            const unitCost = ingredient.cost > 0 ? ingredient.cost : ingredient.price;
            totalCost += unitCost * quantity;
          }
        }
      }
    });
    
    // Actualizar el costo estimado (el backend calculará el costo real en cascada)
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
          ingredient_product_id: ing.is_sub_recipe ? undefined : ing.ingredient_product_id,
          ingredient_recipe_id: ing.is_sub_recipe ? ing.ingredient_recipe_id : undefined,
          is_sub_recipe: ing.is_sub_recipe || false,
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
      if (control instanceof FormGroup) {
        Object.keys(control.controls).forEach(key => {
          control.get(key)?.markAsTouched();
        });
      }
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

