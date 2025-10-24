"""
Super POS - Backend API con FastAPI y SQLite
Sistema de Punto de Ventas para Supermercados con Persistencia Real
"""

from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, text

# Importar configuración de base de datos
from database import get_db, engine, create_tables
from database import (
    User as DBUser, Product as DBProduct, Sale as DBSale, SaleItem as DBSaleItem,
    ProductCategory as DBProductCategory, FiscalDocument as DBFiscalDocument,
    Account as DBAccount, JournalEntry as DBJournalEntry, JournalLine as DBJournalLine,
    InventoryMovement as DBInventoryMovement, ArInvoice as DBArInvoice, ApInvoice as DBApInvoice
)

# Importar modelos Pydantic para requests/responses
from models import User, Product, Sale, ProductCategory, FiscalDocument, Account, JournalEntry, JournalLine, InventoryMovement, ArInvoice, ApInvoice
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
    title="Super POS API con SQLite",
    description="API para Sistema de Punto de Ventas con Persistencia SQLite",
    version="2.0.0",
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

# Inicializar BD al startup
@app.on_event("startup")
async def startup_event():
    """Inicializar base de datos al arrancar la aplicación"""
    print("Iniciando Super POS API...")
    
    # Crear tablas si no existen
    create_tables()
    
    # Inicializar datos si la BD está vacía
    db = next(get_db())
    try:
        if db.query(DBUser).count() == 0:
            print("Base de datos vacía, inicializando datos semilla...")
            from init_db import initialize_database
            initialize_database()
    finally:
        db.close()
    
    print("Super POS API iniciada exitosamente")

# Funciones auxiliares
def generate_invoice_number(document_code: str, db: Session) -> str:
    """Generar número de factura único con correlativo"""
    # Buscar el documento fiscal
    document = db.query(DBFiscalDocument).filter(
        DBFiscalDocument.code == document_code,
        DBFiscalDocument.isActive == True
    ).first()
    
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
        db.commit()
    
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

def create_journal_entry(source: str, reference: str, description: str, lines_data: List[dict], created_by: int, db: Session) -> DBJournalEntry:
    """Crear póliza contable"""
    
    # Generar número de póliza
    entry_count = db.query(DBJournalEntry).count() + 1
    entry_number = f"POL-{entry_count:06d}"
    
    # Crear póliza
    journal_entry = DBJournalEntry(
        entryNumber=entry_number,
        date=datetime.now(),
        source=source,
        reference=reference,
        description=description,
        status="posted",
        createdBy=created_by,
        postedBy=created_by,
        postedAt=datetime.now(),
        createdAt=datetime.now()
    )
    
    db.add(journal_entry)
    db.flush()  # Para obtener el ID
    
    # Crear líneas de la póliza
    for line_data in lines_data:
        journal_line = DBJournalLine(
            journalEntryId=journal_entry.id,
            accountId=line_data["accountId"],
            description=line_data["description"],
            debit=line_data.get("debit", 0.0),
            credit=line_data.get("credit", 0.0),
            costCenter=line_data.get("costCenter"),
            createdAt=datetime.now()
        )
        db.add(journal_line)
    
    db.commit()
    return journal_entry

def create_inventory_movement(product_id: int, movement_type: str, quantity: int, unit_cost: float, reference: str, reference_id: Optional[int], db: Session) -> DBInventoryMovement:
    """Crear movimiento de inventario"""
    
    movement = DBInventoryMovement(
        productId=product_id,
        movementType=movement_type,
        quantity=quantity,
        unitCost=unit_cost,
        totalCost=quantity * unit_cost,
        reference=reference,
        referenceId=reference_id,
        createdAt=datetime.now()
    )
    
    db.add(movement)
    db.commit()
    return movement

