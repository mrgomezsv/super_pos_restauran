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
    InventoryMovement as DBInventoryMovement, ArInvoice as DBArInvoice, ApInvoice as DBApInvoice,
    Supplier as DBSupplier, Discount as DBDiscount, CashSession as DBCashSession, AuditLog as DBAuditLog
)

# Importar modelos Pydantic para requests/responses
from models import User, Product, Sale, ProductCategory, FiscalDocument, Account, JournalEntry, JournalLine, InventoryMovement, ArInvoice, ApInvoice, Company
from schemas import (
    UserLogin, UserResponse, UserCreate, UserUpdate,
    ProductResponse, ProductCreate, ProductUpdate,
    SaleCreate, SaleResponse, SaleSummary,
    LoginResponse, CartItem as CartItemSchema,
    ProductCategoryCreate,
    FiscalDocumentResponse, FiscalDocumentCreate, FiscalDocumentUpdate,
    CompanyResponse, CompanyWithAdminCreate, CompanyUpdate, CompanyStatusUpdate, 
    CompanyCreationResponse, CompanyContext,
    SupplierResponse, SupplierCreate, SupplierUpdate,
    DiscountResponse, DiscountCreate, DiscountUpdate,
    CashSessionResponse, CashSessionOpen, CashSessionClose,
    AuditLogResponse
)

