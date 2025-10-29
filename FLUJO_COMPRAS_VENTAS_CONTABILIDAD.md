# Flujo Completo: Compras → Inventario → Ventas → Contabilidad

## 📋 Visión General del Flujo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO DEL SISTEMA                        │
└─────────────────────────────────────────────────────────────────────┘

1. CREAR PROVEEDOR
   ↓
2. CREAR ORDEN DE COMPRA (PO)
   ↓
3. RECIBIR MERCADERÍA (Goods Receipt)
   ↓
4. PRODUCTOS DISPONIBLES EN INVENTARIO
   ↓
5. VENTA EN POS
   ↓
6. CONTABILIZACIÓN AUTOMÁTICA
   ↓
7. REPORTES Y ANÁLISIS
```

---

## ✅ LO QUE YA EXISTE

### 1. **Proveedores (Suppliers)**
- ✅ Modelo en BD: `Supplier`
- ✅ Endpoints: GET, POST, PUT, DELETE `/api/suppliers`
- ✅ Componente frontend en `/admin/suppliers`

### 2. **Productos con SKU Único**
- ✅ Modelo en BD: `Product` con `code` único por compañía
- ✅ Generación automática de SKU secuencial: `SKU00001`, `SKU00002`, etc.
- ✅ Endpoints: GET, POST, PUT, DELETE `/api/products`
- ✅ Validación de unicidad por compañía

### 3. **Ventas en POS**
- ✅ Modelo: `Sale` y `SaleItem`
- ✅ Endpoint: POST `/api/sales`
- ✅ Integración con inventario (reduce stock automáticamente)

### 4. **Contabilización Automática de Ventas**
- ✅ Función `post_sale_to_accounting()` en `main.py`
- ✅ Crea asientos contables automáticamente:
  - Asiento de Ingreso: Caja + Ventas + IVA
  - Asiento de Costo: Costo de Ventas + Inventario (reducción)
- ✅ Crea movimientos de inventario (salidas)

### 5. **Módulos Contables**
- ✅ Diario General
- ✅ Mayor
- ✅ Balance de Prueba (Trial Balance)
- ✅ Cuentas por Cobrar (AR)
- ✅ Inventarios

---

## ❌ LO QUE FALTA IMPLEMENTAR

### 1. **Órdenes de Compra (Purchase Orders)**

**Estado:** No existe

**Modelos necesarios:**
```python
# database.py
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    po_number = Column(String(50), nullable=False, unique=True)  # OC-001, OC-002
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    order_date = Column(DateTime, nullable=False)
    expected_delivery_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, received, cancelled
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    supplier = relationship("Supplier")
    items = relationship("PurchaseOrderItem", cascade="all, delete-orphan")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # Null si producto nuevo
    product_name = Column(String(200), nullable=False)  # Nombre del producto
    product_sku = Column(String(20), nullable=True)  # SKU si existe
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    tax_rate = Column(Float, default=15.0)
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    received_quantity = Column(Integer, default=0)  # Cantidad recibida
    
    # Relaciones
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")
```

**Endpoints necesarios:**
- `GET /api/purchase-orders` - Listar órdenes
- `POST /api/purchase-orders` - Crear orden
- `GET /api/purchase-orders/{id}` - Ver detalles
- `PUT /api/purchase-orders/{id}/approve` - Aprobar orden
- `PUT /api/purchase-orders/{id}/receive` - Recibir mercancía
- `DELETE /api/purchase-orders/{id}` - Cancelar orden

---

### 2. **Recepción de Mercancía (Goods Receipt)**

**Estado:** No existe

**Lógica:**
1. Se recibe mercancía contra una Orden de Compra
2. Se actualiza el inventario (aumenta stock)
3. Se pueden recibir parcialmente (recibir algunos items, no todos)
4. Se puede crear producto nuevo si no existe en el sistema

**Modelos necesarios:**
```python
class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    receipt_number = Column(String(50), nullable=False, unique=True)  # GR-001
    receipt_date = Column(DateTime, nullable=False, default=func.now())
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    received_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    purchase_order = relationship("PurchaseOrder")
    supplier = relationship("Supplier")
    items = relationship("GoodsReceiptItem", cascade="all, delete-orphan")

