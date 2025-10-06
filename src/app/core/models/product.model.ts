export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  category: string;
  brand?: string;
  stock: number;
  minStock: number;
  maxStock: number;
  isActive: boolean;
  barcode?: string;
  taxRate: number; // Porcentaje de impuesto (ej: 15 para 15%)
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
