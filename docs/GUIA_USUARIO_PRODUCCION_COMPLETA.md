# 📖 Guía Completa del Usuario: Sistema de Producción

## 🎯 Introducción

Esta guía te llevará paso a paso por todo el flujo de producción, desde la compra de materia prima hasta la venta de productos finales en el punto de venta, incluyendo el uso de recetas, sub-recetas y complementos.

---

## 📋 Tabla de Contenidos

1. [Flujo General](#flujo-general)
2. [Paso 1: Crear Ingredientes (Materia Prima)](#paso-1-crear-ingredientes-materia-prima)
3. [Paso 2: Crear Órdenes de Compra](#paso-2-crear-órdenes-de-compra)
4. [Paso 3: Recibir Órdenes de Compra](#paso-3-recibir-órdenes-de-compra)
5. [Paso 4: Crear Productos Finales](#paso-4-crear-productos-finales)
6. [Paso 5: Crear Recetas](#paso-5-crear-recetas)
7. [Paso 6: Usar Sub-Recetas](#paso-6-usar-sub-recetas)
8. [Paso 7: Crear Órdenes de Producción](#paso-7-crear-órdenes-de-producción)
9. [Paso 8: Iniciar y Completar Producción](#paso-8-iniciar-y-completar-producción)
10. [Paso 9: Configurar Complementos](#paso-9-configurar-complementos)
11. [Paso 10: Vender en el Punto de Venta](#paso-10-vender-en-el-punto-de-venta)

---

## 🔄 Flujo General

```
1. Crear Ingredientes (Materia Prima)
   ↓
2. Crear Orden de Compra → Recibir → Stock de Ingredientes
   ↓
3. Crear Productos Finales
   ↓
4. Crear Recetas (con ingredientes y/o sub-recetas)
   ↓
5. Crear Orden de Producción desde Receta
   ↓
6. Iniciar Producción → Descontar Ingredientes
   ↓
7. Completar Producción → Agregar Stock de Producto Final
   ↓
8. Configurar Complementos (Opcional)
   ↓
9. Vender en POS
```

---

## 📦 Paso 1: Crear Ingredientes (Materia Prima)

**Ubicación:** Menú lateral → **Productos**

### Pasos:

1. Haz clic en el botón **"Agregar Ingrediente"**
2. Completa el formulario:
   - **SKU**: Se genera automáticamente (000001, 000002, etc.)
   - **Nombre**: Ej: "Harina", "Pollo", "Aceite"
   - **Presentación**: Ej: "1 kg", "500 ml"
   - **Unidad de Medida**: Ej: "kg", "litro", "unidad"
   - **Stock Mínimo**: Cantidad mínima antes de alertar
   - **Stock Máximo**: (Opcional) Cantidad máxima
   - **Estado**: Activo/Inactivo
3. Haz clic en **"Guardar"**

### 💡 Tipos de Productos:

- **Ingrediente**: Materia prima que se usa en recetas
- **Preparación**: Producto intermedio (puede usarse en otras recetas)
- **Final**: Producto terminado que se vende al cliente

> **Nota:** Para materia prima, siempre selecciona **"Ingrediente"**

---

## 🛒 Paso 2: Crear Órdenes de Compra

**Ubicación:** Menú lateral → **Órdenes de Compra**

### Pasos:

1. Haz clic en **"Nueva Orden de Compra"**
2. Selecciona el **Proveedor**
3. Agrega items:
   - Selecciona el **Ingrediente** de la lista
   - Ingresa la **Cantidad** a comprar
   - Ingresa el **Precio Unitario**
4. Haz clic en **"Guardar Orden"**
5. **Aprueba la orden** haciendo clic en el botón de aprobación

---

## ✅ Paso 3: Recibir Órdenes de Compra

**Ubicación:** Misma pantalla de Órdenes de Compra

### Pasos:

1. Busca la orden aprobada en la tabla
2. Haz clic en el botón **"Recibir Orden"** (icono de check ✓)
3. En el diálogo que se abre:
   - Ingresa la **Cantidad Recibida** para cada item
   - Puedes recibir parcialmente (menos cantidad de la ordenada)
4. Haz clic en **"Confirmar Recepción"**

### ✨ Resultado:

- ✅ El stock de los ingredientes se actualiza automáticamente
- ✅ La orden cambia a estado "Recibida"
- ✅ Puedes ver el nuevo stock en la sección de Productos

---

## 🍽️ Paso 4: Crear Productos Finales

**Ubicación:** Menú lateral → **Productos**

### Pasos:

1. Haz clic en **"Agregar Ingrediente"** (el mismo botón, pero selecciona tipo "Final")
2. En el formulario:
   - **Tipo de Producto**: Selecciona **"Final"**
   - **SKU**: Se genera automáticamente
   - **Nombre**: Ej: "Pollo al Horno", "Hamburguesa"
   - **Precio**: Precio de venta al cliente
   - **Costo**: Costo del producto (se calculará con la receta)
   - **Impuesto**: Porcentaje de IVA (ej: 13%)
   - **Unidad de Medida**: Ej: "unidad", "porción"
3. Haz clic en **"Guardar"**

> **Importante:** Este producto será el resultado de tu receta. Asegúrate de que el nombre coincida con lo que quieres producir.

---

## 📝 Paso 5: Crear Recetas

**Ubicación:** Menú lateral → **Recetas**

### Pasos:

1. Haz clic en **"Nueva Receta"**
2. Completa los datos básicos:
   - **Producto Final**: Selecciona el producto que producirá esta receta
   - **Código**: Ej: "REC-001"
   - **Nombre**: Ej: "Receta de Pollo al Horno"
   - **Tamaño de Lote**: Cantidad que produce esta receta (ej: 10 unidades)
   - **Unidad de Medida**: Ej: "unidad"
   - **Tiempo de Preparación**: En minutos
3. **Agregar Ingredientes:**
   - Selecciona el tipo: **"Ingrediente"** o **"Sub-Receta"**
   - Si es **Ingrediente**:
     - Busca y selecciona el ingrediente
     - Ingresa la **Cantidad** necesaria
     - Selecciona la **Unidad de Medida**
   - Si es **Sub-Receta**:
     - Busca y selecciona una receta existente
     - Ingresa la **Cantidad** de esa receta necesaria
   - Repite para todos los ingredientes
4. El sistema mostrará el **Costo Estimado** automáticamente
5. Haz clic en **"Guardar Receta"**

### 💡 Ejemplo de Receta:

**Receta: Pollo al Horno (Lote: 10 unidades)**
- Harina: 1.0 kg
- Pollo: 10 unidades
- Aceite: 0.5 litros
- Sal: 0.1 kg
- Cebolla: 0.5 kg

---

## 🔗 Paso 6: Usar Sub-Recetas

**¿Qué son las Sub-Recetas?**

Las sub-recetas permiten usar una receta como ingrediente de otra receta. Por ejemplo:
- **Receta A**: Salsa Especial (produce 5 litros)
- **Receta B**: Pollo al Horno (usa 0.5 litros de Salsa Especial)

### Pasos para Usar Sub-Recetas:

1. **Primero crea la receta base** (ej: Salsa Especial)
2. **Luego crea la receta que la usará** (ej: Pollo al Horno)
3. Al agregar ingredientes:
   - Selecciona el tipo: **"Sub-Receta"**
   - Busca y selecciona la receta base (Salsa Especial)
   - Ingresa la cantidad necesaria (ej: 0.5 litros)
4. El sistema calculará automáticamente los ingredientes base necesarios

### ⚠️ Validaciones:

- ✅ El sistema previene **dependencias circulares** (no puedes usar una receta que se referencia a sí misma)
- ✅ Muestra el **lote de la sub-receta** para referencia
- ✅ Calcula el costo en cascada automáticamente

### 💡 Ejemplo Completo:

**Receta 1: Salsa Especial (Lote: 5 litros)**
- Tomate: 2 kg
- Cebolla: 0.5 kg
- Especias: 0.1 kg

**Receta 2: Pollo al Horno (Lote: 10 unidades)**
- Pollo: 10 unidades
- Salsa Especial (Sub-Receta): 0.5 litros ← Usa la Receta 1
- Harina: 1 kg

Al producir Pollo al Horno, el sistema expandirá automáticamente:
- Pollo: 10 unidades
- Tomate: 0.2 kg (calculado desde Salsa Especial)
- Cebolla: 0.05 kg (calculado desde Salsa Especial)
- Especias: 0.01 kg (calculado desde Salsa Especial)
- Harina: 1 kg

---

## 🏭 Paso 7: Crear Órdenes de Producción

**Ubicación:** Menú lateral → **Recetas**

### Pasos:

1. Busca la receta que quieres producir en la tabla
2. Haz clic en el botón **"Crear Orden de Producción"** (icono de manufactura 🏭)
3. En el diálogo que se abre:
   - **Cantidad a Producir**: Ingresa cuántas unidades quieres producir
   - **Fecha de Inicio Planificada**: (Opcional)
   - **Fecha de Fin Planificada**: (Opcional)
   - **Notas**: (Opcional)
4. El sistema mostrará:
   - ✅ **Ingredientes Requeridos**: Lista con cantidades necesarias
   - ✅ **Stock Disponible**: Stock actual de cada ingrediente
   - ✅ **Estado de Stock**: 
     - 🟢 **Suficiente**: Tienes suficiente stock
     - 🟡 **Bajo**: Tienes algo pero no suficiente
     - 🔴 **Insuficiente**: No tienes stock
   - ✅ **Costo Estimado**: Costo total de producción
5. Si hay stock suficiente, haz clic en **"Crear Orden"**
6. Si hay stock insuficiente, primero recibe más ingredientes

> **Nota:** Si usas sub-recetas, el sistema expandirá automáticamente todos los ingredientes base necesarios.

---

## ⚙️ Paso 8: Iniciar y Completar Producción

**Ubicación:** Menú lateral → **Producción**

### 8.1 Iniciar Producción

1. Busca la orden de producción en estado **"Planificada"**
2. Haz clic en el botón **"Iniciar Producción"** (icono de play ▶️)
3. Confirma la acción
4. El sistema automáticamente:
   - ✅ **Descontará** los ingredientes del inventario
   - ✅ Cambiará el estado a **"En Progreso"**

### 8.2 Completar Producción

1. Busca la orden en estado **"En Progreso"**
2. Haz clic en el botón **"Completar Producción"** (icono de check ✓)
3. Ingresa la **Cantidad Producida** (puede ser diferente a la planificada)
4. El sistema automáticamente:
   - ✅ **Agregará** el stock del producto final al inventario
   - ✅ Cambiará el estado a **"Completada"**

### 💡 Ejemplo:

**Orden de Producción: PROD-001**
- Receta: Pollo al Horno
- Cantidad Planificada: 10 unidades
- Cantidad Producida: 9 unidades (hubo una pérdida)

**Resultado:**
- ✅ Se agregaron 9 unidades de "Pollo al Horno" al inventario
- ✅ El stock ahora es 9 unidades disponibles para venta

---

## 🎁 Paso 9: Configurar Complementos

**¿Qué son los Complementos?**

Los complementos son productos adicionales que se pueden agregar a un producto final en el punto de venta. Por ejemplo:
- Hamburguesa + Papas Fritas
- Pollo al Horno + Bebida
- Pizza + Salsa Extra

**Ubicación:** Menú lateral → **Productos**

### Pasos:

1. Busca el producto final en la tabla
2. Haz clic en el botón **"Gestionar Complementos"** (icono de círculo con + ➕)
3. En el diálogo:
   - Haz clic en **"Agregar Complemento"**
   - **Producto Complemento**: Selecciona el producto que será complemento
   - **Nombre del Complemento**: Ej: "Papas Fritas", "Bebida"
   - **Precio Adicional**: Precio que se suma al producto principal (puede ser $0)
   - **Orden de Visualización**: Orden en que aparecerá en el POS
   - **Complemento Requerido**: Marca si es obligatorio
4. Repite para todos los complementos
5. Haz clic en **"Guardar Complementos"**

### 💡 Ejemplo:

**Producto: Hamburguesa Clásica**
- Complemento 1: Papas Fritas (+$2.00) - Opcional
- Complemento 2: Bebida (+$1.50) - Opcional
- Complemento 3: Salsa Extra (+$0.00) - Requerido

---

## 🛒 Paso 10: Vender en el Punto de Venta

**Ubicación:** Menú lateral → **Punto de Venta**

### 10.1 Agregar Productos al Carrito

1. Busca el producto en la lista o usa la barra de búsqueda
2. Haz clic en el producto para agregarlo al carrito
3. Si el producto tiene **complementos**:
   - Se abrirá un diálogo automáticamente
   - Selecciona los complementos que quieres agregar
   - Los complementos **requeridos** ya estarán seleccionados
   - Haz clic en **"Agregar al Carrito"**

### 10.2 Gestionar el Carrito

- **Aumentar Cantidad**: Botón **+**
- **Disminuir Cantidad**: Botón **-**
- **Eliminar Item**: Botón de eliminar 🗑️
- **Limpiar Carrito**: Botón "Limpiar" en el header

### 10.3 Procesar Venta

1. Revisa el **Total** en el panel derecho
2. Haz clic en **"Procesar Pago"** (o presiona **F2**)
3. Selecciona el **Método de Pago**:
   - Efectivo
   - Tarjeta
   - Transferencia
   - Bitcoin
4. Ingresa el monto recibido (si es efectivo)
5. Haz clic en **"Confirmar Pago"**

### ✨ Resultado:

- ✅ Se crea la venta
- ✅ Se **descuenta automáticamente** el stock de los productos vendidos
- ✅ Se genera el ticket/recibo
- ✅ El carrito se limpia automáticamente

---

## 📊 Resumen del Flujo Completo

### Ejemplo Real: Producción de "Pollo al Horno"

#### 1. Preparación
- ✅ Crear ingredientes: Harina, Pollo, Aceite, Sal, Cebolla
- ✅ Crear orden de compra y recibir ingredientes
- ✅ Crear producto final: "Pollo al Horno"

#### 2. Receta
- ✅ Crear receta "Pollo al Horno" con:
  - Harina: 1 kg
  - Pollo: 10 unidades
  - Aceite: 0.5 litros
  - Sal: 0.1 kg
  - Cebolla: 0.5 kg
- ✅ Tamaño de lote: 10 unidades

#### 3. Producción
- ✅ Crear orden de producción desde la receta
- ✅ Cantidad a producir: 20 unidades
- ✅ Iniciar producción → Se descuentan ingredientes
- ✅ Completar producción → Se agregan 20 unidades al inventario

#### 4. Complementos (Opcional)
- ✅ Configurar complementos para "Pollo al Horno":
  - Papas Fritas (+$2.00)
  - Bebida (+$1.50)

#### 5. Venta
- ✅ Ir al POS
- ✅ Agregar "Pollo al Horno" al carrito
- ✅ Seleccionar complementos (si los hay)
- ✅ Procesar pago
- ✅ Stock se descuenta automáticamente

---

## ⚠️ Puntos Importantes

### Validaciones del Sistema

1. **Stock Insuficiente:**
   - No puedes iniciar producción si no hay suficiente stock de ingredientes
   - El sistema te mostrará qué ingredientes faltan

2. **Dependencias Circulares:**
   - No puedes usar una receta que se referencia a sí misma
   - El sistema previene esto automáticamente

3. **Stock en POS:**
   - Solo se muestran productos con stock > 0
   - Los productos sin stock aparecen atenuados

4. **Complementos Requeridos:**
   - Si un complemento está marcado como "requerido", se selecciona automáticamente
   - No puedes deseleccionarlo en el POS

### 💡 Consejos

- **Planifica con anticipación:** Crea las recetas antes de necesitar producir
- **Revisa el stock:** Antes de crear una orden de producción, verifica que tengas todos los ingredientes
- **Usa sub-recetas:** Para productos complejos, crea recetas base y úsalas como sub-recetas
- **Complementos opcionales:** Usa complementos para aumentar el valor promedio de venta

---

## 🆘 Solución de Problemas

### Problema: "No puedo crear orden de producción"
- **Causa:** Falta stock de ingredientes
- **Solución:** Recibe más ingredientes mediante órdenes de compra

### Problema: "No aparece el producto en el POS"
- **Causa:** El producto no tiene stock o está inactivo
- **Solución:** Completa una producción o verifica que el producto esté activo

### Problema: "Error al agregar sub-receta"
- **Causa:** Dependencia circular detectada
- **Solución:** Revisa que no estés usando una receta que se referencia a sí misma

### Problema: "El costo no se calcula correctamente"
- **Causa:** Faltan costos en ingredientes o sub-recetas
- **Solución:** Asegúrate de que todos los ingredientes tengan costo definido

---

## 📞 Soporte

Si tienes dudas o problemas, consulta:
- Documentación técnica: `docs/ANALISIS_FLUJO_PRODUCCION.md`
- Tutorial de producción: `docs/TUTORIAL_PRODUCCION.md`

---

**Última actualización:** 2025-01-27  
**Versión:** 2.0 (Incluye Sub-Recetas y Complementos)