class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"
    
    id = Column(Integer, primary_key=True, index=True)
    goods_receipt_id = Column(Integer, ForeignKey("goods_receipts.id"))
    purchase_order_item_id = Column(Integer, ForeignKey("purchase_order_items.id"))
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    
    # Relaciones
    goods_receipt = relationship("GoodsReceipt", back_populates="items")
    product = relationship("Product")
```

**Endpoints necesarios:**
- `POST /api/goods-receipts` - Crear recepción
- `GET /api/goods-receipts` - Listar recepciones
- `GET /api/goods-receipts/{id}` - Ver detalles

**Flujo de recepción:**
1. Usuario selecciona Orden de Compra
2. Indica qué items recibió y en qué cantidad
3. Si el producto no existe, se crea automáticamente con SKU
4. Se actualiza el stock del producto
5. Se crea movimiento de inventario (entrada)
6. Se contabiliza la compra automáticamente

---

### 3. **Contabilización Automática de Compras**

**Estado:** No existe (solo existe para ventas)

**Lógica contable:**
```python
def post_purchase_to_accounting(purchase_order: PurchaseOrder, goods_receipt: GoodsReceipt, db: Session):
    """
    Contabilizar compra en libros contables
    
    Asiento contable:
    - Débito: Inventario de Mercaderías (aumenta)
    - Débito: IVA Crédito Fiscal (si aplica)
    - Crédito: Cuentas por Pagar o Caja (según pago)
    """
    
    # Cuentas contables necesarias:
    # 1201 - Inventario de Mercaderías (Activo)
    # 2102 - IVA Crédito Fiscal (Pasivo)
    # 2101 - Cuentas por Pagar (Pasivo)
    # 1101 - Caja (si se paga de contado)
    
    accounting_lines = [
        {
            "accountCode": "1201",  # Inventario
            "accountName": "Inventario de Mercaderías",
            "description": f"Compra {purchase_order.po_number}",
            "debit": goods_receipt.subtotal,
            "credit": 0.0
        },
        {
            "accountCode": "2102",  # IVA Crédito Fiscal
            "accountName": "IVA Crédito Fiscal",
            "description": f"IVA Compra {purchase_order.po_number}",
            "debit": goods_receipt.tax_amount,
            "credit": 0.0
        },
        {
            "accountCode": "2101",  # Cuentas por Pagar
            "accountName": "Cuentas por Pagar",
            "description": f"Pagar a {supplier.name} - {purchase_order.po_number}",
            "debit": 0.0,
            "credit": goods_receipt.total
        }
    ]
    
    # Crear asiento contable
    journal_entry = create_accounting_entry(
        source="purchase",
        reference=purchase_order.po_number,
        description=f"Compra de {supplier.name} - {purchase_order.po_number}",
        lines_data=accounting_lines,
        created_by=goods_receipt.received_by,
        company_id=purchase_order.company_id,
        db=db
    )
    
    # Crear documento AP (Accounts Payable)
    ap_invoice = ApInvoice(
        company_id=purchase_order.company_id,
        invoiceNumber=purchase_order.po_number,
        supplierName=supplier.name,
        supplierNrc=supplier.taxId,
        subtotal=goods_receipt.subtotal,
        taxAmount=goods_receipt.tax_amount,
        total=goods_receipt.total,
        invoiceType="FC",  # Factura de Compra
        journalEntryId=journal_entry.id,
        createdAt=datetime.now()
    )
    db.add(ap_invoice)
    db.commit()
