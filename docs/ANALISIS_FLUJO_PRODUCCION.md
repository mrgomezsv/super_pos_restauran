# 📊 Análisis Completo del Flujo de Producción

## 🎯 Resumen Ejecutivo

Este documento analiza la lógica y proceso completo del sistema de producción, desde las órdenes de compra hasta la facturación en el punto de venta, incluyendo la transformación de materia prima en productos finales mediante recetas y sub-recetas.

---

## 1. 🔄 Flujo General: Orden de Compra → Materia Prima → Productos Finales → POS

```
Órdenes de Compra → Recepción → Materia Prima (Ingredientes) 
    ↓
Recetas (Fórmulas) → Órdenes de Producción → Productos Finales
    ↓
Punto de Venta (Facturación)
```

---

## 2. 📦 Componentes y su Función

### A. **Órdenes de Compra** (`purchase-orders.component.ts`)

**Ubicación:** `src/app/features/purchase-orders/`

**Funcionalidad:**
- Gestión de órdenes de compra a proveedores
- Estados: `pending` → `approved` → `received` → `cancelled`
- Items contienen: `ingredientId`, `ingredientName`, `quantity`, `unitPrice`, `receivedQuantity`
- Almacenamiento: Firestore (`purchase-orders`)

**Flujo:**
1. Crear orden con items (materia prima)
2. Aprobar orden
3. Recibir orden (abre `ReceiveOrderDialogComponent`)

**Estado:** ✅ **FUNCIONA COMPLETAMENTE**

---

### B. **Recepción de Órdenes** (`receive-order-dialog.component.ts`)

**Ubicación:** `src/app/features/purchase-orders/receive-order-dialog/`

**Función Principal:** Convertir órdenes recibidas en stock de ingredientes

**Lógica Clave:**
```typescript
// Líneas 147-172: Actualización de inventario
switchMap(() => {
  const stockUpdates = items
    .filter(item => item.receivedQuantity > 0)
    .map(item => 
      this.productService.addIngredientStock(
        item.ingredientId, 
        item.receivedQuantity
      )
    );
  return forkJoin(stockUpdates); // Ejecuta en paralelo
})
```

**Resultado:** Aumenta el stock de ingredientes en Firestore

**Estado:** ✅ **FUNCIONA COMPLETAMENTE**

---

### C. **Gestión de Ingredientes** (`products.component.ts`)

**Ubicación:** `src/app/features/products/`

**Funcionalidad:**
- CRUD de ingredientes (materia prima)
- Almacenamiento: Firestore (`ingredients`)
- Campos principales: `code` (SKU), `name`, `stock`, `unitOfMeasure`, `productType: 'ingredient'`
- SKU: Generación automática secuencial (`000001`, `000002`, ...)

**Servicios:**
- `ProductService.getIngredients()` - Obtener todos
- `ProductService.addIngredientStock()` - Aumentar stock
- `ProductService.createIngredient()` - Crear nuevo

**Estado:** ✅ **FUNCIONA COMPLETAMENTE**

---

### D. **Recetas** (`recetas.component.ts`)

**Ubicación:** `src/app/features/recetas/`

**Modelo:** `Recipe` con `RecipeIngredient[]`

**Estructura:**
- `product_id`: Producto final que se produce
- `ingredients[]`: Lista de ingredientes con cantidades
- `batch_size`: Cantidad que produce la receta
- `cost_per_batch`: Costo calculado

**Relación:**
```
Recipe
  ├─ product_id → Producto Final
  └─ ingredients[] → Materia Prima + cantidades
```

**Estado:** ⚠️ **INCOMPLETO**
- Componente básico existe
- **FALTA:** Diálogo de creación/edición (líneas 130-143 muestran TODOs)
- **FALTA:** Vista de detalles de receta
- **FALTA:** Eliminación de recetas

---

### E. **Órdenes de Producción** (`produccion.component.ts`)

**Ubicación:** `src/app/features/produccion/`

**Estados:** `planned` → `in_progress` → `completed` → `cancelled`