def post_sale_to_accounting(sale: DBSale, db: Session) -> dict:
    """Contabilizar venta en libros contables"""
    
    try:
        # 1. Crear póliza de ingreso (Ventas + IVA)
        income_lines = [
            {
                "accountId": 1,  # Caja
                "description": f"Venta {sale.invoiceNumber}",
                "debit": sale.total,
                "credit": 0.0
            },
            {
                "accountId": 9,  # Ventas
                "description": f"Venta {sale.invoiceNumber}",
                "debit": 0.0,
                "credit": sale.subtotal
            },
            {
                "accountId": 10,  # IVA Débito Fiscal
                "description": f"IVA Venta {sale.invoiceNumber}",
                "debit": 0.0,
                "credit": sale.taxAmount
            }
        ]
        
        income_entry = create_journal_entry(
            source="pos",
            reference=sale.invoiceNumber,
            description=f"Venta POS {sale.invoiceNumber}",
            lines_data=income_lines,
            created_by=sale.cashierId,
            db=db
        )
        
        # 2. Crear póliza de costo (Costo de Ventas + Inventarios)
        cost_entry = None
        total_cost = 0.0
        
        for item in sale.items:
            # Buscar producto para obtener costo
            product = db.query(DBProduct).filter(DBProduct.id == item.productId).first()
            if product:
                item_cost = item.quantity * product.cost
                total_cost += item_cost
                
                # Crear movimiento de inventario
                create_inventory_movement(
                    product_id=item.productId,
                    movement_type="salida",
                    quantity=item.quantity,
                    unit_cost=product.cost,
                    reference=sale.invoiceNumber,
                    reference_id=sale.id,
                    db=db
                )
        
        if total_cost > 0:
            cost_lines = [
                {
                    "accountId": 11,  # Costo de Ventas
                    "description": f"Costo Venta {sale.invoiceNumber}",
                    "debit": total_cost,
                    "credit": 0.0
                },
                {
                    "accountId": 4,  # Inventarios
                    "description": f"Salida Inventario {sale.invoiceNumber}",
                    "debit": 0.0,
                    "credit": total_cost
                }
            ]
            
            cost_entry = create_journal_entry(
                source="pos",
                reference=sale.invoiceNumber,
                description=f"Costo Venta POS {sale.invoiceNumber}",
                lines_data=cost_lines,
                created_by=sale.cashierId,
                db=db
            )
        
        # 3. Crear registro de factura AR
        ar_invoice = DBArInvoice(
            invoiceNumber=sale.invoiceNumber,
            customerName=sale.customerName or "Cliente Varios",
            customerDui=sale.customerDocument,
            subtotal=sale.subtotal,
            taxAmount=sale.taxAmount,
            total=sale.total,
            invoiceType=sale.invoiceType,
            controlNumber=f"DTE-{sale.invoiceNumber}",
            journalEntryId=income_entry.id,
            createdAt=datetime.now()
        )
        
        db.add(ar_invoice)
        db.commit()
        
        return {
            "success": True,
            "income_entry_id": income_entry.id,
            "cost_entry_id": cost_entry.id if cost_entry else None,
            "ar_invoice_id": ar_invoice.id,
            "message": "Venta contabilizada exitosamente"
        }
        
    except Exception as e:
        db.rollback()
        return {
            "success": False,
            "error": str(e),
            "message": "Error al contabilizar la venta"
        }

def generate_next_sku(db: Session) -> str:
    """Generar el siguiente SKU disponible de forma secuencial"""
    # Buscar todos los números de SKU existentes
    products = db.query(DBProduct).filter(DBProduct.code.like("SKU%")).all()
    sku_numbers = []
    
    for product in products:
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