```

---

## 🔄 FLUJO COMPLETO PASO A PASO

### **Paso 1: Crear Proveedor**
```
POST /api/suppliers
{
  "name": "Distribuidora ABC",
  "taxId": "0614-123456-001-1",
  "email": "contacto@abc.com",
  "phone": "2222-3333"
}
```
**Estado:** ✅ Ya funciona

---

### **Paso 2: Crear Orden de Compra**
```
POST /api/purchase-orders
{
  "supplier_id": 1,
  "order_date": "2025-10-29",
  "expected_delivery_date": "2025-11-05",
  "items": [
    {
      "product_id": null,  // Producto nuevo
      "product_name": "Leche Entera 1L",
      "quantity": 50,
      "unit_cost": 1.20,
      "tax_rate": 15.0
    },
    {
      "product_id": 5,  // Producto existente
      "product_name": "Pan Integral",
      "quantity": 100,
      "unit_cost": 0.75,
      "tax_rate": 15.0
    }
  ],
  "notes": "Entrega urgente"
}
```

**Lógica:**
1. Generar número de PO: `OC-001`, `OC-002`, etc.
2. Calcular subtotales, impuestos y total
3. Estado inicial: `pending`
4. Guardar items con `received_quantity = 0`

**Estado:** ❌ FALTA IMPLEMENTAR

---

### **Paso 3: Aprobar Orden de Compra (Opcional)**
```
PUT /api/purchase-orders/1/approve
{
  "approved": true
}
```
- Cambia estado a `approved`
- Registra quién aprobó y cuándo

**Estado:** ❌ FALTA IMPLEMENTAR

---

### **Paso 4: Recibir Mercancía (Goods Receipt)**
```
POST /api/goods-receipts
{
  "purchase_order_id": 1,
  "receipt_date": "2025-11-05",
  "items": [
    {
      "purchase_order_item_id": 1,
      "product_id": null,  // Se creará nuevo producto
      "quantity": 50,  // Cantidad recibida (puede ser parcial)
      "unit_cost": 1.20
    },
    {
      "purchase_order_item_id": 2,
      "product_id": 5,  // Producto existente
      "quantity": 80,  // Recibimos 80 de 100 (parcial)
      "unit_cost": 0.75
    }
  ],
  "notes": "Recibido en buen estado"
}
```

**Lógica:**
1. Generar número de recepción: `GR-001`, `GR-002`, etc.
2. Para cada item:
   - Si `product_id` es null → Crear producto nuevo con SKU automático
   - Actualizar stock del producto: `stock += quantity`
   - Crear movimiento de inventario (tipo: "entrada")
   - Actualizar `received_quantity` en PurchaseOrderItem
3. Si todos los items se recibieron → Cambiar PO a estado `received`
4. **Contabilizar la compra automáticamente:**
   - Débito: Inventario
   - Débito: IVA Crédito Fiscal
   - Crédito: Cuentas por Pagar
5. Crear ApInvoice para el proveedor

**Estado:** ❌ FALTA IMPLEMENTAR

---

### **Paso 5: Producto Disponible en POS**

Una vez recibida la mercancía:
- ✅ El producto ya existe en inventario
- ✅ Tiene stock disponible (`stock > 0`)
- ✅ Puede venderse en el POS

**Estado:** ✅ Ya funciona (el producto se muestra si tiene stock)

---

### **Paso 6: Venta en POS**

```
POST /api/sales
{
  "items": [
    {"productId": 10, "quantity": 2, ...}
  ],
  ...
}
```

**Lo que ya hace automáticamente:**
1. ✅ Reduce stock del producto
2. ✅ Crea movimiento de inventario (salida)
3. ✅ Contabiliza la venta:
   - Débito: Caja
   - Crédito: Ventas
   - Crédito: IVA Débito Fiscal
   - Débito: Costo de Ventas
   - Crédito: Inventario (reducción)

**Estado:** ✅ Ya funciona

---

## 📊 ESTRUCTURA DE BASE DE DATOS COMPLETA

### **Tablas Nuevas Necesarias:**

1. `purchase_orders` - Órdenes de compra
2. `purchase_order_items` - Items de las órdenes
3. `goods_receipts` - Recepciones de mercancía
4. `goods_receipt_items` - Items recibidos

### **Tablas que ya existen y se usarán:**

1. ✅ `suppliers` - Proveedores
2. ✅ `products` - Productos (con SKU)
3. ✅ `inventory_movements` - Movimientos de inventario
4. ✅ `journal_entries` - Asientos contables
5. ✅ `journal_lines` - Líneas de asientos
6. ✅ `ap_invoices` - Facturas por pagar (ya existe en BD)

---

## 🎯 PLAN DE IMPLEMENTACIÓN

### **Fase 1: Modelos de Base de Datos**
1. Crear modelos `PurchaseOrder`, `PurchaseOrderItem`
2. Crear modelos `GoodsReceipt`, `GoodsReceiptItem`
3. Agregar relaciones necesarias
4. Migrar base de datos

### **Fase 2: Schemas Pydantic**
1. `PurchaseOrderCreate`, `PurchaseOrderResponse`
2. `PurchaseOrderItemCreate`, `PurchaseOrderItemResponse`
3. `GoodsReceiptCreate`, `GoodsReceiptResponse`
4. `GoodsReceiptItemCreate`, `GoodsReceiptItemResponse`

### **Fase 3: Endpoints Backend**
1. Endpoints de Purchase Orders
2. Endpoints de Goods Receipts
3. Función `post_purchase_to_accounting()`
4. Integración con creación automática de productos

### **Fase 4: Frontend**
1. Componente de Purchase Orders
2. Componente de Goods Receipts
3. Integración con módulo de proveedores
4. Integración con módulo de productos

### **Fase 5: Pruebas**
1. Flujo completo de extremo a extremo
2. Validar contabilización automática
3. Validar actualización de inventario
4. Validar creación de productos nuevos

---

## 🔍 VERIFICACIONES IMPORTANTES

1. **SKU Único:**
   - ✅ Ya funciona con `generate_next_sku()`
   - Se genera automáticamente al crear producto
   - Único por compañía

2. **Actualización de Stock:**
   - ✅ Ya funciona en ventas (reduce stock)
   - ❌ FALTA en compras (aumentar stock al recibir)

3. **Movimientos de Inventario:**
   - ✅ Ya existe tabla `inventory_movements`
   - ✅ Ya se crean en ventas (salidas)
   - ❌ FALTA crear en recepciones (entradas)

4. **Contabilización:**
   - ✅ Ventas ya contabilizan automáticamente
   - ❌ FALTA contabilización de compras

5. **Cuentas Contables Necesarias:**
   - ✅ 1101 - Caja
   - ✅ 1201 - Inventario de Mercaderías
   - ✅ 2101 - Cuentas por Pagar
   - ✅ 2102 - IVA Crédito Fiscal
   - ✅ 4101 - Ventas
   - ✅ 5101 - Costo de Ventas

---

## 📝 NOTAS IMPORTANTES

1. **Al recibir mercancía con producto nuevo:**
   - Generar SKU automáticamente
   - Crear el producto con el costo de compra
   - El precio de venta se puede actualizar después

2. **Recepciones parciales:**
   - Se pueden recibir items parcialmente
   - La PO sigue en estado `pending` hasta recibir todo
   - Cada recepción parcial genera movimientos de inventario

3. **Contabilización de compras:**
   - Se contabiliza al momento de recibir (no al crear la orden)
   - Solo se contabiliza lo recibido (no lo pendiente)
   - Se crea documento APInvoice automáticamente

4. **Flujo completo:**
   - Proveedor → PO → Recepción → Inventario → Venta → Contabilización Ventas
   - Todo queda registrado en contabilidad automáticamente