# Importar servicio de compañías
from company_service import company_service
from context_service import get_current_context, context_service

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
        # Registrar intento fallido de login
        failed_user = db.query(DBUser).filter(DBUser.username == user_data.username).first()
        if failed_user:
            log_audit_event(
                user_id=failed_user.id,
                action="LOGIN_FAILED",
                module="Authentication",
                detail=f"Intento de login fallido para usuario {user_data.username}",
                company_id=failed_user.company_id,
                db=db
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    # Actualizar último login
    user.lastLogin = datetime.now()
    db.commit()
    
    # Registrar login exitoso
    log_audit_event(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        module="Authentication",
        detail=f"Usuario {user.username} inició sesión exitosamente",
        company_id=user.company_id,
        db=db
    )
    
    # Generar token (en producción usar JWT real)
    token = f"mock_token_{user.id}_{int(datetime.now().timestamp())}"
    
    return LoginResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            company_id=user.company_id,
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
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener lista de productos con filtros"""
    query = db.query(DBProduct)
    
    # Aplicar filtro automático por compañía usando el context_service
    query = context_service.apply_company_filter(query, DBProduct, context)
    
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
async def create_sale(
    sale_data: SaleCreate, 
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Crear nueva venta y actualizar inventario"""
    
    # Verificar acceso a la compañía
    context_service.ensure_company_access(context, context["company"]["id"] if context.get("company") else -1)
    
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
    
    # Obtener company_id del contexto
    company_id = context.get("company", {}).get("id")
    if not company_id and not context.get("user", {}).get("is_sudo"):
        raise HTTPException(status_code=400, detail="ID de compañía requerido")
    
    # Crear venta
    new_sale = DBSale(
        company_id=company_id,
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
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener lista de ventas con filtros"""
    query = db.query(DBSale).options(joinedload(DBSale.items))
    
    # Aplicar filtro automático por compañía
    query = context_service.apply_company_filter(query, DBSale, context)
    
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
    
    sales_by_invoice_type = {
        "consumidor_final": sum(s.total for s in sales if s.invoiceType == "consumidor_final"),
        "credito_fiscal": sum(s.total for s in sales if s.invoiceType == "credito_fiscal")
    }
    
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
async def get_fiscal_documents(context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Obtener documentos fiscales de la compañía"""
    query = db.query(DBFiscalDocument)
    query = context_service.apply_company_filter(query, DBFiscalDocument, context)
    documents = query.filter(DBFiscalDocument.isActive == True).order_by(DBFiscalDocument.name.asc()).all()
    
    return [FiscalDocumentResponse(
        id=doc.id,
        company_id=doc.company_id,
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

@app.post("/api/fiscal-documents", response_model=FiscalDocumentResponse)
async def create_fiscal_document(payload: FiscalDocumentCreate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Crear nuevo documento fiscal"""
    company_id = context.get("company", {}).get("id")
    if not company_id and not context.get("user", {}).get("is_sudo"):
        raise HTTPException(status_code=400, detail="ID de compañía requerido")
    
    # Verificar que no exista un documento con el mismo nombre o prefijo
    existing_name = db.query(DBFiscalDocument).filter(
        DBFiscalDocument.company_id == company_id,
        DBFiscalDocument.name == payload.name.strip(),
        DBFiscalDocument.isActive == True
    ).first()
    
    if existing_name:
        raise HTTPException(status_code=400, detail="Ya existe un documento fiscal con este nombre")
    
    existing_prefix = db.query(DBFiscalDocument).filter(
        DBFiscalDocument.company_id == company_id,
        DBFiscalDocument.prefix == payload.prefix.strip().upper(),
        DBFiscalDocument.isActive == True
    ).first()
    
    if existing_prefix:
        raise HTTPException(status_code=400, detail="Ya existe un documento fiscal con este prefijo")
    
    # Generar código interno
    code = payload.name.lower().replace(" ", "_").replace("-", "_").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    
    new_document = DBFiscalDocument(
        company_id=company_id,
        code=code,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        prefix=payload.prefix.strip().upper(),
        initialCorrelative=payload.initialCorrelative,
        currentCorrelative=payload.initialCorrelative,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
    db.add(new_document)
    db.commit()
    db.refresh(new_document)
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="FISCAL_DOCUMENT_CREATE",
        module="Fiscal Documents",
        detail=f"Documento fiscal creado: {new_document.name} ({new_document.prefix})",
        company_id=company_id,
        db=db
    )
    
    return FiscalDocumentResponse(
        id=new_document.id,
        company_id=new_document.company_id,
        code=new_document.code,
        name=new_document.name,
        description=new_document.description,
        prefix=new_document.prefix,
        initialCorrelative=new_document.initialCorrelative,
        currentCorrelative=new_document.currentCorrelative,
        isActive=new_document.isActive,
        createdAt=new_document.createdAt,
        updatedAt=new_document.updatedAt
    )

@app.put("/api/fiscal-documents/{document_id}", response_model=FiscalDocumentResponse)
async def update_fiscal_document(document_id: int, payload: FiscalDocumentUpdate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Actualizar documento fiscal"""
    document = db.query(DBFiscalDocument).filter(DBFiscalDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento fiscal no encontrado")
    if not context_service.validate_company_access(context, document.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Verificar nombres/prefijos únicos si se están cambiando
    if payload.name and payload.name.strip() != document.name:
        existing_name = db.query(DBFiscalDocument).filter(
            DBFiscalDocument.company_id == document.company_id,
            DBFiscalDocument.name == payload.name.strip(),
            DBFiscalDocument.isActive == True,
            DBFiscalDocument.id != document_id
        ).first()
        
        if existing_name:
            raise HTTPException(status_code=400, detail="Ya existe un documento fiscal con este nombre")
    
    if payload.prefix and payload.prefix.strip().upper() != document.prefix:
        existing_prefix = db.query(DBFiscalDocument).filter(
            DBFiscalDocument.company_id == document.company_id,
            DBFiscalDocument.prefix == payload.prefix.strip().upper(),
            DBFiscalDocument.isActive == True,
            DBFiscalDocument.id != document_id
        ).first()
        
        if existing_prefix:
            raise HTTPException(status_code=400, detail="Ya existe un documento fiscal con este prefijo")
    
    # Actualizar campos
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "name" and value:
            setattr(document, field, value.strip())
        elif field == "description" and value:
            setattr(document, field, value.strip())
        elif field == "prefix" and value:
            setattr(document, field, value.strip().upper())
        else:
            setattr(document, field, value)
    
    document.updatedAt = datetime.now()
    db.commit()
    db.refresh(document)
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="FISCAL_DOCUMENT_UPDATE",
        module="Fiscal Documents",
        detail=f"Documento fiscal actualizado: {document.name}",
        company_id=document.company_id,
        db=db
    )
    
    return FiscalDocumentResponse(
        id=document.id,
        company_id=document.company_id,
        code=document.code,
        name=document.name,
        description=document.description,
        prefix=document.prefix,
        initialCorrelative=document.initialCorrelative,
        currentCorrelative=document.currentCorrelative,
        isActive=document.isActive,
        createdAt=document.createdAt,
        updatedAt=document.updatedAt
    )

@app.delete("/api/fiscal-documents/{document_id}")
async def delete_fiscal_document(document_id: int, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Eliminar documento fiscal (soft delete)"""
    document = db.query(DBFiscalDocument).filter(DBFiscalDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Documento fiscal no encontrado")
    if not context_service.validate_company_access(context, document.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Verificar que no tenga ventas asociadas
    sales_count = db.query(DBSale).filter(
        DBSale.fiscalDocumentId == document_id,
        DBSale.company_id == document.company_id
    ).count()
    
    if sales_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar el documento porque tiene {sales_count} ventas asociadas"
        )
    
    # Soft delete
    document.isActive = False
    document.updatedAt = datetime.now()
    db.commit()
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="FISCAL_DOCUMENT_DELETE",
        module="Fiscal Documents",
        detail=f"Documento fiscal eliminado: {document.name}",
        company_id=document.company_id,
        db=db
    )
    
    return {"message": "Documento fiscal eliminado exitosamente"}

# Rutas de usuarios
@app.get("/api/users", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    """Obtener lista de usuarios"""
    users = db.query(DBUser).all()
    return [UserResponse(
        id=user.id,
        company_id=user.company_id,
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
        company_id=new_user.company_id,
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

# Rutas de compañías (multi-tenant)
@app.post("/api/companies", response_model=CompanyCreationResponse)
async def create_company_with_admin(
    company_data: CompanyWithAdminCreate, 
    db: Session = Depends(get_db)
):
    """Crear nueva compañía con usuario administrador y configuración base"""
    
    # Preparar datos de compañía
    company_dict = company_data.company.model_dump()
    
    # Preparar datos de usuario administrador
    admin_dict = {
        "username": company_data.admin_username,
        "name": company_data.admin_name,
        "email": company_data.admin_email,
        "password": company_data.admin_password
    }
    
    # Crear compañía usando el servicio
    result = company_service.create_company(
        company_data=company_dict,
        admin_user_data=admin_dict,
        db=db
    )
    
    return CompanyCreationResponse(**result)

@app.get("/api/companies", response_model=List[CompanyResponse])
async def get_companies(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Obtener lista de compañías"""
    companies = company_service.get_companies_list(active_only=active_only, db=db)
    
    return [CompanyResponse(
        id=company.id,
        nombre=company.nombre,
        razonSocial=company.razonSocial,
        nit=company.nit,
        dui=company.dui,
        telefono=company.telefono,
        email=company.email,
        direccion=company.direccion,
        ciudad=company.ciudad,
        pais=company.pais,
        tipoEmpresa=company.tipoEmpresa,
        estado=company.estado,
        fechaRegistro=company.fechaRegistro,
        contactoPrincipal=company.contactoPrincipal,
        limiteCredito=company.limiteCredito,
        saldoActual=company.saldoActual,
        adminUserId=company.adminUserId,
        subscriptionPlan=company.subscriptionPlan,
        maxUsers=company.maxUsers,
        maxProducts=company.maxProducts,
        maxSalesPerMonth=company.maxSalesPerMonth,
        isActive=company.isActive,
        createdAt=company.createdAt,
        updatedAt=company.updatedAt
    ) for company in companies]

@app.get("/api/companies/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db)
):
    """Obtener compañía por ID"""
    company = company_service.get_company_by_id(company_id, db=db)
    
    if not company:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    
    return CompanyResponse(
        id=company.id,
        nombre=company.nombre,
        razonSocial=company.razonSocial,
        nit=company.nit,
        dui=company.dui,
        telefono=company.telefono,
        email=company.email,
        direccion=company.direccion,
        ciudad=company.ciudad,
        pais=company.pais,
        tipoEmpresa=company.tipoEmpresa,
        estado=company.estado,
        fechaRegistro=company.fechaRegistro,
        contactoPrincipal=company.contactoPrincipal,
        limiteCredito=company.limiteCredito,
        saldoActual=company.saldoActual,
        adminUserId=company.adminUserId,
        subscriptionPlan=company.subscriptionPlan,
        maxUsers=company.maxUsers,
        maxProducts=company.maxProducts,
        maxSalesPerMonth=company.maxSalesPerMonth,
        isActive=company.isActive,
        createdAt=company.createdAt,
        updatedAt=company.updatedAt
    )

@app.put("/api/companies/{company_id}/status")
async def update_company_status(
    company_id: int,
    status_data: CompanyStatusUpdate,
    db: Session = Depends(get_db)
):
    """Actualizar estado de compañía"""
    result = company_service.update_company_status(
        company_id=company_id,
        new_status=status_data.estado,
        db=db
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=400 if "no encontrada" in result["error"] else 500,
            detail=result["error"]
        )
    
    return {"message": result["message"]}

@app.get("/api/companies/{company_id}/context", response_model=CompanyContext)
async def get_company_context(
    company_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Obtener contexto de compañía para un usuario específico"""
    # Verificar que la compañía existe
    company = company_service.get_company_by_id(company_id, db=db)
    if not company:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    
    # Obtener usuario
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar que el usuario pertenece a la compañía o es SUDO
    if user.company_id != company_id and user.role != "sudo":
        raise HTTPException(status_code=403, detail="Usuario no autorizado para esta compañía")
    
    return CompanyContext(
        user_id=user.id,
        username=user.username,
        company_id=company.id,
        company_name=company.nombre,
        user_role=user.role,
        is_sudo=(user.role == "sudo"),
        permissions=[]  # Aquí se pueden agregar permisos específicos más adelante
    )

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

# -----------------------------
# Suppliers (Proveedores)
# -----------------------------
@app.get("/api/suppliers", response_model=List[SupplierResponse])
async def get_suppliers(context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    query = db.query(DBSupplier)
    query = context_service.apply_company_filter(query, DBSupplier, context)
    rows = query.order_by(DBSupplier.createdAt.desc()).all()
    return [SupplierResponse(
        id=r.id, company_id=r.company_id, name=r.name, taxId=r.taxId, email=r.email,
        phone=r.phone, address=r.address, isActive=r.isActive, createdAt=r.createdAt
    ) for r in rows]

@app.post("/api/suppliers", response_model=SupplierResponse)
async def create_supplier(payload: SupplierCreate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    company_id = context.get("company", {}).get("id")
    if not company_id and not context.get("user", {}).get("is_sudo"):
        raise HTTPException(status_code=400, detail="ID de compañía requerido")
    new_sup = DBSupplier(
        company_id=company_id,
        name=payload.name.strip(), taxId=(payload.taxId or '').strip() or None,
        email=(payload.email or '').strip() or None, phone=(payload.phone or '').strip() or None,
        address=(payload.address or '').strip() or None, isActive=payload.isActive,
        createdAt=datetime.now()
    )
    db.add(new_sup); db.commit(); db.refresh(new_sup)
    return SupplierResponse(
        id=new_sup.id, company_id=new_sup.company_id, name=new_sup.name, taxId=new_sup.taxId,
        email=new_sup.email, phone=new_sup.phone, address=new_sup.address,
        isActive=new_sup.isActive, createdAt=new_sup.createdAt
    )

@app.put("/api/suppliers/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(supplier_id: int, payload: SupplierUpdate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    sup = db.query(DBSupplier).filter(DBSupplier.id == supplier_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    # Validar acceso por compañía
    if not context_service.validate_company_access(context, sup.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sup, field, value)
    db.commit(); db.refresh(sup)
    return SupplierResponse(
        id=sup.id, company_id=sup.company_id, name=sup.name, taxId=sup.taxId,
        email=sup.email, phone=sup.phone, address=sup.address,
        isActive=sup.isActive, createdAt=sup.createdAt
    )

@app.delete("/api/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: int, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    sup = db.query(DBSupplier).filter(DBSupplier.id == supplier_id).first()
    if not sup:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    if not context_service.validate_company_access(context, sup.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(sup); db.commit()
    return {"message": "Proveedor eliminado"}

# -----------------------------
# Discounts (Descuentos)
# -----------------------------
@app.get("/api/discounts", response_model=List[DiscountResponse])
async def get_discounts(context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Obtener lista de descuentos de la compañía"""
    query = db.query(DBDiscount)
    query = context_service.apply_company_filter(query, DBDiscount, context)
    rows = query.filter(DBDiscount.isActive == True).order_by(DBDiscount.createdAt.desc()).all()
    return [DiscountResponse(
        id=r.id, company_id=r.company_id, name=r.name, percent=r.percent,
        isActive=r.isActive, createdAt=r.createdAt
    ) for r in rows]

@app.post("/api/discounts", response_model=DiscountResponse)
async def create_discount(payload: DiscountCreate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Crear nuevo descuento"""
    company_id = context.get("company", {}).get("id")
    if not company_id and not context.get("user", {}).get("is_sudo"):
        raise HTTPException(status_code=400, detail="ID de compañía requerido")
    
    # Validar rango de porcentaje
    if payload.percent < 0 or payload.percent > 100:
        raise HTTPException(status_code=400, detail="El porcentaje debe estar entre 0 y 100")
    
    new_discount = DBDiscount(
        company_id=company_id,
        name=payload.name.strip(),
        percent=payload.percent,
        isActive=payload.isActive,
        createdAt=datetime.now()
    )
    db.add(new_discount)
    db.commit()
    db.refresh(new_discount)
    return DiscountResponse(
        id=new_discount.id, company_id=new_discount.company_id, name=new_discount.name,
        percent=new_discount.percent, isActive=new_discount.isActive, createdAt=new_discount.createdAt
    )

@app.put("/api/discounts/{discount_id}", response_model=DiscountResponse)
async def update_discount(discount_id: int, payload: DiscountUpdate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Actualizar descuento existente"""
    disc = db.query(DBDiscount).filter(DBDiscount.id == discount_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Descuento no encontrado")
    if not context_service.validate_company_access(context, disc.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "percent" and value is not None:
            if value < 0 or value > 100:
                raise HTTPException(status_code=400, detail="El porcentaje debe estar entre 0 y 100")
        setattr(disc, field, value)
    
    db.commit()
    db.refresh(disc)
    return DiscountResponse(
        id=disc.id, company_id=disc.company_id, name=disc.name,
        percent=disc.percent, isActive=disc.isActive, createdAt=disc.createdAt
    )

@app.delete("/api/discounts/{discount_id}")
async def delete_discount(discount_id: int, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Eliminar descuento"""
    disc = db.query(DBDiscount).filter(DBDiscount.id == discount_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Descuento no encontrado")
    if not context_service.validate_company_access(context, disc.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    db.delete(disc)
    db.commit()
    return {"message": "Descuento eliminado exitosamente"}

# -----------------------------
# Inventory Alerts (Alertas de Inventario)
# -----------------------------
@app.get("/api/inventory/alerts")
async def get_inventory_alerts(context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Obtener productos con stock bajo el mínimo (alertas de inventario)"""
    query = db.query(DBProduct)
    query = context_service.apply_company_filter(query, DBProduct, context)
    
    # Filtrar productos donde stock < minStock
    low_stock_products = query.filter(
        DBProduct.stock < DBProduct.minStock,
        DBProduct.isActive == True
    ).order_by(
        # Ordenar por criticidad: productos con menor % de stock primero
        (DBProduct.stock * 1.0 / DBProduct.minStock).asc()
    ).all()
    
    alerts = []
    for product in low_stock_products:
        # Calcular nivel de criticidad
        if product.minStock > 0:
            stock_percent = (product.stock / product.minStock) * 100
        else:
            stock_percent = 100 if product.stock > 0 else 0
        
        # Determinar nivel de urgencia
        if stock_percent == 0:
            urgency = "critico"
        elif stock_percent < 25:
            urgency = "alto"
        elif stock_percent < 50:
            urgency = "medio"
        else:
            urgency = "bajo"
        
        alerts.append({
            "id": product.id,
            "code": product.code,
            "name": product.name,
            "stock": product.stock,
            "minStock": product.minStock,
            "stockPercent": round(stock_percent, 1),
            "urgency": urgency,
            "category": product.category,
            "brand": product.brand
        })
    
    return {
        "total": len(alerts),
        "alerts": alerts
    }

# -----------------------------
# Audit Logs (Bitácora de Auditoría)
# -----------------------------
def log_audit_event(
    user_id: int, 
    action: str, 
    module: str, 
    detail: Optional[str] = None,
    company_id: Optional[int] = None,
    db: Session = None
):
    """Función auxiliar para registrar eventos de auditoría"""
    if db is None:
        return
    
    try:
        log_entry = DBAuditLog(
            company_id=company_id,
            userId=user_id,
            action=action,
            module=module,
            detail=detail,
            createdAt=datetime.now()
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Error logging audit event: {e}")
        db.rollback()

@app.get("/api/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    userId: Optional[int] = None,
    module: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener bitácora de auditoría con filtros"""
    query = db.query(DBAuditLog)
    
    # Filtrar por compañía
    company_id = context.get("company", {}).get("id")
    if company_id and not context.get("user", {}).get("is_sudo"):
        query = query.filter(DBAuditLog.company_id == company_id)
    
    # Aplicar filtros
    if startDate:
        start = datetime.fromisoformat(startDate)
        query = query.filter(DBAuditLog.createdAt >= start)
    
    if endDate:
        end = datetime.fromisoformat(endDate) + timedelta(days=1)
        query = query.filter(DBAuditLog.createdAt < end)
    
    if userId:
        query = query.filter(DBAuditLog.userId == userId)
    
    if module:
        query = query.filter(DBAuditLog.module == module)
    
    logs = query.order_by(DBAuditLog.createdAt.desc()).limit(100).all()
    
    return [AuditLogResponse(
        id=log.id,
        company_id=log.company_id,
        userId=log.userId,
        action=log.action,
        module=log.module,
        detail=log.detail,
        createdAt=log.createdAt
    ) for log in logs]

@app.post("/api/audit-logs")
async def create_audit_log(
    action: str,
    module: str,
    detail: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Crear evento de auditoría manual"""
    user_id = context.get("user", {}).get("id")
    company_id = context.get("company", {}).get("id")
    
    log_audit_event(user_id, action, module, detail, company_id, db)
    return {"message": "Evento registrado"}

# -----------------------------
# Cash Sessions (Sesiones de Caja)
# -----------------------------
@app.get("/api/cash-sessions", response_model=List[CashSessionResponse])
async def get_cash_sessions(context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Listar sesiones de caja"""
    query = db.query(DBCashSession)
    query = context_service.apply_company_filter(query, DBCashSession, context)
    sessions = query.order_by(DBCashSession.openedAt.desc()).limit(50).all()
    
    return [CashSessionResponse(
        id=s.id, company_id=s.company_id, userId=s.userId,
        openedAt=s.openedAt, closedAt=s.closedAt,
        openingAmount=s.openingAmount, closingAmount=s.closingAmount,
        status=s.status
    ) for s in sessions]

@app.get("/api/cash-sessions/current")
async def get_current_cash_session(context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Obtener sesión de caja activa del usuario actual"""
    user_id = context.get("user", {}).get("id")
    company_id = context.get("company", {}).get("id")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Compañía requerida")
    
    current_session = db.query(DBCashSession).filter(
        DBCashSession.company_id == company_id,
        DBCashSession.userId == user_id,
        DBCashSession.status == "open"
    ).first()
    
    if not current_session:
        return {"session": None, "hasOpenSession": False}
    
    return {
        "session": CashSessionResponse(
            id=current_session.id, company_id=current_session.company_id,
            userId=current_session.userId, openedAt=current_session.openedAt,
            closedAt=current_session.closedAt, openingAmount=current_session.openingAmount,
            closingAmount=current_session.closingAmount, status=current_session.status
        ),
        "hasOpenSession": True
    }

@app.post("/api/cash-sessions/open", response_model=CashSessionResponse)
async def open_cash_session(payload: CashSessionOpen, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Abrir sesión de caja"""
    user_id = context.get("user", {}).get("id")
    company_id = context.get("company", {}).get("id")
    
    if not company_id:
        raise HTTPException(status_code=400, detail="Compañía requerida")
    
    # Verificar que no haya sesión abierta
    existing_session = db.query(DBCashSession).filter(
        DBCashSession.company_id == company_id,
        DBCashSession.userId == user_id,
        DBCashSession.status == "open"
    ).first()
    
    if existing_session:
        raise HTTPException(status_code=400, detail="Ya existe una sesión de caja abierta")
    
    # Crear nueva sesión
    new_session = DBCashSession(
        company_id=company_id,
        userId=user_id,
        openedAt=datetime.now(),
        openingAmount=payload.openingAmount,
        status="open"
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Registrar evento de auditoría
    log_audit_event(
        user_id=user_id,
        action="CASH_SESSION_OPEN",
        module="Cash Register",
        detail=f"Apertura de caja con ${payload.openingAmount:.2f}",
        company_id=company_id,
        db=db
    )
    
    # TODO: Crear asiento contable de apertura (Débito Caja / Crédito Efectivo en Tránsito)
    
    return CashSessionResponse(
        id=new_session.id, company_id=new_session.company_id, userId=new_session.userId,
        openedAt=new_session.openedAt, closedAt=new_session.closedAt,
        openingAmount=new_session.openingAmount, closingAmount=new_session.closingAmount,
        status=new_session.status
    )

@app.post("/api/cash-sessions/{session_id}/close", response_model=CashSessionResponse)
async def close_cash_session(
    session_id: int, 
    payload: CashSessionClose, 
    context: dict = Depends(get_current_context), 
    db: Session = Depends(get_db)
):
    """Cerrar sesión de caja"""
    session = db.query(DBCashSession).filter(DBCashSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    # Validar acceso
    if not context_service.validate_company_access(context, session.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    if session.status != "open":
        raise HTTPException(status_code=400, detail="La sesión ya está cerrada")
    
    # Cerrar sesión
    session.closedAt = datetime.now()
    session.closingAmount = payload.closingAmount
    session.status = "closed"
    db.commit()
    db.refresh(session)
    
    # Calcular diferencia
    difference = payload.closingAmount - session.openingAmount
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="CASH_SESSION_CLOSE",
        module="Cash Register",
        detail=f"Cierre de caja: Apertura=${session.openingAmount:.2f}, Cierre=${payload.closingAmount:.2f}, Diferencia=${difference:.2f}",
        company_id=session.company_id,
        db=db
    )
    
    # TODO: Crear asiento contable de cierre y arqueo de caja
    
    return CashSessionResponse(
        id=session.id, company_id=session.company_id, userId=session.userId,
        openedAt=session.openedAt, closedAt=session.closedAt,
        openingAmount=session.openingAmount, closingAmount=session.closingAmount,
        status=session.status
    )

# -----------------------------
# Product Categories (Categorías de Productos)
# -----------------------------
@app.get("/api/product-categories", response_model=List[ProductCategoryResponse])
async def get_product_categories(context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Obtener categorías de productos de la compañía"""
    query = db.query(DBProductCategory)
    query = context_service.apply_company_filter(query, DBProductCategory, context)
    categories = query.filter(DBProductCategory.isActive == True).order_by(DBProductCategory.name.asc()).all()
    
    return [ProductCategoryResponse(
        id=cat.id, company_id=cat.company_id, name=cat.name,
        description=cat.description, isActive=cat.isActive,
        createdAt=cat.createdAt
    ) for cat in categories]

@app.post("/api/product-categories", response_model=ProductCategoryResponse)
async def create_product_category(payload: ProductCategoryCreate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Crear nueva categoría de producto"""
    company_id = context.get("company", {}).get("id")
    if not company_id and not context.get("user", {}).get("is_sudo"):
        raise HTTPException(status_code=400, detail="ID de compañía requerido")
    
    # Verificar que no exista una categoría con el mismo nombre
    existing = db.query(DBProductCategory).filter(
        DBProductCategory.company_id == company_id,
        DBProductCategory.name == payload.name.strip(),
        DBProductCategory.isActive == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con este nombre")
    
    new_category = DBProductCategory(
        company_id=company_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        isActive=True,
        createdAt=datetime.now()
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="CATEGORY_CREATE",
        module="Products",
        detail=f"Categoría creada: {new_category.name}",
        company_id=company_id,
        db=db
    )
    
    return ProductCategoryResponse(
        id=new_category.id, company_id=new_category.company_id, name=new_category.name,
        description=new_category.description, isActive=new_category.isActive,
        createdAt=new_category.createdAt
    )

@app.put("/api/product-categories/{category_id}", response_model=ProductCategoryResponse)
async def update_product_category(category_id: int, payload: ProductCategoryUpdate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Actualizar categoría de producto"""
    category = db.query(DBProductCategory).filter(DBProductCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    if not context_service.validate_company_access(context, category.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Verificar nombre único si se está cambiando
    if payload.name and payload.name.strip() != category.name:
        existing = db.query(DBProductCategory).filter(
            DBProductCategory.company_id == category.company_id,
            DBProductCategory.name == payload.name.strip(),
            DBProductCategory.isActive == True,
            DBProductCategory.id != category_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una categoría con este nombre")
    
    # Actualizar campos
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "name" and value:
            setattr(category, field, value.strip())
        elif field == "description" and value:
            setattr(category, field, value.strip())
        else:
            setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="CATEGORY_UPDATE",
        module="Products",
        detail=f"Categoría actualizada: {category.name}",
        company_id=category.company_id,
        db=db
    )
    
    return ProductCategoryResponse(
        id=category.id, company_id=category.company_id, name=category.name,
        description=category.description, isActive=category.isActive,
        createdAt=category.createdAt
    )

@app.delete("/api/product-categories/{category_id}")
async def delete_product_category(category_id: int, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Eliminar categoría de producto (soft delete)"""
    category = db.query(DBProductCategory).filter(DBProductCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    if not context_service.validate_company_access(context, category.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Verificar que no tenga productos asociados
    products_count = db.query(DBProduct).filter(
        DBProduct.category == category.name,
        DBProduct.company_id == category.company_id,
        DBProduct.isActive == True
    ).count()
    
    if products_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar la categoría porque tiene {products_count} productos asociados"
        )
    
    # Soft delete
    category.isActive = False
    db.commit()
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="CATEGORY_DELETE",
        module="Products",
        detail=f"Categoría eliminada: {category.name}",
        company_id=category.company_id,
        db=db
    )
    
    return {"message": "Categoría eliminada exitosamente"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
