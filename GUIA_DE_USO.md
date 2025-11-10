# 📖 Guía de Uso - Super POS

## Contenido

1. [Flujo Completo del Sistema](#flujo-completo-del-sistema)
2. [Etapa 1: Inicialización del Sistema](#etapa-1-inicialización-del-sistema)
3. [Etapa 2: Configuración Inicial del Administrador](#etapa-2-configuración-inicial-del-administrador)
4. [Etapa 3: Gestión de Ingredientes](#etapa-3-gestión-de-ingredientes)
5. [Etapa 4: Proceso de Venta (POS)](#etapa-4-proceso-de-venta-pos)
6. [Etapa 5: Procesamiento Contable Automático](#etapa-5-procesamiento-contable-automático)
7. [Aspectos Contables Clave](#aspectos-contables-clave)
8. [Resumen del Flujo](#resumen-del-flujo-completo)
9. [Características Importantes](#características-importantes-del-sistema)

---

## 🔄 Flujo Completo del Sistema

Esta guía explica paso a paso cómo funciona el sistema Super POS desde el primer contacto hasta realizar una venta, incluyendo cómo se procesan los aspectos contables automáticamente.

---

## 🎯 Etapa 1: Inicialización del Sistema

### Creación de una Compañía Nueva

Cuando se crea una nueva empresa cliente en el sistema, el sistema ejecuta automáticamente un proceso completo de inicialización (implementado en `backend/company_service.py`):

#### **Paso 1: Crear la Compañía**
Se crea el registro de la compañía con información básica:
- Datos fiscales (NIT, razón social, dirección)
- Plan de suscripción (basic/premium/enterprise)
- Límites de usuarios, productos y ventas por mes
- Estado de la compañía (activa/inactiva/suspendida)

#### **Paso 2: Crear Usuario Administrador**
Se crea automáticamente un usuario administrador:
- Username y contraseña
- Rol "admin" con permisos completos
- Vinculado a la compañía creada

#### **Paso 3: Crear Catálogo de Cuentas Contables**
Se crean automáticamente las cuentas contables estándar:

**Activos:**
- `1101` - Caja General
- `1102` - Bancos
- `1103` - Inventarios
- `1104` - Cuentas por Cobrar
- `1201` - Propiedad, Planta y Equipo

**Pasivos:**
- `2101` - Cuentas por Pagar
- `2102` - IVA Débito Fiscal
- `2103` - IVA Crédito Fiscal

**Patrimonio:**
- `3101` - Capital Social
- `3201` - Utilidades Retenidas

**Ingresos:**
- `4101` - Ventas de Mercaderías
- `4201` - Otros Ingresos

**Gastos:**
- `5101` - Costo de Ventas
- `5201` - Gastos Operativos
- `5301` - Gastos Administrativos

#### **Paso 4: Crear Documentos Fiscales**
Se crean automáticamente los tipos de documentos fiscales con correlativos iniciales:

| Tipo | Código | Prefijo | Correlativo Inicial |
|------|--------|---------|---------------------|
| Consumidor Final | `consumidor_final` | CF | 1 |
| Crédito Fiscal | `credito_fiscal` | CCF | 1 |
| Nota de Crédito | `nota_credito` | NC | 1 |
| Nota de Débito | `nota_debito` | ND | 1 |
| Nota de Remisión | `nota_remision` | NR | 1 |
| Comprobante de Retención | `comprobante_retencion` | CR | 1 |
| Comprobante de Liquidación | `comprobante_liquidacion` | CL | 1 |
| Factura de Exportación | `factura_exportacion` | FE | 1 |
| Factura de Sujeto Excluido | `factura_sujeto_excluido` | FSE | 1 |
| Comprobante de Donación | `comprobante_donacion` | CD | 1 |

**Nota:** Según la DGII de El Salvador, estos son los documentos fiscales principales que un comercio puede emitir.

#### **Paso 5: Crear Categorías de Productos**
Se crean categorías predefinidas:
- Alimentos
- Bebidas
- Limpieza
- Cuidado Personal
- Hogar
- Electrónicos
- Ropa
- Otros

---

## ⚙️ Etapa 2: Configuración Inicial del Administrador

### Login del Usuario Administrador

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Respuesta:**
```json
{
  "token": "mock_token_1_1234567890",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrador Demo",
    "email": "admin@superpos.com",
    "role": "admin",
    "company_id": 1
  },
  "expiresIn": 3600
}
```

### Configuración de la Empresa

El administrador debe configurar:
- ✅ Datos fiscales completos (NIT, NRC, actividad económica)
- ✅ Dirección y datos de contacto
- ✅ Configuración de tickets/facturas
- ✅ Tasa de impuestos por defecto (13% IVA)
- ✅ Configuración de caja registradora

---

## 📦 Etapa 3: Gestión de Ingredientes

### Crear un Producto

#### **Endpoint:**
```http
POST /api/products
Content-Type: application/json
Authorization: Bearer {token}

{
  "code": "SKU-00001",           // Opcional: se genera automáticamente
  "name": "Coca Cola 500ml",
  "description": "Refresco de cola",
  "price": 1.50,                 // Precio de venta
  "cost": 0.75,                   // Costo de compra
  "category": "Bebidas",
  "stock": 100,                   // Stock inicial
  "minStock": 20,                 // Stock mínimo para alertas
  "maxStock": 500,                // Stock máximo
  "barcode": "7801234567890",     // Código de barras
  "taxRate": 13,                  // IVA 13%
  "isActive": true
}
```

### Aspectos Importantes al Crear Productos

#### **1. Precio vs Costo**
- **Precio**: Lo que pagará el cliente
- **Costo**: Lo que costó al negocio
- **Margen**: Diferencia entre precio y costo (utilidad)

```
Margen = Precio - Costo
Margen (%) = ((Precio - Costo) / Costo) × 100
```

#### **2. Control de Stock**
- **Stock**: Cantidad actual disponible
- **Stock Mínimo**: Nivel bajo que genera alertas
- **Stock Máximo**: Capacidad máxima de almacenamiento
- El sistema bloquea ventas si no hay stock suficiente

#### **3. Código de Barras**
- Facilita la búsqueda rápida en el POS
- Usado con lectores de código de barras
- Puede ser el mismo código del producto

#### **4. Categoría**
- Organiza productos para facilitar búsquedas
- Útil para reportes y análisis
- Filtra productos en el POS

#### **5. Impuestos**
- **IVA**: 13% estándar en El Salvador
- Se calcula automáticamente en cada venta
- Se registra en libros contables

### Catálogo de Productos

El sistema permite:
- ✅ Listar todos los productos con filtros
- ✅ Búsqueda por código, nombre o descripción
- ✅ Filtrar por categoría o marca
- ✅ Ver estado de stock en tiempo real
- ✅ Alertas de productos con bajo stock

---

## 🛒 Etapa 4: Proceso de Venta (POS)

### Acceso al POS

Usuario autenticado → Navegar a `/pos`

### Búsqueda y Selección de Productos

El sistema ofrece múltiples formas de buscar productos:

1. **Búsqueda por código/SKU** - Ejemplo: "SKU-00001"
2. **Búsqueda por código de barras** - Automática con scanner
3. **Búsqueda por nombre** - Ejemplo: "Coca Cola"
4. **Filtro por categoría** - Ejemplo: "Bebidas"

### Agregar al Carrito

Cuando se agrega un producto:

```typescript
// Validación de stock
if (quantity > product.stock) {
  error: "Stock insuficiente"
  return
}

// Crear item en carrito
cartItem = {
  productId: product.id,
  productName: product.name,
  quantity: quantity,
  unitPrice: product.price,        // Ej: $1.50
  subtotal: unitPrice * quantity, // Ej: $3.00
  tax: 13,                          // 13% IVA
  total: subtotal * (1 + tax/100)   // Ej: $3.39
}

// Agregar al array cartItems
this.cartItems.push(cartItem)

// Recalcular totales
this.calculateCartTotals()
```

### Cálculo de Totales

El sistema calcula automáticamente:

```typescript
// Subtotales de cada item
subtotal = sum(item.unitPrice * item.quantity)
// Ejemplo: 2 × $1.50 = $3.00

// Impuestos
taxAmount = sum(item.subtotal * (item.tax/100))
// Ejemplo: $3.00 × 13% = $0.39

// Total a pagar
total = subtotal + taxAmount
// Ejemplo: $3.00 + $0.39 = $3.39
```

### Proceso de Pago

#### **1. Seleccionar Método de Pago**
- 💵 **Efectivo (cash)** - Pago en efectivo
- 💳 **Tarjeta (card)** - Pago con tarjeta
- 🏦 **Transferencia (transfer)** - Transferencia bancaria
- ₿ **Bitcoin (bitcoin)** - Pago con criptomoneda

#### **2. Capturar Datos del Cliente**
Si es **Crédito Fiscal**, se solicitan:
- Nombre completo
- DUI/NIT
- Email (opcional)

Si es **Consumidor Final**, no se requieren datos.

#### **3. Ingresar Monto Recibido**
- Si es efectivo: ingresar monto recibido
- Si es otro método: el monto es igual al total

#### **4. Calcular Cambio**
```typescript
change = paymentAmount - total
// Ejemplo: $5.00 - $3.39 = $1.61
```

### Confirmar Venta

#### **Request:**
```http
POST /api/sales
Content-Type: application/json
Authorization: Bearer {token}

{
  "customerName": "Juan Pérez",
  "customerDocument": "12345678-9",
  "customerEmail": "juan@email.com",
  "invoiceType": "consumidor_final",
  "items": [
    {
      "productId": 1,
      "productName": "Coca Cola 500ml",
      "quantity": 2,
      "unitPrice": 1.50,
      "subtotal": 3.00,
      "tax": 13,
      "total": 3.39
    }
  ],
  "subtotal": 3.00,
  "taxAmount": 0.39,
  "total": 3.39,
  "paymentMethod": "cash",
  "paymentAmount": 5.00,
  "change": 1.61,
  "cashierId": 1,
  "cashierName": "Admin",
  "status": "completed"
}
```

#### **Respuesta:**
```json
{
  "id": 1,
  "invoiceNumber": "CF-241215-000001",
  "customerName": "Juan Pérez",
  "items": [...],
  "subtotal": 3.00,
  "taxAmount": 0.39,
  "total": 3.39,
  "paymentMethod": "cash",
  "paymentAmount": 5.00,
  "change": 1.61,
  "cashierId": 1,
  "cashierName": "Admin",
  "createdAt": "2024-12-15T10:30:00",
  "status": "completed"
}
```

---

## 📊 Etapa 5: Procesamiento Contable Automático

Cuando se confirma la venta, el backend ejecuta automáticamente múltiples procesos contables.

### 1. Guardar la Venta en Base de Datos

```python
# backend/main.py línea 709-746
new_sale = DBSale(
    company_id=company_id,
    invoiceNumber="CF-241215-000001",  # Generado automáticamente
    customerName="Juan Pérez",
    customerDocument="12345678-9",
    invoiceType="consumidor_final",
    subtotal=3.00,
    taxAmount=0.39,
    total=3.39,
    paymentMethod="cash",
    paymentAmount=5.00,
    change=1.61,
    cashierId=1,
    cashierName="Admin",
    status="completed",
    createdAt=datetime.now()
)
db.add(new_sale)
db.commit()
```

### 2. Crear Póliza de Ingreso (Partida Doble)

Sistema de partida doble: cada transacción afecta al menos dos cuentas.

```python
# backend/main.py línea 197-236
income_lines = [
    {
        "accountCode": "1101",      # Caja
        "accountName": "Caja General",
        "description": "Venta CF-241215-000001",
        "debit": 3.39,              # Entra dinero
        "credit": 0.0
    },
    {
        "accountCode": "4101",      # Ventas
        "accountName": "Ventas de Mercaderías",
        "description": "Venta CF-241215-000001",
        "debit": 0.0,
        "credit": 3.00              # Ventas aumentan
    },
    {
        "accountCode": "2102",      # IVA Débito Fiscal
        "accountName": "IVA Débito Fiscal",
        "description": "IVA Venta CF-241215-000001",
        "debit": 0.0,
        "credit": 0.39              # IVA a pagar
    }
]

create_accounting_entry(
    source="pos",
    reference="CF-241215-000001",
    description="Venta POS CF-241215-000001",
    lines_data=income_lines,
    created_by=1,
    company_id=1,
    db=db
)
```

**Explicación:**
- **Caja (1101)**: aumenta por el total recibido ($3.39)
- **Ventas (4101)**: aumenta por el subtotal ($3.00)
- **IVA Débito Fiscal (2102)**: aumenta por el IVA ($0.39)

### 3. Crear Póliza de Costo de Ventas

```python
# backend/main.py línea 238-289
cost_lines = [
    {
        "accountCode": "5101",      # Costo de Ventas
        "accountName": "Costo de Ventas",
        "description": "Costo Venta CF-241215-000001",
        "debit": 1.50,              # Sale costo
        "credit": 0.0
    },
    {
        "accountCode": "1103",      # Inventarios
        "accountName": "Inventario de Mercaderías",
        "description": "Salida Inventario CF-241215-000001",
        "debit": 0.0,
        "credit": 1.50              # Sale inventario
    }
]

create_accounting_entry(
    source="pos",
    reference="CF-241215-000001",
    description="Costo Venta POS CF-241215-000001",
    lines_data=cost_lines,
    created_by=1,
    company_id=1,
    db=db
)
```

**Explicación:**
- **Costo de Ventas (5101)**: aumenta por el costo ($1.50)
- **Inventarios (1103)**: disminuye por el costo ($1.50)

### 4. Crear Movimiento de Inventario

```python
# backend/main.py línea 252-261
create_inventory_movement(
    product_id=1,
    movement_type="salida",
    quantity=2,
    unit_cost=0.75,
    reference="CF-241215-000001",
    reference_id=sale.id,
    db=db
)
```

Esto registra que salieron 2 unidades del producto con costo $0.75 cada una.

### 5. Actualizar Stock del Producto

```python
# En el backend, después de procesar la venta
for item in sale_items:
    product = db.query(DBProduct).filter(
        DBProduct.id == item.productId
    ).first()
    
    # Reducir stock
    product.stock -= item.quantity  # Ej: 100 - 2 = 98
    product.updatedAt = datetime.now()
    
db.commit()
```

---

## 📋 Aspectos Contables Clave

### Cuentas que se Afectan en Cada Venta

#### **Partida de Ingreso:**
| Cuenta | Tipo | Movimiento | Monto |
|--------|------|------------|-------|
| 1101 - Caja | Activo | Debe | $3.39 |
| 4101 - Ventas | Ingreso | Haber | $3.00 |
| 2102 - IVA Débito | Pasivo | Haber | $0.39 |

**Total Debe:** $3.39  
**Total Haber:** $3.39  
✅ **Balanceado**

#### **Partida de Costo:**
| Cuenta | Tipo | Movimiento | Monto |
|--------|------|------------|-------|
| 5101 - Costo de Ventas | Gasto | Debe | $1.50 |
| 1103 - Inventarios | Activo | Haber | $1.50 |

**Total Debe:** $1.50  
**Total Haber:** $1.50  
✅ **Balanceado**

### Libros Contables Generados Automáticamente

1. **Libro Diario** - Registro cronológico de todas las pólizas con fecha
2. **Libro Mayor** - Movimientos detallados por cada cuenta
3. **Balance de Comprobación** - Resumen de saldos de todas las cuentas
4. **Libro de Ventas** - Registro de todas las facturas con IVA
5. **Movimientos de Inventario** - Historial de salidas y entradas por producto

### Principio de Partida Doble

El sistema aplica el principio contable fundamental:
- **Cada transacción afecta al menos dos cuentas**
- **La suma de los débitos debe igualar la suma de los créditos**
- **La ecuación contable se mantiene balanceada**

```
Activos = Pasivos + Patrimonio
```

---

## 🎯 Resumen del Flujo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. INICIALIZACIÓN                                          │
│    └─> Crear compañía → Crear admin → Crear cuentas        │
│        contables → Crear documentos fiscales               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CONFIGURACIÓN                                           │
│    └─> Configurar datos fiscales → Configurar impuestos   │
│        → Configurar caja                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GESTIÓN DE PRODUCTOS                                    │
│    └─> Crear productos → Definir precios/costos            │
│        → Configurar stock → Agregar códigos de barras      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. PROCESO DE VENTA                                        │
│    └─> Buscar producto → Agregar al carrito               │
│        → Seleccionar método de pago → Confirmar venta     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PROCESAMIENTO AUTOMÁTICO                                │
│    ├─> Guardar venta                                      │
│    ├─> Reducir stock                                      │
│    ├─> Crear póliza de ingreso                            │
│    ├─> Crear póliza de costo                              │
│    ├─> Crear movimiento de inventario                     │
│    └─> Actualizar libros contables                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. REPORTES Y ANÁLISIS                                     │
│    └─> Ver ventas → Ver libro diario                     │
│        → Ver balance de comprobación → Ver inventarios     │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Características Importantes del Sistema

### 1. Multi-Tenant (Multi-Compañía)
- Cada compañía tiene sus propios datos aislados
- Usuarios solo ven datos de su compañía
- Base de datos compartida con separación lógica

### 2. Contabilidad Automática
- Cada venta genera automáticamente pólizas contables
- No requiere intervención manual del usuario
- Cumple con principios contables básicos

### 3. Control de Stock en Tiempo Real
- Stock se actualiza automáticamente al realizar ventas
- Alertas de productos con bajo stock
- Previene ventas cuando no hay stock suficiente

### 4. Documentos Fiscales
- Correlativos automáticos por tipo de documento
- Numeración única y secuencial
- Formato: CF-241215-000001 (CF + fecha + correlativo)

### 5. Persistencia Real
- Todas las transacciones se guardan en SQLite
- Los datos persisten después de reiniciar el servidor
- Base de datos portátil (un solo archivo)

### 6. Múltiples Métodos de Pago
- Efectivo
- Tarjeta
- Transferencia
- Bitcoin

### 7. Reportes Completo
- Reportes de ventas
- Reportes de inventarios
- Reportes contables (libro diario, mayor, balance)
- Análisis de ventas por período, cajero, método de pago

### 8. Autenticación y Seguridad
- Usuarios con roles y permisos
- Tokens JWT para autenticación
- Guards de rutas protegidas

### 9. Interfaz Intuitiva
- Diseño moderno con Angular Material
- Búsqueda rápida de productos
- Teclado numérico en pantalla
- Feedback visual y sonoro

### 10. Escalabilidad
- Soporta múltiples compañías
- Maneja miles de productos
- Procesa cientos de ventas por día

---

## 📞 Soporte

Para más información o soporte técnico:
- 📧 Email: mrgomez.dev@gmail.com
- 📱 WhatsApp: +503 7756-3510
- 🌐 Website: https://superpos.com

---

**Desarrollado con ❤️ para supermercados modernos**