**Acciones:**
1. `startProductionOrder()`: Inicia producción, descuenta inventario de ingredientes
2. `completeProductionOrder(quantity_produced)`: Completa producción, agrega stock del producto final

**Servicios:**
- `RecipeService.getProductionOrders()` - Listar órdenes
- `RecipeService.startProductionOrder()` - Iniciar
- `RecipeService.completeProductionOrder()` - Completar

**Estado:** ⚠️ **PARCIALMENTE FUNCIONAL**
- Visualización funciona
- Iniciar/Completar producción funciona
- **FALTA:** Crear orden de producción desde receta
- **FALTA:** Vista de ingredientes consumidos vs disponibles

---

### F. **Punto de Venta** (`pos.component.ts`)

**Ubicación:** `src/app/features/pos/`

**Funcionalidad:**
- Carga productos: `ProductService.getProducts()` (incluye ingredientes y productos finales)
- Validación de stock: Verifica `product.stock > 0` antes de agregar al carrito
- Venta: `SaleService.createSale()` reduce stock automáticamente

**Tipos de Productos:**
- `'ingredient' | 'preparation' | 'final'` (definido en modelo)
- **Nota:** Solo se usa `'ingredient'` en el código actual

**Estado:** ✅ **FUNCIONA COMPLETAMENTE**

---

## 3. 🔄 Flujo de Transformación Detallado

### **Paso 1: Compra → Materia Prima**

```
Orden de Compra (Firestore)
    ↓ [Recepción]
ReceiveOrderDialogComponent.onSave()
    ↓
ProductService.addIngredientStock(ingredientId, quantity)
    ↓
Firestore: ingredients/{id}.stock += quantity
```

**Archivos Involucrados:**
- `purchase-orders.component.ts`
- `receive-order-dialog.component.ts`
- `product.service.ts` (método `addIngredientStock`)

---

### **Paso 2: Materia Prima → Producto Final (mediante Receta)**

```
Recipe (Backend API)
    ├─ product_id: Producto Final
    └─ ingredients[]: Materia Prima + cantidades
        ↓
ProductionOrder (Backend API)
    ├─ recipe_id
    ├─ quantity_to_produce
    └─ consumption_items[]
        ↓
[Iniciar Producción]
RecipeService.startProductionOrder(id)
    ↓ [Backend]
    - Descuenta ingredientes del inventario
    - Cambia status a 'in_progress'
        ↓
[Completar Producción]
RecipeService.completeProductionOrder(id, quantity_produced)
    ↓ [Backend]
    - Agrega stock al producto final
    - Cambia status a 'completed'
```

**Archivos Involucrados:**
- `recetas.component.ts` (visualización)
- `produccion.component.ts` (gestión de órdenes)
- `recipe.service.ts` (comunicación con backend)
- `recipe.model.ts` (modelos de datos)

---

### **Paso 3: Producto Final → Venta**

```
POS Component
    ↓
ProductService.getProducts() → Filtra productos con stock > 0
    ↓
addToCart(product) → Valida stock disponible
    ↓
SaleService.createSale(sale)
    ↓ [Backend]
    - Reduce stock del producto
    - Crea movimiento de inventario
    - Contabiliza la venta
```

**Archivos Involucrados:**
- `pos.component.ts`
- `sale.service.ts`
- `product.service.ts`

---

## 4. ⚠️ Puntos Críticos Identificados

### ✅ **Lo que SÍ está Implementado:**

1. ✅ Recepción de órdenes actualiza stock de ingredientes
2. ✅ SKU automático para ingredientes
3. ✅ Gestión completa de ingredientes en Firestore
4. ✅ Modelos de recetas y órdenes de producción definidos
5. ✅ POS valida stock antes de vender
6. ✅ Visualización de órdenes de producción

---

### ❌ **Lo que FALTA o está INCOMPLETO:**

#### **1. Módulo de Recetas Incompleto**
- ❌ Diálogo de creación/edición de recetas
- ❌ Selección de producto final desde receta
- ❌ Gestión de ingredientes con cantidades en receta
- ❌ Vista de detalles de receta
- ❌ Eliminación de recetas

