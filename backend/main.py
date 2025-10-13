"""
Super POS - Backend API con FastAPI
Sistema de Punto de Ventas para Supermercados
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from datetime import datetime, timedelta
from typing import List, Optional

# Importar modelos y esquemas
from models import User, Product, Sale, ProductCategory, FiscalDocument
from schemas import (
    UserLogin, UserResponse, UserCreate, UserUpdate,
    ProductResponse, ProductCreate, ProductUpdate,
    SaleCreate, SaleResponse, SaleSummary,
    LoginResponse, CartItem as CartItemSchema,
    ProductCategoryCreate,
    FiscalDocumentResponse, FiscalDocumentCreate, FiscalDocumentUpdate
)

# Crear aplicación FastAPI
app = FastAPI(
    title="Super POS API",
    description="API para Sistema de Punto de Ventas de Supermercados",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],  # Frontend Angular
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Esquema de autenticación
security = HTTPBearer()

# Datos simulados en memoria (en producción usar base de datos)
users_db = [
    User(
        id=1,
        username="admin",
        name="Administrador",
        email="admin@superpos.com",
        password="admin123",  # En producción usar hash
        role="admin",
        isActive=True,
        createdAt=datetime.now(),
        lastLogin=None
    ),
    User(
        id=2,
        username="cajero1",
        name="Juan Pérez",
        email="juan@superpos.com",
        password="cajero123",
        role="cashier",
        isActive=True,
        createdAt=datetime.now(),
        lastLogin=None
    )
]

products_db = [
    Product(
        id=1,
        code="SKU00001",
        name="Coca Cola 350ml",
        description="Bebida gaseosa Coca Cola 350ml",
        price=1.25,
        cost=0.80,
        category="Bebidas",
        brand="Coca Cola",
        stock=100,
        minStock=10,
        maxStock=200,
        barcode="1234567890123",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=2,
        code="SKU00002",
        name="Pan Integral",
        description="Pan integral 500g",
        price=2.50,
        cost=1.80,
        category="Panadería",
        brand="Panadería El Sol",
        stock=50,
        minStock=5,
        maxStock=100,
        barcode="2345678901234",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=3,
        code="SKU00003",
        name="Leche Entera 1L",
        description="Leche entera pasteurizada 1 litro",
        price=3.20,
        cost=2.50,
        category="Lácteos",
        brand="Lácteos del Valle",
        stock=75,
        minStock=15,
        maxStock=150,
        barcode="3456789012345",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
]

categories_db = [
    ProductCategory(id=1, name="Bebidas", description="Bebidas y refrescos", isActive=True),
    ProductCategory(id=2, name="Panadería", description="Productos de panadería", isActive=True),
    ProductCategory(id=3, name="Lácteos", description="Productos lácteos", isActive=True),
    ProductCategory(id=4, name="Carnes", description="Carnes y embutidos", isActive=True),
    ProductCategory(id=5, name="Frutas y Verduras", description="Frutas y verduras frescas", isActive=True),
    ProductCategory(id=6, name="Cereales", description="Cereales y granos", isActive=True),
    ProductCategory(id=7, name="Congelados", description="Productos congelados", isActive=True),
    ProductCategory(id=8, name="Snacks", description="Botanas y snacks", isActive=True),
    ProductCategory(id=9, name="Cuidado Personal", description="Productos de higiene personal", isActive=True),
    ProductCategory(id=10, name="Limpieza", description="Productos de limpieza del hogar", isActive=True),
    ProductCategory(id=11, name="Electrodomésticos", description="Electrodomésticos pequeños", isActive=True),
    ProductCategory(id=12, name="Ropa", description="Ropa y accesorios", isActive=True),
    ProductCategory(id=13, name="Juguetes", description="Juguetes y entretenimiento", isActive=True),
    ProductCategory(id=14, name="Farmacia", description="Medicamentos y productos farmacéuticos", isActive=True),
    ProductCategory(id=15, name="Jardín", description="Productos de jardinería", isActive=True)
]

fiscal_documents_db = [
    FiscalDocument(
        id=1,
        code="consumidor_final",
        name="Consumidor Final",
        description="Factura para consumidor final",
        prefix="CF",
        initialCorrelative=1,
        currentCorrelative=1,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    FiscalDocument(
        id=2,
        code="credito_fiscal",
        name="Crédito Fiscal",
        description="Comprobante de crédito fiscal",
        prefix="CCF",
        initialCorrelative=1,
        currentCorrelative=1,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
]

sales_db = []
next_sale_id = 1

# Funciones auxiliares
def generate_invoice_number(document_code: str) -> str:
    """Generar número de factura único con correlativo"""
    # Buscar el documento fiscal
    document = next((d for d in fiscal_documents_db if d.code == document_code and d.isActive), None)
    
    if not document:
        # Fallback si no se encuentra el documento
        prefix = "DOC"
        correlative = 1
    else:
        prefix = document.prefix
        correlative = document.currentCorrelative
        # Incrementar el correlativo para la próxima vez
        document.currentCorrelative += 1
        document.updatedAt = datetime.now()
    
    date = datetime.now()
    year = date.year % 100
    month = date.month
    day = date.day
    
    return f"{prefix}-{year:02d}{month:02d}{day:02d}-{correlative:06d}"

def calculate_totals(items: List[CartItemSchema]) -> dict:
    """Calcular totales del carrito"""
    subtotal = sum(item.unitPrice * item.quantity for item in items)
    tax_amount = sum(item.unitPrice * item.quantity * (item.tax / 100) for item in items)
    total = subtotal + tax_amount
    
    return {
        "subtotal": subtotal,
        "taxAmount": tax_amount,
        "total": total
    }

def generate_next_sku() -> str:
    """Generar el siguiente SKU disponible de forma secuencial"""
    # Buscar todos los números de SKU existentes
    sku_numbers = []
    for product in products_db:
        if product.code.startswith("SKU"):
            try:
                # Extraer el número del SKU (SKU00001 -> 1)
                number = int(product.code[3:])  # Remover "SKU" y convertir a número
                sku_numbers.append(number)
            except ValueError:
                continue
    
    if not sku_numbers:
        # Si no hay SKUs existentes, empezar con SKU00001
        return "SKU00001"
    
    # Ordenar los números para encontrar el siguiente en secuencia
    sku_numbers.sort()
    
    # Encontrar el primer número faltante en la secuencia
    expected_number = 1
    for sku_num in sku_numbers:
        if sku_num == expected_number:
            expected_number += 1
        else:
            # Encontramos un hueco en la secuencia, usar ese número
            break
    
    # Formatear con ceros a la izquierda (5 dígitos)
    return f"SKU{expected_number:05d}"

def get_next_product_id() -> int:
    """Obtener el siguiente ID de producto disponible"""
    if not products_db:
        return 1
    
    # Encontrar el ID más alto y sumar 1
    max_id = max(product.id for product in products_db)
    return max_id + 1

# Rutas de autenticación
@app.post("/api/auth/login", response_model=LoginResponse)
async def login(user_data: UserLogin):
    """Iniciar sesión de usuario"""
    user = next((u for u in users_db if u.username == user_data.username and u.password == user_data.password and u.isActive), None)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # Actualizar último login
    user.lastLogin = datetime.now()
    
    # Generar token (en producción usar JWT real)
    token = f"mock_token_{user.id}_{int(datetime.now().timestamp())}"
    
    return LoginResponse(
        token=token,
        user=UserResponse.model_validate(user.model_dump()),
        expiresIn=3600
    )

# Rutas de productos
@app.get("/api/products", response_model=List[ProductResponse])
async def get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    isActive: Optional[bool] = None
):
    """Obtener lista de productos con filtros"""
    filtered_products = products_db.copy()
    
    if search:
        search_lower = search.lower()
        filtered_products = [
            p for p in filtered_products 
            if search_lower in p.code.lower() or 
               search_lower in p.name.lower() or 
               (p.description and search_lower in p.description.lower())
        ]
    
    if category:
        filtered_products = [p for p in filtered_products if p.category == category]
    
    if brand:
        filtered_products = [p for p in filtered_products if p.brand == brand]
    
    if isActive is not None:
        filtered_products = [p for p in filtered_products if p.isActive == isActive]
    
    return [ProductResponse.model_validate(p.model_dump()) for p in filtered_products]

@app.get("/api/products/next-sku")
async def get_next_sku():
    """Obtener el siguiente SKU disponible"""
    next_sku = generate_next_sku()
    return {"nextSKU": next_sku}

@app.get("/api/products/sku-info")
async def get_sku_info():
    """Obtener información sobre la secuencia de SKUs"""
    sku_numbers = []
    for product in products_db:
        if product.code.startswith("SKU"):
            try:
                number = int(product.code[3:])
                sku_numbers.append(number)
            except ValueError:
                continue
    
    sku_numbers.sort()
    
    return {
        "totalSKUs": len(sku_numbers),
        "firstSKU": f"SKU{sku_numbers[0]:05d}" if sku_numbers else None,
        "lastSKU": f"SKU{sku_numbers[-1]:05d}" if sku_numbers else None,
        "nextSKU": generate_next_sku(),
        "sequenceComplete": len(sku_numbers) == (sku_numbers[-1] - sku_numbers[0] + 1) if sku_numbers else True
    }

# Rutas de categorías (deben ir ANTES de las rutas con parámetros)
@app.get("/api/products/categories", response_model=List[ProductCategory])
async def get_categories():
    """Obtener categorías de productos"""
    return categories_db

@app.post("/api/products/categories", response_model=ProductCategory)
async def create_category(category: ProductCategoryCreate):
    """Crear nueva categoría"""
    # Verificar si ya existe una categoría con ese nombre
    existing_category = next((c for c in categories_db if c.name.lower() == category.name.lower()), None)
    if existing_category:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    
    # Obtener el siguiente ID
    next_id = max([c.id for c in categories_db], default=0) + 1
    
    # Crear nueva categoría
    new_category = ProductCategory(
        id=next_id,
        name=category.name.strip(),
        isActive=category.isActive
    )
    
    categories_db.append(new_category)
    
    return new_category

# Rutas de documentos fiscales
@app.get("/api/fiscal-documents", response_model=List[FiscalDocumentResponse])
async def get_fiscal_documents():
    """Obtener todos los documentos fiscales"""
    return [FiscalDocumentResponse.model_validate(d.model_dump()) for d in fiscal_documents_db]

@app.get("/api/fiscal-documents/{document_id}", response_model=FiscalDocumentResponse)
async def get_fiscal_document(document_id: int):
    """Obtener documento fiscal por ID"""
    document = next((d for d in fiscal_documents_db if d.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento fiscal no encontrado")
    return FiscalDocumentResponse.model_validate(document.model_dump())

@app.post("/api/fiscal-documents", response_model=FiscalDocumentResponse)
async def create_fiscal_document(document_data: FiscalDocumentCreate):
    """Crear nuevo documento fiscal"""
    # Verificar si ya existe un documento con ese nombre o prefijo
    existing_by_name = next((d for d in fiscal_documents_db if d.name.lower() == document_data.name.lower()), None)
    if existing_by_name:
        raise HTTPException(status_code=400, detail="Ya existe un documento fiscal con ese nombre")
    
    existing_by_prefix = next((d for d in fiscal_documents_db if d.prefix.upper() == document_data.prefix.upper()), None)
    if existing_by_prefix:
        raise HTTPException(status_code=400, detail="Ya existe un documento fiscal con ese prefijo")
    
    # Obtener el siguiente ID
    next_id = max([d.id for d in fiscal_documents_db], default=0) + 1
    
    # Generar código interno a partir del nombre (snake_case)
    code = document_data.name.lower().replace(" ", "_").replace("-", "_")
    
    # Crear nuevo documento
    new_document = FiscalDocument(
        id=next_id,
        code=code,
        name=document_data.name.strip(),
        description=document_data.description,
        prefix=document_data.prefix.strip().upper(),
        initialCorrelative=document_data.initialCorrelative,
        currentCorrelative=document_data.initialCorrelative,
        isActive=document_data.isActive,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
    
    fiscal_documents_db.append(new_document)
    
    return FiscalDocumentResponse.model_validate(new_document.model_dump())

@app.put("/api/fiscal-documents/{document_id}", response_model=FiscalDocumentResponse)
async def update_fiscal_document(document_id: int, document_data: FiscalDocumentUpdate):
    """Actualizar documento fiscal"""
    document = next((d for d in fiscal_documents_db if d.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento fiscal no encontrado")
    
    # Verificar si el nuevo nombre ya existe en otro documento
    if document_data.name:
        existing = next((d for d in fiscal_documents_db if d.id != document_id and d.name.lower() == document_data.name.lower()), None)
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un documento fiscal con ese nombre")
    
    # Verificar si el nuevo prefijo ya existe en otro documento
    if document_data.prefix:
        existing = next((d for d in fiscal_documents_db if d.id != document_id and d.prefix.upper() == document_data.prefix.upper()), None)
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe un documento fiscal con ese prefijo")
    
    # Actualizar campos
    for field, value in document_data.model_dump(exclude_unset=True).items():
        if field == 'prefix' and value:
            setattr(document, field, value.upper())
        elif field == 'name' and value:
            setattr(document, field, value.strip())
            # Actualizar código si cambia el nombre
            document.code = value.lower().replace(" ", "_").replace("-", "_")
        else:
            setattr(document, field, value)
    
    document.updatedAt = datetime.now()
    return FiscalDocumentResponse.model_validate(document.model_dump())

@app.delete("/api/fiscal-documents/{document_id}")
async def delete_fiscal_document(document_id: int):
    """Eliminar documento fiscal"""
    document = next((d for d in fiscal_documents_db if d.id == document_id), None)
    if not document:
        raise HTTPException(status_code=404, detail="Documento fiscal no encontrado")
    
    fiscal_documents_db.remove(document)
    return {"message": "Documento fiscal eliminado exitosamente"}

@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    """Obtener producto por ID"""
    product = next((p for p in products_db if p.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductResponse.model_validate(product.model_dump())

@app.get("/api/products/code/{code}", response_model=ProductResponse)
async def get_product_by_code(code: str):
    """Obtener producto por código"""
    product = next((p for p in products_db if p.code == code), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductResponse.model_validate(product.model_dump())

@app.get("/api/products/barcode/{barcode}", response_model=ProductResponse)
async def get_product_by_barcode(barcode: str):
    """Obtener producto por código de barras"""
    product = next((p for p in products_db if p.barcode == barcode), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductResponse.model_validate(product.model_dump())

@app.post("/api/products", response_model=ProductResponse)
async def create_product(product_data: ProductCreate):
    """Crear nuevo producto con SKU automático secuencial"""
    # Siempre generar SKU automáticamente para mantener secuencia
    # Ignorar cualquier código proporcionado por el cliente
    product_code = generate_next_sku()
    
    # Verificar que el SKU generado no exista (doble verificación)
    max_attempts = 10
    attempts = 0
    while any(p.code == product_code for p in products_db) and attempts < max_attempts:
        product_code = generate_next_sku()
        attempts += 1
    
    if attempts >= max_attempts:
        raise HTTPException(
            status_code=500, 
            detail="Error al generar SKU único. Intente nuevamente."
        )
    
    # Crear el producto con el SKU generado automáticamente
    product_dict = product_data.model_dump()
    product_dict['code'] = product_code
    
    new_product = Product(
        id=get_next_product_id(),
        **product_dict,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
    products_db.append(new_product)
    return ProductResponse.model_validate(new_product.model_dump())

@app.put("/api/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_data: ProductUpdate):
    """Actualizar producto"""
    product = next((p for p in products_db if p.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Actualizar campos
    for field, value in product_data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    
    product.updatedAt = datetime.now()
    return ProductResponse.model_validate(product.model_dump())

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: int):
    """Eliminar producto"""
    product = next((p for p in products_db if p.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    products_db.remove(product)
    return {"message": "Producto eliminado exitosamente"}

# Rutas de ventas
@app.post("/api/sales", response_model=SaleResponse)
async def create_sale(sale_data: SaleCreate):
    """Crear nueva venta y actualizar inventario"""
    global next_sale_id
    
    # Calcular totales
    totals = calculate_totals(sale_data.items)
    
    # Actualizar inventario de productos antes de crear la venta
    for item in sale_data.items:
        product = next((p for p in products_db if p.id == item.productId), None)
        if product:
            # Verificar que hay suficiente stock
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stock insuficiente para {product.name}. Stock disponible: {product.stock}, Cantidad solicitada: {item.quantity}"
                )
            
            # Descontar del inventario
            product.stock -= item.quantity
            product.updatedAt = datetime.now()
        else:
            raise HTTPException(
                status_code=404, 
                detail=f"Producto con ID {item.productId} no encontrado"
            )
    
    # Extraer datos sin los campos que vamos a sobrescribir
    sale_dict = sale_data.model_dump()
    sale_dict.pop('subtotal', None)
    sale_dict.pop('taxAmount', None)
    sale_dict.pop('total', None)
    
    new_sale = Sale(
        id=next_sale_id,
        invoiceNumber=generate_invoice_number(sale_data.invoiceType),
        **sale_dict,
        subtotal=totals["subtotal"],
        taxAmount=totals["taxAmount"],
        total=totals["total"],
        createdAt=datetime.now()
    )
    
    sales_db.append(new_sale)
    next_sale_id += 1
    
    return SaleResponse.model_validate(new_sale.model_dump())

@app.get("/api/sales", response_model=List[SaleResponse])
async def get_sales(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    cashierId: Optional[int] = None,
    invoiceType: Optional[str] = None,
    sale_status: Optional[str] = None
):
    """Obtener lista de ventas con filtros"""
    filtered_sales = sales_db.copy()
    
    if startDate:
        start = datetime.fromisoformat(startDate)
        filtered_sales = [s for s in filtered_sales if s.createdAt >= start]
    
    if endDate:
        end = datetime.fromisoformat(endDate) + timedelta(days=1)
        filtered_sales = [s for s in filtered_sales if s.createdAt < end]
    
    if cashierId:
        filtered_sales = [s for s in filtered_sales if s.cashierId == cashierId]
    
    if invoiceType:
        filtered_sales = [s for s in filtered_sales if s.invoiceType == invoiceType]
    
    if sale_status:
        filtered_sales = [s for s in filtered_sales if s.status == sale_status]
    
    return [SaleResponse.model_validate(s.model_dump()) for s in filtered_sales]

@app.get("/api/sales/summary", response_model=SaleSummary)
async def get_sales_summary(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    cashierId: Optional[int] = None
):
    """Obtener resumen de ventas"""
    filtered_sales = sales_db.copy()
    
    if startDate:
        start = datetime.fromisoformat(startDate)
        filtered_sales = [s for s in filtered_sales if s.createdAt >= start]
    
    if endDate:
        end = datetime.fromisoformat(endDate) + timedelta(days=1)
        filtered_sales = [s for s in filtered_sales if s.createdAt < end]
    
    if cashierId:
        filtered_sales = [s for s in filtered_sales if s.cashierId == cashierId]
    
    total_sales = sum(s.total for s in filtered_sales)
    total_transactions = len(filtered_sales)
    average_ticket = total_sales / total_transactions if total_transactions > 0 else 0
    
    sales_by_payment_method = {
        "cash": sum(s.total for s in filtered_sales if s.paymentMethod == "cash"),
        "card": sum(s.total for s in filtered_sales if s.paymentMethod == "card"),
        "transfer": sum(s.total for s in filtered_sales if s.paymentMethod == "transfer"),
        "bitcoin": sum(s.total for s in filtered_sales if s.paymentMethod == "bitcoin")
    }
    
    sales_by_invoice_type = {
        "consumidor_final": sum(s.total for s in filtered_sales if s.invoiceType == "consumidor_final"),
        "credito_fiscal": sum(s.total for s in filtered_sales if s.invoiceType == "credito_fiscal")
    }
    
    return SaleSummary(
        totalSales=total_sales,
        totalTransactions=total_transactions,
        averageTicket=average_ticket,
        salesByPaymentMethod=sales_by_payment_method,
        salesByInvoiceType=sales_by_invoice_type
    )

# Rutas de usuarios
@app.get("/api/users", response_model=List[UserResponse])
async def get_users():
    """Obtener lista de usuarios"""
    return [UserResponse.model_validate(u.model_dump()) for u in users_db]

@app.post("/api/users", response_model=UserResponse)
async def create_user(user_data: UserCreate):
    """Crear nuevo usuario"""
    # Verificar que el username no exista
    if any(u.username == user_data.username for u in users_db):
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    new_user = User(
        id=len(users_db) + 1,
        **user_data.model_dump(),
        createdAt=datetime.now(),
        lastLogin=None
    )
    users_db.append(new_user)
    return UserResponse.model_validate(new_user.model_dump())

@app.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate):
    """Actualizar usuario"""
    user = next((u for u in users_db if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Actualizar campos
    for field, value in user_data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    
    return UserResponse.model_validate(user.model_dump())

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):
    """Eliminar usuario"""
    user = next((u for u in users_db if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    users_db.remove(user)
    return {"message": "Usuario eliminado exitosamente"}

# Ruta de salud
@app.get("/health")
async def health_check():
    """Health check del API"""
    return {
        "status": "healthy",
        "service": "Super POS API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
