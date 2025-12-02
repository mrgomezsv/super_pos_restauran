export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  presentation?: string; // Presentación del producto (ej: "500 ml", "1 kg", etc.)
  price: number;
  cost: number;
  category?: string;
  brand?: string;
  stock: number;
  minStock: number;
  maxStock: number | null;
  isActive: boolean;
  barcode?: string;
  taxRate: number; // Porcentaje de impuesto (ej: 15 para 15%)
  productType: 'ingredient' | 'preparation' | 'final';
  unitOfMeasure: string;
  hasComplements?: boolean; // Indica si el producto tiene complementos disponibles
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ProductSearchFilters {
  search?: string;
  category?: string;
  brand?: string;
  isActive?: boolean;
}
