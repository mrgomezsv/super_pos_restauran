/**
 * Modelos para el sistema de recetas y producción
 */

export interface Recipe {
  id: number;
  company_id: number;
  product_id: number;
  product_name?: string;
  code: string;
  name: string;
  description?: string;
  batch_size: number;
  unit_of_measure: string;
  preparation_time: number;
  cost_per_batch: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  ingredient_product_id: number;
  ingredient_product_name?: string;
  ingredient_recipe_id?: number; // ID de receta si es una sub-receta
  ingredient_recipe_name?: string; // Nombre de receta si es una sub-receta
  is_sub_recipe: boolean; // Indica si es un ingrediente (false) o una sub-receta (true)
  quantity: number;
  unit_of_measure: string;
  unit_cost: number;
  total_cost: number;
  notes?: string;
}

export interface RecipeCreate {
  product_id: number;
  code: string;
  name: string;
  description?: string;
  batch_size: number;
  unit_of_measure: string;
  preparation_time: number;
  ingredients: RecipeIngredientCreate[];
}

export interface RecipeIngredientCreate {
  ingredient_product_id?: number; // Requerido si is_sub_recipe es false
  ingredient_recipe_id?: number; // Requerido si is_sub_recipe es true
  is_sub_recipe: boolean; // Indica si es un ingrediente o una sub-receta
  quantity: number;
  unit_of_measure: string;
  notes?: string;
}

export interface ProductionOrder {
  id: number;
  company_id: number;
  recipe_id: number;
  recipe_name?: string;
  production_number: string;
  production_date: string;
  quantity_to_produce: number;
  quantity_produced: number;
  unit_of_measure: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  cost_per_unit: number;
  total_cost: number;
  notes?: string;
  created_by: number;
  creator_name?: string;
  completed_by?: number;
  completed_by_name?: string;
  createdAt: string;
  updatedAt: string;
  consumption_items: ProductionConsumption[];
}

export interface ProductionConsumption {
  id: number;
  production_order_id: number;
  ingredient_product_id: number;
  ingredient_product_name?: string;
  quantity_required: number;
  quantity_consumed: number;
  unit_of_measure: string;
  unit_cost: number;
  total_cost: number;
}

export interface ProductionOrderCreate {
  recipe_id: number;
  quantity_to_produce: number;
  unit_of_measure: string;
  planned_start_date?: string;
  planned_end_date?: string;
  notes?: string;
  consumption_items: ProductionConsumptionCreate[];
}

export interface ProductionConsumptionCreate {
  ingredient_product_id: number;
  quantity_required: number;
  quantity_consumed: number;
  unit_of_measure: string;
  unit_cost: number;
}