**Archivo:** `src/app/features/recetas/recetas.component.ts` (líneas 130-143)

---

#### **2. Creación de Productos Finales**
- ❌ No se pueden crear productos finales desde el frontend
- ❌ Solo se crean ingredientes (`productType: 'ingredient'`)
- ❌ Falta integración con recetas al crear producto final

**Archivo:** `src/app/features/products/product-dialog/product-dialog.component.ts`

---

#### **3. Sub-Recetas (NO IMPLEMENTADO)**
- ❌ No hay soporte para recetas que usan otras recetas como ingredientes
- ❌ No hay cálculo de costos en cascada
- ❌ No hay jerarquía de recetas

**Impacto:** No se pueden crear productos complejos con múltiples niveles de preparación

---

#### **4. Complementos de Productos Finales (NO IMPLEMENTADO)**
- ❌ No hay modelo para complementos
- ❌ No hay lógica en POS para agregar complementos
- ❌ No hay relación entre productos finales y sus complementos

**Impacto:** No se pueden vender productos con opciones adicionales (ej: hamburguesa + papas)

---

#### **5. Integración Receta-Producción**
- ⚠️ Falta crear orden de producción desde receta
- ⚠️ Falta vista de ingredientes consumidos vs disponibles
- ⚠️ Falta validación de stock antes de iniciar producción

**Archivo:** `src/app/features/produccion/produccion.component.ts`

---

#### **6. Tipos de Productos**
- ⚠️ `productType` existe en modelo pero solo se usa `'ingredient'`
- ❌ No se usa `'preparation'` ni `'final'`
- ❌ No hay diferenciación en el POS entre tipos

**Archivo:** `src/app/core/models/product.model.ts` (línea 17)

---

## 5. 🏗️ Arquitectura de Datos

### **Firestore (Frontend)**
- `purchase-orders`: Órdenes de compra
- `ingredients`: Materia prima (con stock)

### **Backend API (REST)**
- `/api/recipes`: Recetas
- `/api/production-orders`: Órdenes de producción
- `/api/products`: Productos finales (probablemente)
- `/api/sales`: Ventas

### **Separación de Responsabilidades**
- **Materia Prima:** Firestore (frontend)
- **Recetas y Producción:** Backend API
- **Productos Finales:** Backend API (probablemente)

---

## 6. 📋 Plan de Implementación

### **Fase 1: Completar Módulo de Recetas** 🔴 PRIORIDAD ALTA
- [ ] Crear diálogo de receta (`recipe-dialog.component.ts`)
- [ ] Implementar creación de recetas
- [ ] Implementar edición de recetas
- [ ] Implementar eliminación de recetas
- [ ] Vista de detalles de receta
- [ ] Selección de producto final desde receta
- [ ] Gestión de ingredientes con cantidades

**Archivos a Crear/Modificar:**
- `src/app/features/recetas/recipe-dialog/recipe-dialog.component.ts`
- `src/app/features/recetas/recipe-dialog/recipe-dialog.component.html`
- `src/app/features/recetas/recipe-dialog/recipe-dialog.component.scss`
- `src/app/features/recetas/recetas.component.ts` (completar métodos)

---

### **Fase 2: Creación de Productos Finales** 🔴 PRIORIDAD ALTA
- [ ] Extender `product-dialog` para soportar tipos de productos
- [ ] Agregar selector de `productType` (ingredient/preparation/final)
- [ ] Integrar creación de producto final con recetas
- [ ] Validar que productos finales tengan receta asociada

**Archivos a Modificar:**
- `src/app/features/products/product-dialog/product-dialog.component.ts`
- `src/app/features/products/product-dialog/product-dialog.component.html`
- `src/app/core/services/product.service.ts` (métodos para productos finales)

---