# Rutas de autenticación
@app.post("/api/auth/login", response_model=LoginResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Iniciar sesión de usuario"""
    user = db.query(DBUser).filter(
        DBUser.username == user_data.username,
        DBUser.password == user_data.password,
        DBUser.isActive == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # Actualizar último login
    user.lastLogin = datetime.now()
    db.commit()
    
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
    isActive: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Obtener lista de productos con filtros"""
    query = db.query(DBProduct)
    
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.filter(
            or_(
                DBProduct.code.ilike(search_lower),
                DBProduct.name.ilike(search_lower),
                DBProduct.description.ilike(search_lower)
            )
        )
    
    if category:
        query = query.filter(DBProduct.category == category)
    
    if brand:
        query = query.filter(DBProduct.brand == brand)
    
    if isActive is not None:
        query = query.filter(DBProduct.isActive == isActive)
    
    products = query.all()
    
    return [ProductResponse(
        id=p.id,
        code=p.code,
        name=p.name,
        description=p.description,
        price=p.price,
        cost=p.cost,
        category=p.category,
        brand=p.brand,
        stock=p.stock,
        minStock=p.minStock,
        maxStock=p.maxStock,
        barcode=p.barcode,
        taxRate=p.taxRate,
        isActive=p.isActive,
        createdAt=p.createdAt,
        updatedAt=p.updatedAt
    ) for p in products]

@app.get("/api/products/next-sku")
async def get_next_sku(db: Session = Depends(get_db)):
    """Obtener el siguiente SKU disponible"""
    next_sku = generate_next_sku(db)
    return {"nextSKU": next_sku}

@app.get("/api/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """Obtener producto por ID"""
    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return ProductResponse(
        id=product.id,
        code=product.code,
        name=product.name,
        description=product.description,
        price=product.price,
        cost=product.cost,
        category=product.category,
        brand=product.brand,
        stock=product.stock,
        minStock=product.minStock,
        maxStock=product.maxStock,
        barcode=product.barcode,
        taxRate=product.taxRate,
        isActive=product.isActive,
        createdAt=product.createdAt,
        updatedAt=product.updatedAt
    )

@app.get("/api/products/code/{code}", response_model=ProductResponse)
async def get_product_by_code(code: str, db: Session = Depends(get_db)):
    """Obtener producto por código"""
    product = db.query(DBProduct).filter(DBProduct.code == code).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return ProductResponse(
        id=product.id,
        code=product.code,
        name=product.name,
        description=product.description,
        price=product.price,
        cost=product.cost,
        category=product.category,
        brand=product.brand,
        stock=product.stock,
        minStock=product.minStock,
        maxStock=product.maxStock,
        barcode=product.barcode,
        taxRate=product.taxRate,
        isActive=product.isActive,
        createdAt=product.createdAt,
        updatedAt=product.updatedAt
    )

@app.get("/api/products/barcode/{barcode}", response_model=ProductResponse)
async def get_product_by_barcode(barcode: str, db: Session = Depends(get_db)):
    """Obtener producto por código de barras"""
    product = db.query(DBProduct).filter(DBProduct.barcode == barcode).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return ProductResponse(
        id=product.id,
        code=product.code,
        name=product.name,
        description=product.description,
        price=product.price,
        cost=product.cost,
        category=product.category,
        brand=product.brand,
        stock=product.stock,
        minStock=product.minStock,
        maxStock=product.maxStock,
        barcode=product.barcode,
        taxRate=product.taxRate,
        isActive=product.isActive,
        createdAt=product.createdAt,
        updatedAt=product.updatedAt
    )

@app.post("/api/products", response_model=ProductResponse)
async def create_product(product_data: ProductCreate, db: Session = Depends(get_db)):
    """Crear nuevo producto con SKU automático secuencial"""
    # Siempre generar SKU automáticamente para mantener secuencia
    product_code = generate_next_sku(db)
    
    # Crear el producto con el SKU generado automáticamente
    new_product = DBProduct(
        code=product_code,
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        cost=product_data.cost,
        category=product_data.category,
        brand=product_data.brand,
        stock=product_data.stock,
        minStock=product_data.minStock,
        maxStock=product_data.maxStock,
        barcode=product_data.barcode,
        taxRate=product_data.taxRate,
        isActive=product_data.isActive,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
    
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    
    return ProductResponse(
        id=new_product.id,
        code=new_product.code,
        name=new_product.name,
        description=new_product.description,
        price=new_product.price,
        cost=new_product.cost,
        category=new_product.category,
        brand=new_product.brand,
        stock=new_product.stock,
        minStock=new_product.minStock,
        maxStock=new_product.maxStock,
        barcode=new_product.barcode,
        taxRate=new_product.taxRate,
        isActive=new_product.isActive,
        createdAt=new_product.createdAt,
        updatedAt=new_product.updatedAt
    )

@app.put("/api/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, product_data: ProductUpdate, db: Session = Depends(get_db)):
    """Actualizar producto"""
    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    # Actualizar campos
    for field, value in product_data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    
    product.updatedAt = datetime.now()
    db.commit()
    db.refresh(product)
    
    return ProductResponse(
        id=product.id,
        code=product.code,
        name=product.name,
        description=product.description,
        price=product.price,
        cost=product.cost,
        category=product.category,
        brand=product.brand,
        stock=product.stock,
        minStock=product.minStock,
        maxStock=product.maxStock,
        barcode=product.barcode,
        taxRate=product.taxRate,
        isActive=product.isActive,
        createdAt=product.createdAt,
        updatedAt=product.updatedAt
    )

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Eliminar producto"""
    product = db.query(DBProduct).filter(DBProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    db.delete(product)
    db.commit()
    return {"message": "Producto eliminado exitosamente"}

# Rutas de ventas
@app.post("/api/sales", response_model=SaleResponse)
async def create_sale(sale_data: SaleCreate, db: Session = Depends(get_db)):
    """Crear nueva venta y actualizar inventario"""
    
    # Calcular totales
    totals = calculate_totals(sale_data.items)
    
    # Actualizar inventario de productos antes de crear la venta
    for item in sale_data.items:
        product = db.query(DBProduct).filter(DBProduct.id == item.productId).first()
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
    
    # Generar número de factura
    invoice_number = generate_invoice_number(sale_data.invoiceType, db)
    
    # Crear venta
    new_sale = DBSale(
        invoiceNumber=invoice_number,
        customerName=sale_data.customerName,
        customerDocument=sale_data.customerDocument,
        customerEmail=sale_data.customerEmail,
        invoiceType=sale_data.invoiceType,
        subtotal=totals["subtotal"],
        taxAmount=totals["taxAmount"],
        discountAmount=sale_data.discountAmount,
        total=totals["total"],
        paymentMethod=sale_data.paymentMethod,
        paymentAmount=sale_data.paymentAmount,
        change=sale_data.change,
        cashierId=sale_data.cashierId,
        cashierName=sale_data.cashierName,
        createdAt=datetime.now(),
        status=sale_data.status
    )
    
    db.add(new_sale)
    db.flush()  # Para obtener el ID
    
    # Crear items de venta
    for item in sale_data.items:
        sale_item = DBSaleItem(
            saleId=new_sale.id,
            productId=item.productId,
            productName=item.productName,
            quantity=item.quantity,
            unitPrice=item.unitPrice,
            subtotal=item.subtotal,
            tax=item.tax,
            total=item.total
        )
        db.add(sale_item)
    
    db.commit()
    
    # Contabilizar la venta en libros contables
    accounting_result = post_sale_to_accounting(new_sale, db)
    
    # Log del resultado de contabilización
    if accounting_result["success"]:
        print(f"Venta {new_sale.invoiceNumber} contabilizada exitosamente")
    else:
        print(f"Error al contabilizar venta {new_sale.invoiceNumber}: {accounting_result['error']}")
    
    # Cargar la venta con sus items para la respuesta
    db.refresh(new_sale)
    
    return SaleResponse(
        id=new_sale.id,
        invoiceNumber=new_sale.invoiceNumber,
        customerName=new_sale.customerName,
        customerDocument=new_sale.customerDocument,
        customerEmail=new_sale.customerEmail,
        invoiceType=new_sale.invoiceType,
        items=[CartItemSchema(
            productId=item.productId,
            productName=item.productName,
            quantity=item.quantity,
            unitPrice=item.unitPrice,
            subtotal=item.subtotal,
            tax=item.tax,
            total=item.total
        ) for item in new_sale.items],
        subtotal=new_sale.subtotal,
        taxAmount=new_sale.taxAmount,
        discountAmount=new_sale.discountAmount,
        total=new_sale.total,
        paymentMethod=new_sale.paymentMethod,
        paymentAmount=new_sale.paymentAmount,
        change=new_sale.change,
        cashierId=new_sale.cashierId,
        cashierName=new_sale.cashierName,
        createdAt=new_sale.createdAt,
        status=new_sale.status
    )

@app.get("/api/sales", response_model=List[SaleResponse])
async def get_sales(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    cashierId: Optional[int] = None,
    invoiceType: Optional[str] = None,
    sale_status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtener lista de ventas con filtros"""
    query = db.query(DBSale).options(joinedload(DBSale.items))
    
    if startDate:
        start = datetime.fromisoformat(startDate)
        query = query.filter(DBSale.createdAt >= start)
    
    if endDate:
        end = datetime.fromisoformat(endDate) + timedelta(days=1)
        query = query.filter(DBSale.createdAt < end)
    
    if cashierId:
        query = query.filter(DBSale.cashierId == cashierId)
    
    if invoiceType:
        query = query.filter(DBSale.invoiceType == invoiceType)
    
    if sale_status:
        query = query.filter(DBSale.status == sale_status)
    
    sales = query.all()
    
    return [SaleResponse(
        id=sale.id,
        invoiceNumber=sale.invoiceNumber,
        customerName=sale.customerName,
        customerDocument=sale.customerDocument,
        customerEmail=sale.customerEmail,
        invoiceType=sale.invoiceType,
        items=[CartItemSchema(
            productId=item.productId,
            productName=item.productName,
            quantity=item.quantity,
            unitPrice=item.unitPrice,
            subtotal=item.subtotal,
            tax=item.tax,
            total=item.total
        ) for item in sale.items],
        subtotal=sale.subtotal,
        taxAmount=sale.taxAmount,
        discountAmount=sale.discountAmount,
        total=sale.total,
        paymentMethod=sale.paymentMethod,
        paymentAmount=sale.paymentAmount,
        change=sale.change,
        cashierId=sale.cashierId,
        cashierName=sale.cashierName,
        createdAt=sale.createdAt,
        status=sale.status
    ) for sale in sales]

@app.get("/api/sales/summary", response_model=SaleSummary)
async def get_sales_summary(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    cashierId: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Obtener resumen de ventas"""
    query = db.query(DBSale)
    
    if startDate:
        start = datetime.fromisoformat(startDate)
        query = query.filter(DBSale.createdAt >= start)
    
    if endDate:
        end = datetime.fromisoformat(endDate) + timedelta(days=1)
        query = query.filter(DBSale.createdAt < end)
    
    if cashierId:
        query = query.filter(DBSale.cashierId == cashierId)
    
    sales = query.all()
    
    total_sales = sum(s.total for s in sales)
    total_transactions = len(sales)
    average_ticket = total_sales / total_transactions if total_transactions > 0 else 0
    
    sales_by_payment_method = {
        "cash": sum(s.total for s in sales if s.paymentMethod == "cash"),
        "card": sum(s.total for s in sales if s.paymentMethod == "card"),
        "transfer": sum(s.total for s in sales if s.paymentMethod == "transfer"),
        "bitcoin": sum(s.total for s in sales if s.paymentMethod == "bitcoin")
    }
    
    # Calcular ventas por tipo de documento fiscal dinámicamente
    sales_by_invoice_type = {}
    for sale in sales:
        invoice_type = sale.invoiceType
        if invoice_type not in sales_by_invoice_type:
            sales_by_invoice_type[invoice_type] = 0
        sales_by_invoice_type[invoice_type] += sale.total
    
    return SaleSummary(
        totalSales=total_sales,
        totalTransactions=total_transactions,
        averageTicket=average_ticket,
        salesByPaymentMethod=sales_by_payment_method,
        salesByInvoiceType=sales_by_invoice_type
    )

# Rutas de categorías
@app.get("/api/products/categories", response_model=List[ProductCategory])
async def get_categories(db: Session = Depends(get_db)):
    """Obtener categorías de productos"""
    categories = db.query(DBProductCategory).all()
    return [ProductCategory(
        id=cat.id,
        name=cat.name,
        description=cat.description,
        isActive=cat.isActive
    ) for cat in categories]

@app.post("/api/products/categories", response_model=ProductCategory)
async def create_category(category: ProductCategoryCreate, db: Session = Depends(get_db)):
    """Crear nueva categoría"""
    # Verificar si ya existe una categoría con ese nombre
    existing_category = db.query(DBProductCategory).filter(
        func.lower(DBProductCategory.name) == category.name.lower()
    ).first()
    
    if existing_category:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    
    # Crear nueva categoría
    new_category = DBProductCategory(
        name=category.name.strip(),
        description=category.description,
        isActive=category.isActive
    )
    
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    return ProductCategory(
        id=new_category.id,
        name=new_category.name,
        description=new_category.description,
        isActive=new_category.isActive
    )

# Rutas de documentos fiscales
@app.get("/api/fiscal-documents", response_model=List[FiscalDocumentResponse])
async def get_fiscal_documents(db: Session = Depends(get_db)):
    """Obtener todos los documentos fiscales"""
    documents = db.query(DBFiscalDocument).all()
    return [FiscalDocumentResponse(
        id=doc.id,
        code=doc.code,
        name=doc.name,
        description=doc.description,
        prefix=doc.prefix,
        initialCorrelative=doc.initialCorrelative,
        currentCorrelative=doc.currentCorrelative,
        isActive=doc.isActive,
        createdAt=doc.createdAt,
        updatedAt=doc.updatedAt
    ) for doc in documents]

# Rutas de usuarios
@app.get("/api/users", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    """Obtener lista de usuarios"""
    users = db.query(DBUser).all()
    return [UserResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        email=user.email,
        role=user.role,
        isActive=user.isActive,
        createdAt=user.createdAt,
        lastLogin=user.lastLogin
    ) for user in users]

@app.post("/api/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Crear nuevo usuario"""
    # Verificar que el username no exista
    existing_user = db.query(DBUser).filter(DBUser.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya existe")
    
    new_user = DBUser(
        username=user_data.username,
        name=user_data.name,
        email=user_data.email,
        password=user_data.password,
        role=user_data.role,
        isActive=user_data.isActive,
        createdAt=datetime.now()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        name=new_user.name,
        email=new_user.email,
        role=new_user.role,
        isActive=new_user.isActive,
        createdAt=new_user.createdAt,
        lastLogin=new_user.lastLogin
    )

# Endpoints contables
@app.get("/api/accounting/accounts")
async def get_accounts(db: Session = Depends(get_db)):
    """Obtener catálogo de cuentas"""
    accounts = db.query(DBAccount).all()
    return [{
        "id": acc.id,
        "code": acc.code,
        "name": acc.name,
        "accountType": acc.accountType,
        "nature": acc.nature,
        "level": acc.level,
        "parentId": acc.parentId,
        "isActive": acc.isActive,
        "createdAt": acc.createdAt,
        "updatedAt": acc.updatedAt
    } for acc in accounts]

@app.get("/api/accounting/journal-entries")
async def get_journal_entries(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtener pólizas contables (Libro Diario)"""
    query = db.query(DBJournalEntry).options(joinedload(DBJournalEntry.lines))
    
    # Filtrar por fecha si se proporciona
    if startDate:
        start = datetime.strptime(startDate, "%Y-%m-%d").date()
        query = query.filter(func.date(DBJournalEntry.date) >= start)
    
    if endDate:
        end = datetime.strptime(endDate, "%Y-%m-%d").date()
        query = query.filter(func.date(DBJournalEntry.date) <= end)
    
    # Filtrar por fuente si se proporciona
    if source:
        query = query.filter(DBJournalEntry.source == source)
    
    # Ordenar por fecha descendente
    entries = query.order_by(DBJournalEntry.date.desc()).all()
    
    return [{
        "id": entry.id,
        "entryNumber": entry.entryNumber,
        "date": entry.date,
        "source": entry.source,
        "reference": entry.reference,
        "description": entry.description,
        "currency": entry.currency,
        "status": entry.status,
        "createdBy": entry.createdBy,
        "postedBy": entry.postedBy,
        "postedAt": entry.postedAt,
        "createdAt": entry.createdAt,
        "lines": [{
            "id": line.id,
            "journalEntryId": line.journalEntryId,
            "accountId": line.accountId,
            "description": line.description,
            "debit": line.debit,
            "credit": line.credit,
            "costCenter": line.costCenter,
            "createdAt": line.createdAt
        } for line in entry.lines]
    } for entry in entries]

@app.get("/api/accounting/ledger")
async def get_ledger(db: Session = Depends(get_db)):
    """Obtener Libro Mayor (saldos por cuenta)"""
    accounts = db.query(DBAccount).all()
    ledger = {}
    
    # Inicializar saldos por cuenta
    for account in accounts:
        ledger[account.id] = {
            "account": {
                "id": account.id,
                "code": account.code,
                "name": account.name,
                "accountType": account.accountType,
                "nature": account.nature,
                "level": account.level,
                "parentId": account.parentId,
                "isActive": account.isActive,
                "createdAt": account.createdAt,
                "updatedAt": account.updatedAt
            },
            "debit_total": 0.0,
            "credit_total": 0.0,
            "balance": 0.0
        }
    
    # Calcular totales de débitos y créditos
    posted_entries = db.query(DBJournalEntry).filter(DBJournalEntry.status == "posted").all()
    posted_entry_ids = [entry.id for entry in posted_entries]
    
    if posted_entry_ids:
        lines = db.query(DBJournalLine).filter(DBJournalLine.journalEntryId.in_(posted_entry_ids)).all()
        
        for line in lines:
            if line.accountId in ledger:
                ledger[line.accountId]["debit_total"] += line.debit
                ledger[line.accountId]["credit_total"] += line.credit
    
    # Calcular saldos
    for account_id, data in ledger.items():
        account = data["account"]
        if account["nature"] == "deudora":
            data["balance"] = data["debit_total"] - data["credit_total"]
        else:  # acreedora
            data["balance"] = data["credit_total"] - data["debit_total"]
    
    return ledger

@app.get("/api/accounting/inventory-movements")
async def get_inventory_movements(
    productId: Optional[int] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtener movimientos de inventario"""
    query = db.query(DBInventoryMovement)
    
    # Filtrar por producto
    if productId:
        query = query.filter(DBInventoryMovement.productId == productId)
    
    # Filtrar por fecha
    if startDate:
        start = datetime.strptime(startDate, "%Y-%m-%d").date()
        query = query.filter(func.date(DBInventoryMovement.createdAt) >= start)
    
    if endDate:
        end = datetime.strptime(endDate, "%Y-%m-%d").date()
        query = query.filter(func.date(DBInventoryMovement.createdAt) <= end)
    
    # Ordenar por fecha descendente
    movements = query.order_by(DBInventoryMovement.createdAt.desc()).all()
    
    return {"movements": [{
        "id": mov.id,
        "productId": mov.productId,
        "movementType": mov.movementType,
        "quantity": mov.quantity,
        "unitCost": mov.unitCost,
        "totalCost": mov.totalCost,
        "reference": mov.reference,
        "referenceId": mov.referenceId,
        "createdAt": mov.createdAt
    } for mov in movements]}

@app.get("/api/accounting/vat/sales")
async def get_vat_sales(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Obtener Libro de Ventas (IVA)"""
    query = db.query(DBArInvoice)
    
    # Filtrar por fecha
    if startDate:
        start = datetime.strptime(startDate, "%Y-%m-%d").date()
        query = query.filter(func.date(DBArInvoice.createdAt) >= start)
    
    if endDate:
        end = datetime.strptime(endDate, "%Y-%m-%d").date()
        query = query.filter(func.date(DBArInvoice.createdAt) <= end)
    
    # Ordenar por fecha descendente
    invoices = query.order_by(DBArInvoice.createdAt.desc()).all()
    
    return [{
        "id": inv.id,
        "invoiceNumber": inv.invoiceNumber,
        "customerName": inv.customerName,
        "customerDui": inv.customerDui,
        "subtotal": inv.subtotal,
        "taxAmount": inv.taxAmount,
        "total": inv.total,
        "invoiceType": inv.invoiceType,
        "controlNumber": inv.controlNumber,
        "journalEntryId": inv.journalEntryId,
        "createdAt": inv.createdAt
    } for inv in invoices]

@app.get("/api/accounting/trial-balance")
async def get_trial_balance(db: Session = Depends(get_db)):
    """Obtener Balance de Comprobación"""
    ledger_data = await get_ledger(db)
    
    trial_balance = []
    total_debits = 0.0
    total_credits = 0.0
    
    for account_id, data in ledger_data.items():
        if data["debit_total"] > 0 or data["credit_total"] > 0:  # Solo cuentas con movimiento
            trial_balance.append({
                "account": data["account"],
                "debit_total": data["debit_total"],
                "credit_total": data["credit_total"],
                "balance": data["balance"]
            })
            total_debits += data["debit_total"]
            total_credits += data["credit_total"]
    
    return {
        "accounts": trial_balance,
        "total_debits": total_debits,
        "total_credits": total_credits,
        "is_balanced": abs(total_debits - total_credits) < 0.01
    }

# Ruta de salud
@app.get("/health")
async def health_check():
    """Health check del API"""
    return {
        "status": "healthy",
        "service": "Super POS API con SQLite",
        "version": "2.0.0",
        "database": "SQLite",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
