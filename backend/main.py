"""
Super POS - Backend API con FastAPI
Sistema de Punto de Ventas para Supermercados
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from datetime import datetime, timedelta
from typing import List, Optional
import uuid

# Importar modelos y esquemas
from models import User, Product, Sale, ProductCategory, CartItem
from schemas import (
    UserLogin, UserResponse, UserCreate, UserUpdate,
    ProductResponse, ProductCreate, ProductUpdate,
    SaleCreate, SaleResponse, SaleSummary,
    LoginResponse
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
        code="PROD001",
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
        code="PROD002",
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
        code="PROD003",
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
    ProductCategory(id=5, name="Frutas y Verduras", description="Frutas y verduras frescas", isActive=True)
]

sales_db = []
next_sale_id = 1

# Funciones auxiliares
def generate_invoice_number(invoice_type: str) -> str:
    """Generar número de factura único"""
    prefix = "CF" if invoice_type == "credito_fiscal" else "CF"
    date = datetime.now()
    year = date.year % 100
    month = date.month
    day = date.day
    random = uuid.uuid4().hex[:3].upper()
    
    return f"{prefix}-{year:02d}{month:02d}{day:02d}-{random}"

def calculate_totals(items: List[CartItem]) -> dict:
    """Calcular totales del carrito"""
    subtotal = sum(item.unitPrice * item.quantity for item in items)
    tax_amount = sum(item.unitPrice * item.quantity * (item.tax / 100) for item in items)
    total = subtotal + tax_amount
    
    return {
        "subtotal": subtotal,
        "taxAmount": tax_amount,
        "total": total
    }

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
        user=UserResponse(
            id=user.id,
            username=user.username,
            name=user.name,
            email=user.email,
            role=user.role,
            isActive=user.isActive,
            createdAt=user.createdAt,
            lastLogin=user.lastLogin
        ),
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
    
    return [ProductResponse.from_orm(p) for p in filtered_products]

@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    """Obtener producto por ID"""
    product = next((p for p in products_db if p.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductResponse.from_orm(product)

@app.get("/api/products/code/{code}", response_model=ProductResponse)
async def get_product_by_code(code: str):
    """Obtener producto por código"""
    product = next((p for p in products_db if p.code == code), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductResponse.from_orm(product)

@app.get("/api/products/barcode/{barcode}", response_model=ProductResponse)
async def get_product_by_barcode(barcode: str):
    """Obtener producto por código de barras"""
    product = next((p for p in products_db if p.barcode == barcode), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return ProductResponse.from_orm(product)

@app.post("/api/products", response_model=ProductResponse)
async def create_product(product_data: ProductCreate):
    """Crear nuevo producto"""
    # Verificar que el código no exista
    if any(p.code == product_data.code for p in products_db):
        raise HTTPException(status_code=400, detail="El código del producto ya existe")
    
    new_product = Product(
        id=len(products_db) + 1,
        **product_data.dict(),
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
    products_db.append(new_product)
    return ProductResponse.from_orm(new_product)

@app.put("/api/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_data: ProductUpdate):
    """Actualizar producto"""
    product = next((p for p in products_db if p.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Actualizar campos
    for field, value in product_data.dict(exclude_unset=True).items():
        setattr(product, field, value)
    
    product.updatedAt = datetime.now()
    return ProductResponse.from_orm(product)

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: int):
    """Eliminar producto"""
    product = next((p for p in products_db if p.id == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    products_db.remove(product)
    return {"message": "Producto eliminado exitosamente"}

@app.get("/api/products/categories", response_model=List[ProductCategory])
async def get_categories():
    """Obtener categorías de productos"""
    return categories_db

# Rutas de ventas
@app.post("/api/sales", response_model=SaleResponse)
async def create_sale(sale_data: SaleCreate):
    """Crear nueva venta"""
    global next_sale_id
    
    # Calcular totales
    totals = calculate_totals(sale_data.items)
    
    new_sale = Sale(
        id=next_sale_id,
        invoiceNumber=generate_invoice_number(sale_data.invoiceType),
        **sale_data.dict(),
        subtotal=totals["subtotal"],
        taxAmount=totals["taxAmount"],
        total=totals["total"],
        createdAt=datetime.now()
    )
    
    sales_db.append(new_sale)
    next_sale_id += 1
    
    return SaleResponse.from_orm(new_sale)

@app.get("/api/sales", response_model=List[SaleResponse])
async def get_sales(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    cashierId: Optional[int] = None,
    invoiceType: Optional[str] = None,
    status: Optional[str] = None
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
    
    if status:
        filtered_sales = [s for s in filtered_sales if s.status == status]
    
    return [SaleResponse.from_orm(s) for s in filtered_sales]

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
        "transfer": sum(s.total for s in filtered_sales if s.paymentMethod == "transfer")
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
    return [UserResponse.from_orm(u) for u in users_db]

@app.post("/api/users", response_model=UserResponse)
async def create_user(user_data: UserCreate):
    """Crear nuevo usuario"""
    # Verificar que el username no exista
    if any(u.username == user_data.username for u in users_db):
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    new_user = User(
        id=len(users_db) + 1,
        **user_data.dict(),
        createdAt=datetime.now(),
        lastLogin=None
    )
    users_db.append(new_user)
    return UserResponse.from_orm(new_user)

@app.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate):
    """Actualizar usuario"""
    user = next((u for u in users_db if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Actualizar campos
    for field, value in user_data.dict(exclude_unset=True).items():
        setattr(user, field, value)
    
    return UserResponse.from_orm(user)

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