### **Fase 3: Integración Receta-Producción** 🟡 PRIORIDAD MEDIA
- [ ] Botón "Crear Orden de Producción" desde receta
- [ ] Diálogo para crear orden de producción
- [ ] Validación de stock de ingredientes antes de iniciar
- [ ] Vista de ingredientes consumidos vs disponibles

**Archivos a Crear/Modificar:**
- `src/app/features/recetas/recetas.component.ts` (agregar método)
- `src/app/features/produccion/produccion.component.ts` (mejorar UI)
- `src/app/features/produccion/create-production-dialog/` (nuevo componente)

---

### **Fase 4: Sub-Recetas** 🟡 PRIORIDAD MEDIA
- [ ] Modelo de sub-receta en backend
- [ ] UI para seleccionar recetas como ingredientes
- [ ] Cálculo de costos en cascada
- [ ] Validación de dependencias circulares

**Archivos a Modificar:**
- `src/app/core/models/recipe.model.ts`
- `src/app/features/recetas/recipe-dialog/recipe-dialog.component.ts`
- Backend API (nuevo endpoint)

---

### **Fase 5: Complementos de Productos** 🟢 PRIORIDAD BAJA
- [ ] Modelo de complementos
- [ ] Relación producto-complementos
- [ ] UI en POS para agregar complementos
- [ ] Cálculo de precios con complementos

**Archivos a Crear:**
- `src/app/core/models/complement.model.ts`
- `src/app/features/products/complement-dialog/` (nuevo componente)
- `src/app/features/pos/complement-selector/` (nuevo componente)

---

## 7. 📊 Resumen del Estado Actual

```
✅ Órdenes de Compra → Recepción → Stock de Ingredientes (FUNCIONA)
⚠️ Recetas (Modelo existe, UI incompleta)
⚠️ Órdenes de Producción (Backend existe, integración frontend limitada)
✅ POS valida stock y vende productos (FUNCIONA)
❌ Sub-recetas (NO IMPLEMENTADO)
❌ Complementos (NO IMPLEMENTADO)
```

---

## 8. 🎯 Objetivo Final

**Flujo Completo Esperado:**

```
1. Orden de Compra → Recepción → Materia Prima (Stock) ✅
2. Crear Receta → Asociar Producto Final → Definir Ingredientes ⚠️
3. Crear Orden de Producción desde Receta ⚠️
4. Iniciar Producción → Descontar Ingredientes → Producir Producto Final ✅
5. Producto Final disponible en POS con stock ✅
6. Venta en POS → Reducir stock ✅
7. [FUTURO] Sub-recetas para productos complejos ❌
8. [FUTURO] Complementos para personalización ❌
```

---

## 9. 🔍 Archivos Clave para Revisar

### **Frontend:**
- `src/app/features/recetas/recetas.component.ts` - Módulo de recetas
- `src/app/features/produccion/produccion.component.ts` - Órdenes de producción
- `src/app/features/products/product-dialog/product-dialog.component.ts` - Diálogo de productos
- `src/app/features/purchase-orders/receive-order-dialog/receive-order-dialog.component.ts` - Recepción
- `src/app/core/services/recipe.service.ts` - Servicio de recetas
- `src/app/core/services/product.service.ts` - Servicio de productos

### **Modelos:**
- `src/app/core/models/recipe.model.ts` - Modelos de recetas
- `src/app/core/models/product.model.ts` - Modelos de productos
- `src/app/core/models/sale.model.ts` - Modelos de ventas

---

## 10. 📝 Notas Técnicas

### **Firestore vs Backend API:**
- **Firestore:** Usado para ingredientes (materia prima) y órdenes de compra
- **Backend API:** Usado para recetas, órdenes de producción y productos finales

### **Stock Management:**
- Ingredientes: Stock en Firestore (`ingredients/{id}.stock`)
- Productos finales: Stock en Backend API (probablemente)

### **SKU Generation:**
- Automático y secuencial para ingredientes
- Formato: `000001`, `000002`, etc.
- Generado en `ProductService.getNextSKU()`

---

**Última actualización:** 2025-01-27
**Versión del documento:** 1.0

