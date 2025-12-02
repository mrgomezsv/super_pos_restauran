/**
 * Modelos para complementos de productos
 */

export interface ProductComplement {
  id: number;
  product_id: number; // Producto principal que tiene este complemento
  complement_product_id: number; // Producto que actúa como complemento
  complement_product_name?: string;
  complement_product_code?: string;
  name: string; // Nombre del complemento (ej: "Papas Fritas", "Bebida")
  price: number; // Precio adicional del complemento (puede ser 0 si es gratis)
  is_required: boolean; // Si es requerido o opcional
  is_active: boolean;
  display_order: number; // Orden de visualización
  createdAt: string;
  updatedAt: string;
}

export interface ProductComplementCreate {
  product_id: number;
  complement_product_id: number;
  name: string;
  price: number;
  is_required: boolean;
  display_order: number;
}

export interface ProductComplementGroup {
  product_id: number;
  product_name: string;
  complements: ProductComplement[];
}

// Tipo para complementos en el carrito de compras
export interface CartItemComplement {
  complement_product_id: number;
  complement_product_name: string;
  complement_name: string; // Nombre del complemento (ej: "Papas Fritas")
  price: number; // Precio adicional del complemento
  quantity: number; // Cantidad del complemento
}

