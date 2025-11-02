# 🍽️ Tutorial de Producción - Super POS

## Resumen del Sistema

El sistema de producción permite transformar materias primas en productos finales (platillos) mediante recetas y órdenes de producción.

---

## 📋 Flujo Completo

```
1. MATERIAS PRIMAS → 2. PRODUCTO FINAL → 3. RECETA → 4. PRODUCCIÓN → 5. POS
   (con inventario)    (sin inventario)   (formula)   (transforma)   (vende)
```

---

## 🎯 Pasos del Tutorial

### **PASO 1: 📦 Ver Materias Primas Creadas**

**Ubicación:** Gestión de Productos → Categoría "Materia Prima"

Ya tienes creados estos productos con inventario inicial:

| Producto | Stock Inicial | Costo | Precio |
|----------|--------------|-------|--------|
| Harina | 100 kg | $2.00/kg | $3.50/kg |
| Pollo Entero | 50 unid | $5.00/unid | $8.00/unid |
| Aceite | 30 litros | $3.50/L | $5.00/L |
| Sal | 200 kg | $0.80/kg | $1.50/kg |
| Cebolla | 100 kg | $1.20/kg | $2.00/kg |

**Acción:** Solo revisa que existan en tu inventario.

---

### **PASO 2: 🍽️ Ver Producto Final Creado**

**Ubicación:** Gestión de Productos → Categoría "Platillos"

| Producto | Stock Inicial | Precio de Venta |
|----------|--------------|-----------------|
| Pollo al Horno | 0 unidades | $15.00 |

⚠️ Este producto **no tiene stock** porque aún no se ha producido.

**Acción:** Solo revisa que exista el producto.

---

### **PASO 3: 📝 Ver Receta Configurada**

**Ubicación:** Módulo "Recetas" en el sidebar

**Receta:** "Receta Pollo al Horno" (REC-001)

**Ingredientes por platillo:**
- Harina: 0.1 kg
- Pollo Entero: 1 unidad
- Aceite: 0.05 litros
- Sal: 0.01 kg
- Cebolla: 0.05 kg

**Costo calculado:** $5.44 por platillo  
**Margen:** $9.56 por platillo

**Acción:** Solo revisa la receta.

---

### **PASO 4: 🔧 Iniciar Producción**

**Ubicación:** Módulo "Órdenes de Producción" en el sidebar

**Orden:** PROD-001  
**Cantidad:** 10 unidades

**Acción:** 
1. Busca la orden PROD-001 en la tabla
2. Haz clic en el botón **▶️ (play)** de "Iniciar Producción"
3. El sistema automáticamente:
   - ✅ Descontará del inventario:
     - Harina: -1.0 kg (0.1 kg × 10)
     - Pollo: -10 unidades
     - Aceite: -0.5 litros
     - Sal: -0.1 kg
     - Cebolla: -0.5 kg
   - ✅ Cambiará el estado a "En Progreso"

---

### **PASO 5: ✅ Completar Producción**

**Ubicación:** Misma tabla de Órdenes de Producción

**Acción:**
1. Verás el botón **✓ (check)** en PROD-001
2. Haz clic en "Completar Producción"
3. Ingresa la cantidad producida: **10**
4. El sistema automáticamente:
   - ✅ Agregará al inventario:
     - Pollo al Horno: +10 unidades
   - ✅ Actualizará el costo al costo de producción ($5.44/platillo)
   - ✅ Cambiará el estado a "Completada"

---

### **PASO 6: 🛒 Vender en el POS**

**Ubicación:** Punto de Venta en el sidebar

**Acción:**
1. Ve a "Punto de Venta"
2. Busca "Pollo al Horno"
3. Agrégalo al carrito
4. Realiza la venta normalmente
5. El stock se descontará automáticamente

---

## 📊 Resumen de Inventarios

### Antes de la Producción:
- Harina: 100 kg
- Pollo: 50 unidades
- Aceite: 30 litros
- Sal: 200 kg
- Cebolla: 100 kg
- **Pollo al Horno: 0 unidades** ⚠️

### Después de Iniciar Producción:
- Harina: 99 kg (-1)
- Pollo: 40 unidades (-10)
- Aceite: 29.5 litros (-0.5)
- Sal: 199.9 kg (-0.1)
- Cebolla: 99.5 kg (-0.5)
- **Pollo al Horno: 0 unidades** (todavía no)

### Después de Completar Producción:
- Harina: 99 kg
- Pollo: 40 unidades
- Aceite: 29.5 litros
- Sal: 199.9 kg
- Cebolla: 99.5 kg
- **Pollo al Horno: 10 unidades** ✅

---

## 🔍 Verificar Movimientos de Inventario

**Para ver el historial:**

1. Ve a "Reportes" → Tab "Inventario"
2. Podrás ver todos los movimientos automáticos:
   - Salidas de ingredientes (al iniciar producción)
   - Entradas de platillos (al completar producción)

---

## 💡 Conceptos Importantes

### ¿Qué es una Materia Prima?
Producto que se usa como ingrediente. Tiene stock inicial y se descuenta al producir.

### ¿Qué es un Producto Final?
El platillo o producto terminado que se vende. No tiene stock inicial, se produce.

### ¿Qué es una Receta?
La "fórmula" que define qué ingredientes y cantidades se necesitan para producir 1 unidad del producto final.

### ¿Qué es una Orden de Producción?
El proceso de transformar ingredientes en productos finales:
- **Iniciar:** Descuenta inventario de ingredientes
- **Completar:** Agrega inventario del producto final

---

## ⚙️ Características Implementadas

✅ **Control de Stock:** Verificación antes de iniciar producción  
✅ **Cálculo Automático:** Costos y cantidades escalables  
✅ **Movimientos:** Historial completo de inventario  
✅ **Auditoría:** Registro de todas las operaciones  
✅ **Tutorial:** Guía interactiva paso a paso  
✅ **Multi-unidades:** Soporta diferentes unidades de medida  

---

## 🚀 Próximos Pasos

Después de completar este tutorial, podrás:
- Crear tus propias recetas
- Definir tus propios platillos
- Producir en diferentes cantidades
- Gestionar múltiples órdenes de producción simultáneas
- Ver reportes de producción y costos

---

**¿Tienes preguntas?** Revisa el tutorial interactivo en "Órdenes de Producción" haciendo clic en el ícono **❓** en el header.

