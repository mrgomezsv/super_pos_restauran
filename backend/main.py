"""
Super POS - Backend API con FastAPI y SQLite
Sistema de Punto de Ventas para Supermercados con Persistencia Real
"""

from fastapi import FastAPI, HTTPException, status, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func

# Importar configuración de base de datos
from database import get_db, create_tables
from database import (
    User as DBUser, Product as DBProduct, Sale as DBSale, SaleItem as DBSaleItem,
    ProductCategory as DBProductCategory, FiscalDocument as DBFiscalDocument,
    Account as DBAccount, JournalEntry as DBJournalEntry, JournalLine as DBJournalLine,
    InventoryMovement as DBInventoryMovement, ArInvoice as DBArInvoice, ApInvoice as DBApInvoice,
    Supplier as DBSupplier, Discount as DBDiscount, CashSession as DBCashSession, AuditLog as DBAuditLog,
    Company as DBCompany
)

# Importar modelos Pydantic para requests/responses
from models import User, Product, Sale, ProductCategory, FiscalDocument, Account, JournalEntry, JournalLine, InventoryMovement, ArInvoice, ApInvoice, Company
from schemas import (
    UserLogin, UserResponse, UserCreate, UserUpdate,
    ProductResponse, ProductCreate, ProductUpdate,
    SaleCreate, SaleResponse, SaleSummary,
    LoginResponse, CartItem as CartItemSchema,
    ProductCategoryCreate, ProductCategoryResponse, ProductCategoryUpdate,
    FiscalDocumentResponse, FiscalDocumentCreate, FiscalDocumentUpdate,
    CompanyResponse, CompanyWithAdminCreate, CompanyUpdate, CompanyStatusUpdate, 
    CompanyCreationResponse, CompanyContext,
    SupplierResponse, SupplierCreate, SupplierUpdate,
    DiscountResponse, DiscountCreate, DiscountUpdate,
    CashSessionResponse, CashSessionOpen, CashSessionClose,
    AuditLogResponse,
    JournalEntryResponse, JournalEntryDetailResponse, JournalEntryCreate,
    JournalLineResponse, JournalLineCreate,
    LedgerEntryResponse, LedgerAccountDetailResponse, LedgerMovementResponse,
    TrialBalanceResponse, TrialBalanceAccountResponse,
    SalesSummaryReportResponse, DailySalesResponse, UserSalesResponse,
    InventoryStatusReportResponse, InventoryProductResponse,
    FinancialSummaryReportResponse, SalesMetricsResponse, AccountingMetricsResponse, AccountTotalResponse,
    AccountResponse, AccountCreate, AccountUpdate,
    DashboardMetricsResponse, SalesDashboardMetrics, InventoryDashboardMetrics, AccountingDashboardMetrics,
    DailySalesResponse, TopProductResponse, DashboardAlertResponse,
    BusinessConfigResponse, BusinessConfigUpdate
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

def create_accounting_entry(source: str, reference: str, description: str, lines_data: List[dict], created_by: int, company_id: int, db: Session) -> DBJournalEntry:
    """Crear póliza contable automática desde POS"""
    
    # Generar número de asiento
    last_entry = db.query(DBJournalEntry).filter(
        DBJournalEntry.company_id == company_id
    ).order_by(DBJournalEntry.entryNumber.desc()).first()
    
    next_number = (last_entry.entryNumber + 1) if last_entry else 1
    
    # Crear asiento
    journal_entry = DBJournalEntry(
        company_id=company_id,
        entryNumber=next_number,
        date=datetime.now(),
        description=description,
        reference=reference,
        totalDebit=sum(line.get("debit", 0.0) for line in lines_data),
        totalCredit=sum(line.get("credit", 0.0) for line in lines_data),
        createdAt=datetime.now()
    )
    
    db.add(journal_entry)
    db.flush()  # Para obtener el ID
    
    # Crear líneas del asiento
    for line_data in lines_data:
        journal_line = DBJournalLine(
            journalEntryId=journal_entry.id,
            accountCode=line_data["accountCode"],
            accountName=line_data["accountName"],
            description=line_data["description"],
            debit=line_data.get("debit", 0.0),
            credit=line_data.get("credit", 0.0)
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
        company_id = sale.company_id
        
        # 1. Crear asiento de ingreso (Caja + Ventas + IVA)
        income_lines = [
            {
                "accountCode": "1101",  # Caja
                "accountName": "Caja General",
                "description": f"Venta {sale.invoiceNumber}",
                "debit": sale.total,
                "credit": 0.0
            },
            {
                "accountCode": "4101",  # Ventas
                "accountName": "Ventas de Mercaderías",
                "description": f"Venta {sale.invoiceNumber}",
                "debit": 0.0,
                "credit": sale.subtotal
            },
            {
                "accountCode": "2101",  # IVA Débito Fiscal
                "accountName": "IVA Débito Fiscal",
                "description": f"IVA Venta {sale.invoiceNumber}",
                "debit": 0.0,
                "credit": sale.taxAmount
            }
        ]
        
        income_entry = create_accounting_entry(
            source="pos",
            reference=sale.invoiceNumber,
            description=f"Venta POS {sale.invoiceNumber}",
            lines_data=income_lines,
            created_by=sale.cashierId,
            company_id=company_id,
            db=db
        )
        
        # 2. Crear asiento de costo (Costo de Ventas + Inventarios)
        cost_entry = None
        total_cost = 0.0
        
        # Obtener items de la venta
        sale_items = db.query(DBSaleItem).filter(DBSaleItem.saleId == sale.id).all()
        
        for item in sale_items:
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
                    "accountCode": "5101",  # Costo de Ventas
                    "accountName": "Costo de Ventas",
                    "description": f"Costo Venta {sale.invoiceNumber}",
                    "debit": total_cost,
                    "credit": 0.0
                },
                {
                    "accountCode": "1201",  # Inventarios
                    "accountName": "Inventario de Mercaderías",
                    "description": f"Salida Inventario {sale.invoiceNumber}",
                    "debit": 0.0,
                    "credit": total_cost
                }
            ]
            
            cost_entry = create_accounting_entry(
                source="pos",
                reference=sale.invoiceNumber,
                description=f"Costo Venta POS {sale.invoiceNumber}",
                lines_data=cost_lines,
                created_by=sale.cashierId,
                company_id=company_id,
                db=db
            )
        
        # 3. Crear registro de factura AR
        ar_invoice = DBArInvoice(
            company_id=company_id,
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

def generate_next_sku(db: Session, company_id: int = None) -> str:
    """Generar el siguiente SKU disponible de forma secuencial"""
    # Buscar todos los números de SKU existentes
    query = db.query(DBProduct).filter(DBProduct.code.like("SKU%"))
    if company_id:
        query = query.filter(DBProduct.company_id == company_id)
    products = query.all()
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
async def create_product(
    product_data: ProductCreate, 
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Crear nuevo producto con SKU automático secuencial"""
    try:
        # Generar SKU automáticamente
        product_code = generate_next_sku(db, context.get("company_id"))
    
        # Crear el producto
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
            company_id=context.get("company_id"),
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
    except Exception as e:
        print(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

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

# -----------------------------
# Accounting - Diario Contable
# -----------------------------
@app.get("/api/accounting/journal-entries", response_model=List[JournalEntryResponse])
async def get_journal_entries(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    accountCode: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener asientos del diario contable"""
    query = db.query(DBJournalEntry)
    query = context_service.apply_company_filter(query, DBJournalEntry, context)
    
    # Aplicar filtros
    if startDate:
        start = datetime.fromisoformat(startDate)
        query = query.filter(DBJournalEntry.date >= start)
    
    if endDate:
        end = datetime.fromisoformat(endDate) + timedelta(days=1)
        query = query.filter(DBJournalEntry.date < end)
    
    if accountCode:
        query = query.join(DBJournalLine).filter(DBJournalLine.accountCode == accountCode)
    
    entries = query.order_by(DBJournalEntry.date.desc(), DBJournalEntry.entryNumber.desc()).limit(100).all()
    
    return [JournalEntryResponse(
        id=entry.id, company_id=entry.company_id, entryNumber=entry.entryNumber,
        date=entry.date, description=entry.description, reference=entry.reference,
        totalDebit=entry.totalDebit, totalCredit=entry.totalCredit,
        createdAt=entry.createdAt, lines=[]
    ) for entry in entries]

@app.get("/api/accounting/journal-entries/{entry_id}", response_model=JournalEntryDetailResponse)
async def get_journal_entry_detail(entry_id: int, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Obtener detalle completo de un asiento contable"""
    entry = db.query(DBJournalEntry).filter(DBJournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Asiento contable no encontrado")
    if not context_service.validate_company_access(context, entry.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Obtener líneas del asiento
    lines = db.query(DBJournalLine).filter(DBJournalLine.journalEntryId == entry_id).all()
    
    return JournalEntryDetailResponse(
        id=entry.id, company_id=entry.company_id, entryNumber=entry.entryNumber,
        date=entry.date, description=entry.description, reference=entry.reference,
        totalDebit=entry.totalDebit, totalCredit=entry.totalCredit,
        createdAt=entry.createdAt,
        lines=[JournalLineResponse(
            id=line.id, journalEntryId=line.journalEntryId, accountCode=line.accountCode,
            accountName=line.accountName, description=line.description,
            debit=line.debit, credit=line.credit
        ) for line in lines]
    )

@app.post("/api/accounting/journal-entries", response_model=JournalEntryResponse)
async def create_journal_entry(payload: JournalEntryCreate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Crear nuevo asiento contable"""
    company_id = context.get("company", {}).get("id")
    if not company_id and not context.get("user", {}).get("is_sudo"):
        raise HTTPException(status_code=400, detail="ID de compañía requerido")
    
    # Validar que débitos = créditos
    total_debit = sum(line.debit for line in payload.lines)
    total_credit = sum(line.credit for line in payload.lines)
    
    if abs(total_debit - total_credit) > 0.01:  # Tolerancia de centavos
        raise HTTPException(status_code=400, detail="Los débitos deben ser iguales a los créditos")
    
    # Generar número de asiento
    last_entry = db.query(DBJournalEntry).filter(
        DBJournalEntry.company_id == company_id
    ).order_by(DBJournalEntry.entryNumber.desc()).first()
    
    next_number = (last_entry.entryNumber + 1) if last_entry else 1
    
    # Crear asiento
    new_entry = DBJournalEntry(
        company_id=company_id,
        entryNumber=next_number,
        date=payload.date,
        description=payload.description.strip(),
        reference=payload.reference.strip() if payload.reference else None,
        totalDebit=total_debit,
        totalCredit=total_credit,
        createdAt=datetime.now()
    )
    db.add(new_entry)
    db.flush()  # Para obtener el ID
    
    # Crear líneas
    for line_data in payload.lines:
        line = DBJournalLine(
            journalEntryId=new_entry.id,
            accountCode=line_data.accountCode,
            accountName=line_data.accountName,
            description=line_data.description.strip() if line_data.description else None,
            debit=line_data.debit,
            credit=line_data.credit
        )
        db.add(line)
    
    db.commit()
    db.refresh(new_entry)
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="JOURNAL_ENTRY_CREATE",
        module="Accounting",
        detail=f"Asiento contable creado: #{new_entry.entryNumber} - {new_entry.description}",
        company_id=company_id,
        db=db
    )
    
    return JournalEntryResponse(
        id=new_entry.id, company_id=new_entry.company_id, entryNumber=new_entry.entryNumber,
        date=new_entry.date, description=new_entry.description, reference=new_entry.reference,
        totalDebit=new_entry.totalDebit, totalCredit=new_entry.totalCredit,
        createdAt=new_entry.createdAt, lines=[]
    )

# -----------------------------
# Accounting - Mayor Contable
# -----------------------------
@app.get("/api/accounting/ledger", response_model=List[LedgerEntryResponse])
async def get_ledger_entries(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    accountCode: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener movimientos del mayor contable"""
    query = db.query(DBJournalLine)
    query = query.join(DBJournalEntry).filter(DBJournalEntry.company_id == context.get("company", {}).get("id"))
    
    # Aplicar filtros
    if startDate:
        start = datetime.fromisoformat(startDate)
        query = query.join(DBJournalEntry).filter(DBJournalEntry.date >= start)
    
    if endDate:
        end = datetime.fromisoformat(endDate) + timedelta(days=1)
        query = query.join(DBJournalEntry).filter(DBJournalEntry.date < end)
    
    if accountCode:
        query = query.filter(DBJournalLine.accountCode == accountCode)
    
    # Obtener movimientos ordenados por fecha y número de asiento
    movements = query.join(DBJournalEntry).order_by(
        DBJournalEntry.date.asc(),
        DBJournalEntry.entryNumber.asc(),
        DBJournalLine.id.asc()
    ).limit(500).all()
    
    # Agrupar por cuenta y calcular saldos
    ledger_data = {}
    for movement in movements:
        account_code = movement.accountCode
        if account_code not in ledger_data:
            ledger_data[account_code] = {
                'accountCode': account_code,
                'accountName': movement.accountName,
                'movements': [],
                'totalDebit': 0,
                'totalCredit': 0,
                'balance': 0
            }
        
        ledger_data[account_code]['movements'].append({
            'date': movement.journalEntry.date,
            'entryNumber': movement.journalEntry.entryNumber,
            'description': movement.description or movement.journalEntry.description,
            'debit': movement.debit,
            'credit': movement.credit
        })
        
        ledger_data[account_code]['totalDebit'] += movement.debit
        ledger_data[account_code]['totalCredit'] += movement.credit
    
    # Calcular saldos
    for account_code, data in ledger_data.items():
        data['balance'] = data['totalDebit'] - data['totalCredit']
    
    return [LedgerEntryResponse(
        accountCode=account_code,
        accountName=data['accountName'],
        movements=data['movements'],
        totalDebit=data['totalDebit'],
        totalCredit=data['totalCredit'],
        balance=data['balance']
    ) for account_code, data in ledger_data.items()]

@app.get("/api/accounting/ledger/{account_code}", response_model=LedgerAccountDetailResponse)
async def get_ledger_account_detail(
    account_code: str,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener detalle de una cuenta específica en el mayor"""
    company_id = context.get("company", {}).get("id")
    
    query = db.query(DBJournalLine)
    query = query.join(DBJournalEntry).filter(DBJournalEntry.company_id == company_id)
    query = query.filter(DBJournalLine.accountCode == account_code)
    
    # Aplicar filtros de fecha
    if startDate:
        start = datetime.fromisoformat(startDate)
        query = query.join(DBJournalEntry).filter(DBJournalEntry.date >= start)
    
    if endDate:
        end = datetime.fromisoformat(endDate) + timedelta(days=1)
        query = query.join(DBJournalEntry).filter(DBJournalEntry.date < end)
    
    movements = query.join(DBJournalEntry).order_by(
        DBJournalEntry.date.asc(),
        DBJournalEntry.entryNumber.asc(),
        DBJournalLine.id.asc()
    ).all()
    
    if not movements:
        raise HTTPException(status_code=404, detail="No se encontraron movimientos para esta cuenta")
    
    # Calcular totales
    total_debit = sum(m.debit for m in movements)
    total_credit = sum(m.credit for m in movements)
    balance = total_debit - total_credit
    
    return LedgerAccountDetailResponse(
        accountCode=account_code,
        accountName=movements[0].accountName,
        movements=[LedgerMovementResponse(
            date=movement.journalEntry.date,
            entryNumber=movement.journalEntry.entryNumber,
            description=movement.description or movement.journalEntry.description,
            debit=movement.debit,
            credit=movement.credit
        ) for movement in movements],
        totalDebit=total_debit,
        totalCredit=total_credit,
        balance=balance
    )

# -----------------------------
# Accounting - Balance de Prueba
# -----------------------------
@app.get("/api/accounting/trial-balance", response_model=TrialBalanceResponse)
async def get_trial_balance(
    asOfDate: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener balance de prueba"""
    company_id = context.get("company", {}).get("id")
    
    # Usar fecha actual si no se especifica
    if asOfDate:
        cutoff_date = datetime.fromisoformat(asOfDate) + timedelta(days=1)
    else:
        cutoff_date = datetime.now() + timedelta(days=1)
    
    # Obtener todas las cuentas con movimientos hasta la fecha especificada
    query = db.query(DBJournalLine)
    query = query.join(DBJournalEntry).filter(
        DBJournalEntry.company_id == company_id,
        DBJournalEntry.date < cutoff_date
    )
    
    movements = query.all()
    
    # Agrupar por cuenta y calcular saldos
    account_data = {}
    for movement in movements:
        account_code = movement.accountCode
        if account_code not in account_data:
            account_data[account_code] = {
                'accountCode': account_code,
                'accountName': movement.accountName,
                'totalDebit': 0,
                'totalCredit': 0,
                'balance': 0
            }
        
        account_data[account_code]['totalDebit'] += movement.debit
        account_data[account_code]['totalCredit'] += movement.credit
    
    # Calcular saldos
    for account_code, data in account_data.items():
        data['balance'] = data['totalDebit'] - data['totalCredit']
    
    # Separar en activos/pasivos y patrimonio
    assets = []
    liabilities = []
    equity = []
    
    for account_code, data in account_data.items():
        account_entry = TrialBalanceAccountResponse(
            accountCode=data['accountCode'],
            accountName=data['accountName'],
            totalDebit=data['totalDebit'],
            totalCredit=data['totalCredit'],
            balance=data['balance']
        )
        
        # Clasificar por tipo de cuenta (simplificado)
        if account_code.startswith(('1', '2')):  # Activos
            assets.append(account_entry)
        elif account_code.startswith(('3', '4')):  # Pasivos
            liabilities.append(account_entry)
        else:  # Patrimonio y otros
            equity.append(account_entry)
    
    # Ordenar por código de cuenta
    assets.sort(key=lambda x: x.accountCode)
    liabilities.sort(key=lambda x: x.accountCode)
    equity.sort(key=lambda x: x.accountCode)
    
    # Calcular totales
    total_assets_debit = sum(a.totalDebit for a in assets)
    total_assets_credit = sum(a.totalCredit for a in assets)
    total_assets_balance = sum(a.balance for a in assets)
    
    total_liabilities_debit = sum(l.totalDebit for l in liabilities)
    total_liabilities_credit = sum(l.totalCredit for l in liabilities)
    total_liabilities_balance = sum(l.balance for l in liabilities)
    
    total_equity_debit = sum(e.totalDebit for e in equity)
    total_equity_credit = sum(e.totalCredit for e in equity)
    total_equity_balance = sum(e.balance for e in equity)
    
    # Verificar balance
    total_debits = total_assets_debit + total_liabilities_debit + total_equity_debit
    total_credits = total_assets_credit + total_liabilities_credit + total_equity_credit
    is_balanced = abs(total_debits - total_credits) < 0.01
    
    return TrialBalanceResponse(
        asOfDate=cutoff_date.date(),
        assets=assets,
        liabilities=liabilities,
        equity=equity,
        totalAssetsDebit=total_assets_debit,
        totalAssetsCredit=total_assets_credit,
        totalAssetsBalance=total_assets_balance,
        totalLiabilitiesDebit=total_liabilities_debit,
        totalLiabilitiesCredit=total_liabilities_credit,
        totalLiabilitiesBalance=total_liabilities_balance,
        totalEquityDebit=total_equity_debit,
        totalEquityCredit=total_equity_credit,
        totalEquityBalance=total_equity_balance,
        totalDebits=total_debits,
        totalCredits=total_credits,
        isBalanced=is_balanced
    )

# -----------------------------
# Reports - Reportes del Sistema
# -----------------------------
@app.get("/api/reports/sales-summary", response_model=SalesSummaryReportResponse)
async def get_sales_summary_report(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Reporte de resumen de ventas"""
    company_id = context.get("company", {}).get("id")
    
    # Usar fechas por defecto si no se especifican
    if not startDate:
        startDate = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not endDate:
        endDate = datetime.now().strftime('%Y-%m-%d')
    
    start = datetime.fromisoformat(startDate)
    end = datetime.fromisoformat(endDate) + timedelta(days=1)
    
    # Obtener ventas del período
    sales = db.query(DBSale).filter(
        DBSale.company_id == company_id,
        DBSale.date >= start,
        DBSale.date < end
    ).all()
    
    # Calcular métricas
    total_sales = len(sales)
    total_amount = sum(sale.total for sale in sales)
    total_tax = sum(sale.tax for sale in sales)
    total_discount = sum(sale.discount for sale in sales)
    
    # Ventas por día
    daily_sales = {}
    for sale in sales:
        date_key = sale.date.strftime('%Y-%m-%d')
        if date_key not in daily_sales:
            daily_sales[date_key] = {'count': 0, 'amount': 0}
        daily_sales[date_key]['count'] += 1
        daily_sales[date_key]['amount'] += sale.total
    
    # Ventas por usuario
    user_sales = {}
    for sale in sales:
        user_id = sale.userId
        if user_id not in user_sales:
            user_sales[user_id] = {'count': 0, 'amount': 0}
        user_sales[user_id]['count'] += 1
        user_sales[user_id]['amount'] += sale.total
    
    return SalesSummaryReportResponse(
        periodStart=start.date(),
        periodEnd=datetime.fromisoformat(endDate).date(),
        totalSales=total_sales,
        totalAmount=total_amount,
        totalTax=total_tax,
        totalDiscount=total_discount,
        averageSaleAmount=total_amount / total_sales if total_sales > 0 else 0,
        dailySales=[DailySalesResponse(
            date=date_key,
            salesCount=data['count'],
            totalAmount=data['amount']
        ) for date_key, data in daily_sales.items()],
        userSales=[UserSalesResponse(
            userId=user_id,
            salesCount=data['count'],
            totalAmount=data['amount']
        ) for user_id, data in user_sales.items()]
    )

@app.get("/api/reports/inventory-status", response_model=InventoryStatusReportResponse)
async def get_inventory_status_report(
    lowStockThreshold: Optional[int] = 10,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Reporte de estado de inventario"""
    company_id = context.get("company", {}).get("id")
    
    # Obtener todos los productos
    products = db.query(DBProduct).filter(
        DBProduct.company_id == company_id,
        DBProduct.isActive == True
    ).all()
    
    # Clasificar productos
    low_stock_products = []
    out_of_stock_products = []
    normal_stock_products = []
    
    total_products = len(products)
    total_value = 0
    
    for product in products:
        product_value = product.stock * product.price
        total_value += product_value
        
        if product.stock == 0:
            out_of_stock_products.append(InventoryProductResponse(
                id=product.id,
                name=product.name,
                code=product.code,
                stock=product.stock,
                price=product.price,
                value=product_value,
                category=product.category
            ))
        elif product.stock <= lowStockThreshold:
            low_stock_products.append(InventoryProductResponse(
                id=product.id,
                name=product.name,
                code=product.code,
                stock=product.stock,
                price=product.price,
                value=product_value,
                category=product.category
            ))
        else:
            normal_stock_products.append(InventoryProductResponse(
                id=product.id,
                name=product.name,
                code=product.code,
                stock=product.stock,
                price=product.price,
                value=product_value,
                category=product.category
            ))
    
    return InventoryStatusReportResponse(
        totalProducts=total_products,
        totalValue=total_value,
        lowStockThreshold=lowStockThreshold,
        lowStockProducts=low_stock_products,
        outOfStockProducts=out_of_stock_products,
        normalStockProducts=normal_stock_products,
        lowStockCount=len(low_stock_products),
        outOfStockCount=len(out_of_stock_products),
        normalStockCount=len(normal_stock_products)
    )

@app.get("/api/reports/financial-summary", response_model=FinancialSummaryReportResponse)
async def get_financial_summary_report(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Reporte de resumen financiero"""
    company_id = context.get("company", {}).get("id")
    
    # Usar fechas por defecto si no se especifican
    if not startDate:
        startDate = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not endDate:
        endDate = datetime.now().strftime('%Y-%m-%d')
    
    start = datetime.fromisoformat(startDate)
    end = datetime.fromisoformat(endDate) + timedelta(days=1)
    
    # Obtener ventas del período
    sales = db.query(DBSale).filter(
        DBSale.company_id == company_id,
        DBSale.date >= start,
        DBSale.date < end
    ).all()
    
    # Obtener movimientos contables del período
    journal_lines = db.query(DBJournalLine).join(DBJournalEntry).filter(
        DBJournalEntry.company_id == company_id,
        DBJournalEntry.date >= start,
        DBJournalEntry.date < end
    ).all()
    
    # Calcular métricas de ventas
    total_sales_amount = sum(sale.total for sale in sales)
    total_sales_tax = sum(sale.tax for sale in sales)
    total_sales_discount = sum(sale.discount for sale in sales)
    
    # Calcular métricas contables
    total_debits = sum(line.debit for line in journal_lines)
    total_credits = sum(line.credit for line in journal_lines)
    
    # Agrupar por tipo de cuenta
    account_totals = {}
    for line in journal_lines:
        account_code = line.accountCode
        if account_code not in account_totals:
            account_totals[account_code] = {'debit': 0, 'credit': 0, 'name': line.accountName}
        account_totals[account_code]['debit'] += line.debit
        account_totals[account_code]['credit'] += line.credit
    
    return FinancialSummaryReportResponse(
        periodStart=start.date(),
        periodEnd=datetime.fromisoformat(endDate).date(),
        salesMetrics=SalesMetricsResponse(
            totalAmount=total_sales_amount,
            totalTax=total_sales_tax,
            totalDiscount=total_sales_discount,
            salesCount=len(sales),
            averageSaleAmount=total_sales_amount / len(sales) if sales else 0
        ),
        accountingMetrics=AccountingMetricsResponse(
            totalDebits=total_debits,
            totalCredits=total_credits,
            journalEntriesCount=len(set(line.journalEntryId for line in journal_lines)),
            accountsWithActivity=len(account_totals)
        ),
        accountTotals=[AccountTotalResponse(
            accountCode=code,
            accountName=data['name'],
            totalDebit=data['debit'],
            totalCredit=data['credit'],
            balance=data['debit'] - data['credit']
        ) for code, data in account_totals.items()]
    )

# -----------------------------
# Accounting - Plan de Cuentas
# -----------------------------
@app.get("/api/accounting/accounts", response_model=List[AccountResponse])
async def get_accounts(
    accountType: Optional[str] = None,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener plan de cuentas de la compañía"""
    try:
        query = db.query(DBAccount)
        query = context_service.apply_company_filter(query, DBAccount, context)
        
        # Aplicar filtro por tipo si se especifica
        if accountType:
            query = query.filter(DBAccount.accountType == accountType)
        
        accounts = query.filter(DBAccount.isActive == True).order_by(DBAccount.code.asc()).all()
        
        return [AccountResponse(
            id=account.id,
            company_id=account.company_id,
            code=account.code,
            name=account.name,
            accountType=account.accountType,
            parentCode=account.parentCode,
            level=account.level,
            isActive=account.isActive,
            createdAt=account.createdAt,
            updatedAt=account.updatedAt
        ) for account in accounts]
    except Exception as e:
        print(f"Error getting accounts: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.post("/api/accounting/accounts", response_model=AccountResponse)
async def create_account(payload: AccountCreate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Crear nueva cuenta contable"""
    company_id = context.get("company", {}).get("id")
    if not company_id and not context.get("user", {}).get("is_sudo"):
        raise HTTPException(status_code=400, detail="ID de compañía requerido")
    
    # Verificar que no exista una cuenta con el mismo código
    existing = db.query(DBAccount).filter(
        DBAccount.company_id == company_id,
        DBAccount.code == payload.code.strip(),
        DBAccount.isActive == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con este código")
    
    # Calcular nivel basado en el código
    level = len(payload.code.strip()) // 2
    
    # Verificar cuenta padre si se especifica
    parent_account = None
    if payload.parentCode:
        parent_account = db.query(DBAccount).filter(
            DBAccount.company_id == company_id,
            DBAccount.code == payload.parentCode.strip(),
            DBAccount.isActive == True
        ).first()
        
        if not parent_account:
            raise HTTPException(status_code=400, detail="Cuenta padre no encontrada")
    
    new_account = DBAccount(
        company_id=company_id,
        code=payload.code.strip(),
        name=payload.name.strip(),
        accountType=payload.accountType,
        parentCode=payload.parentCode.strip() if payload.parentCode else None,
        level=level,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="ACCOUNT_CREATE",
        module="Accounting",
        detail=f"Cuenta creada: {new_account.code} - {new_account.name}",
        company_id=company_id,
        db=db
    )
    
    return AccountResponse(
        id=new_account.id,
        company_id=new_account.company_id,
        code=new_account.code,
        name=new_account.name,
        accountType=new_account.accountType,
        parentCode=new_account.parentCode,
        level=new_account.level,
        isActive=new_account.isActive,
        createdAt=new_account.createdAt,
        updatedAt=new_account.updatedAt
    )

@app.put("/api/accounting/accounts/{account_id}", response_model=AccountResponse)
async def update_account(account_id: int, payload: AccountUpdate, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Actualizar cuenta contable"""
    account = db.query(DBAccount).filter(DBAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    if not context_service.validate_company_access(context, account.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Verificar código único si se está cambiando
    if payload.code and payload.code.strip() != account.code:
        existing = db.query(DBAccount).filter(
            DBAccount.company_id == account.company_id,
            DBAccount.code == payload.code.strip(),
            DBAccount.isActive == True,
            DBAccount.id != account_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Ya existe una cuenta con este código")
    
    # Actualizar campos
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "code" and value:
            setattr(account, field, value.strip())
            # Recalcular nivel
            account.level = len(value.strip()) // 2
        elif field == "name" and value:
            setattr(account, field, value.strip())
        else:
            setattr(account, field, value)
    
    account.updatedAt = datetime.now()
    db.commit()
    db.refresh(account)
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="ACCOUNT_UPDATE",
        module="Accounting",
        detail=f"Cuenta actualizada: {account.code} - {account.name}",
        company_id=account.company_id,
        db=db
    )
    
    return AccountResponse(
        id=account.id,
        company_id=account.company_id,
        code=account.code,
        name=account.name,
        accountType=account.accountType,
        parentCode=account.parentCode,
        level=account.level,
        isActive=account.isActive,
        createdAt=account.createdAt,
        updatedAt=account.updatedAt
    )

@app.delete("/api/accounting/accounts/{account_id}")
async def delete_account(account_id: int, context: dict = Depends(get_current_context), db: Session = Depends(get_db)):
    """Eliminar cuenta contable (soft delete)"""
    account = db.query(DBAccount).filter(DBAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    if not context_service.validate_company_access(context, account.company_id):
        raise HTTPException(status_code=403, detail="No autorizado")
    
    # Verificar que no tenga movimientos contables
    movements_count = db.query(DBJournalLine).filter(
        DBJournalLine.accountCode == account.code
    ).count()
    
    if movements_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar la cuenta porque tiene {movements_count} movimientos contables"
        )
    
    # Verificar que no tenga cuentas hijas
    children_count = db.query(DBAccount).filter(
        DBAccount.parentCode == account.code,
        DBAccount.company_id == account.company_id,
        DBAccount.isActive == True
    ).count()
    
    if children_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar la cuenta porque tiene {children_count} cuentas hijas"
        )
    
    # Soft delete
    account.isActive = False
    account.updatedAt = datetime.now()
    db.commit()
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="ACCOUNT_DELETE",
        module="Accounting",
        detail=f"Cuenta eliminada: {account.code} - {account.name}",
        company_id=account.company_id,
        db=db
    )
    
    return {"message": "Cuenta eliminada exitosamente"}

# -----------------------------
# Dashboard - Métricas en Tiempo Real
# -----------------------------
@app.get("/api/dashboard/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    period: Optional[str] = "today",
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener métricas del dashboard"""
    try:
        company_id = context.get("company", {}).get("id")
        
        # Calcular fechas según el período
        now = datetime.now()
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif period == "week":
            start_date = now - timedelta(days=7)
            end_date = now
        elif period == "month":
            start_date = now - timedelta(days=30)
            end_date = now
        else:
            start_date = now - timedelta(days=1)
            end_date = now
        
        # Métricas de Ventas
        sales_query = db.query(DBSale).filter(
            DBSale.company_id == company_id,
            DBSale.date >= start_date,
            DBSale.date <= end_date
        )
        
        total_sales = sales_query.count()
        total_revenue = db.query(func.sum(DBSale.total)).filter(
            DBSale.company_id == company_id,
            DBSale.date >= start_date,
            DBSale.date <= end_date
        ).scalar() or 0
        
        total_tax = db.query(func.sum(DBSale.taxAmount)).filter(
            DBSale.company_id == company_id,
            DBSale.date >= start_date,
            DBSale.date <= end_date
        ).scalar() or 0
        
        average_sale = total_revenue / total_sales if total_sales > 0 else 0
        
        # Métricas de Productos
        total_products = db.query(DBProduct).filter(DBProduct.company_id == company_id).count()
        low_stock_products = db.query(DBProduct).filter(
            DBProduct.company_id == company_id,
            DBProduct.stock <= DBProduct.minStock
        ).count()
        
        # Métricas de Contabilidad
        total_accounts = db.query(DBAccount).filter(DBAccount.company_id == company_id).count()
        
        # Ventas diarias para gráfico
        daily_sales = []
        current_date = start_date
        while current_date <= end_date:
            day_sales = db.query(func.sum(DBSale.total)).filter(
                DBSale.company_id == company_id,
                DBSale.date >= current_date,
                DBSale.date < current_date + timedelta(days=1)
            ).scalar() or 0
            
            daily_sales.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "amount": float(day_sales)
            })
            current_date += timedelta(days=1)
        
        # Top productos
        top_products = db.query(
            DBSaleItem.productName,
            func.sum(DBSaleItem.quantity).label('total_quantity'),
            func.sum(DBSaleItem.total).label('total_revenue')
        ).join(DBSale).filter(
            DBSale.company_id == company_id,
            DBSale.date >= start_date,
            DBSale.date <= end_date
        ).group_by(DBSaleItem.productName).order_by(
            func.sum(DBSaleItem.quantity).desc()
        ).limit(5).all()
        
        top_products_data = [
            {
                "productName": item.productName,
                "quantity": int(item.total_quantity),
                "revenue": float(item.total_revenue)
            }
            for item in top_products
        ]
        
        # Alertas
        alerts = []
        if low_stock_products > 0:
            alerts.append({
                "type": "warning",
                "message": f"{low_stock_products} productos con stock bajo",
                "timestamp": now.isoformat()
            })
        
        return DashboardMetricsResponse(
            sales=SalesDashboardMetrics(
                totalSales=total_sales,
                totalRevenue=float(total_revenue),
                totalTax=float(total_tax),
                averageSale=float(average_sale)
            ),
            inventory=InventoryDashboardMetrics(
                totalProducts=total_products,
                lowStockProducts=low_stock_products
            ),
            accounting=AccountingDashboardMetrics(
                totalAccounts=total_accounts
            ),
            dailySales=daily_sales,
            topProducts=top_products_data,
            alerts=alerts
        )
    except Exception as e:
        print(f"Error getting dashboard metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
    
    # Métricas de Inventario
    inventory_value = db.query(func.sum(DBProduct.stock * DBProduct.price)).filter(
        DBProduct.company_id == company_id,
        DBProduct.isActive == True
    ).scalar() or 0
    
    # Métricas Contables
    journal_entries_count = db.query(DBJournalEntry).filter(
        DBJournalEntry.company_id == company_id,
        DBJournalEntry.date >= start_date,
        DBJournalEntry.date <= end_date
    ).count()
    
    # Ventas por día (últimos 7 días)
    daily_sales = []
    for i in range(7):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_sales = db.query(func.sum(DBSale.total)).filter(
            DBSale.company_id == company_id,
            DBSale.date >= day_start,
            DBSale.date < day_end
        ).scalar() or 0
        
        daily_sales.append({
            "date": day_start.strftime('%Y-%m-%d'),
            "amount": day_sales
        })
    
    daily_sales.reverse()  # Ordenar cronológicamente
    
    # Productos más vendidos (últimos 7 días)
    top_products = db.query(
        DBSaleItem.productName,
        func.sum(DBSaleItem.quantity).label('total_quantity'),
        func.sum(DBSaleItem.total).label('total_amount')
    ).join(DBSale).filter(
        DBSale.company_id == company_id,
        DBSale.date >= start_date,
        DBSale.date <= end_date
    ).group_by(DBSaleItem.productName).order_by(
        func.sum(DBSaleItem.quantity).desc()
    ).limit(5).all()
    
    # Alertas del sistema
    alerts = []
    
    if out_of_stock_products > 0:
        alerts.append({
            "type": "error",
            "message": f"{out_of_stock_products} productos sin stock",
            "icon": "error"
        })
    
    if low_stock_products > 0:
        alerts.append({
            "type": "warning",
            "message": f"{low_stock_products} productos con stock bajo",
            "icon": "warning"
        })
    
    if total_sales == 0 and period == "today":
        alerts.append({
            "type": "info",
            "message": "No hay ventas registradas hoy",
            "icon": "info"
        })
    
    return DashboardMetricsResponse(
        period=period,
        periodStart=start_date.date(),
        periodEnd=end_date.date(),
        salesMetrics=SalesDashboardMetrics(
            totalSales=total_sales,
            totalRevenue=total_revenue,
            totalTax=total_tax,
            averageSale=average_sale
        ),
        inventoryMetrics=InventoryDashboardMetrics(
            totalProducts=total_products,
            lowStockProducts=low_stock_products,
            outOfStockProducts=out_of_stock_products,
            inventoryValue=inventory_value
        ),
        accountingMetrics=AccountingDashboardMetrics(
            journalEntriesCount=journal_entries_count
        ),
        dailySales=daily_sales,
        topProducts=[TopProductResponse(
            productName=product.productName,
            totalQuantity=product.total_quantity,
            totalAmount=product.total_amount
        ) for product in top_products],
        alerts=alerts
    )

# -----------------------------
# Business Configuration
# -----------------------------
@app.get("/api/business/config", response_model=BusinessConfigResponse)
async def get_business_config(
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Obtener configuración de la empresa"""
    company_id = context.get("company", {}).get("id")
    
    company = db.query(DBCompany).filter(DBCompany.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    return BusinessConfigResponse(
        id=company.id,
        nombre=company.nombre,
        razonSocial=company.razonSocial,
        nit=company.nit,
        nrc=company.nrc,
        direccion=company.direccion,
        telefono=company.telefono,
        email=company.email,
        sitioWeb=company.sitioWeb,
        logoUrl=company.logoUrl,
        moneda=company.moneda,
        pais=company.pais,
        ciudad=company.ciudad,
        codigoPostal=company.codigoPostal,
        regimenFiscal=company.regimenFiscal,
        actividadEconomica=company.actividadEconomica,
        fechaInicioOperaciones=company.fechaInicioOperaciones,
        representanteLegal=company.representanteLegal,
        contador=company.contador,
        auditor=company.auditor,
        configuracionFiscal=company.configuracionFiscal,
        configuracionContable=company.configuracionContable,
        configuracionPOS=company.configuracionPOS,
        createdAt=company.createdAt,
        updatedAt=company.updatedAt
    )

@app.put("/api/business/config", response_model=BusinessConfigResponse)
async def update_business_config(
    payload: BusinessConfigUpdate,
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Actualizar configuración de la empresa"""
    company_id = context.get("company", {}).get("id")
    
    company = db.query(DBCompany).filter(DBCompany.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    
    # Actualizar campos
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(company, field, value)
    
    company.updatedAt = datetime.now()
    db.commit()
    db.refresh(company)
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="BUSINESS_CONFIG_UPDATE",
        module="Business",
        detail="Configuración de empresa actualizada",
        company_id=company_id,
        db=db
    )
    
    return BusinessConfigResponse(
        id=company.id,
        nombre=company.nombre,
        razonSocial=company.razonSocial,
        nit=company.nit,
        nrc=company.nrc,
        direccion=company.direccion,
        telefono=company.telefono,
        email=company.email,
        sitioWeb=company.sitioWeb,
        logoUrl=company.logoUrl,
        moneda=company.moneda,
        pais=company.pais,
        ciudad=company.ciudad,
        codigoPostal=company.codigoPostal,
        regimenFiscal=company.regimenFiscal,
        actividadEconomica=company.actividadEconomica,
        fechaInicioOperaciones=company.fechaInicioOperaciones,
        representanteLegal=company.representanteLegal,
        contador=company.contador,
        auditor=company.auditor,
        configuracionFiscal=company.configuracionFiscal,
        configuracionContable=company.configuracionContable,
        configuracionPOS=company.configuracionPOS,
        createdAt=company.createdAt,
        updatedAt=company.updatedAt
    )

@app.post("/api/business/config/logo")
async def upload_logo(
    file: UploadFile = File(...),
    context: dict = Depends(get_current_context),
    db: Session = Depends(get_db)
):
    """Subir logo de la empresa"""
    company_id = context.get("company", {}).get("id")
    
    # Validar tipo de archivo
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de imagen")
    
    # Validar tamaño (máximo 2MB)
    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede ser mayor a 2MB")
    
    # Generar nombre único
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    filename = f"logo_{company_id}_{int(datetime.now().timestamp())}.{file_extension}"
    
    # En un entorno real, aquí guardarías el archivo en un servicio de almacenamiento
    # Por ahora, simulamos la URL
    logo_url = f"/uploads/logos/{filename}"
    
    # Actualizar empresa
    company = db.query(DBCompany).filter(DBCompany.id == company_id).first()
    if company:
        company.logoUrl = logo_url
        company.updatedAt = datetime.now()
        db.commit()
    
    # Registrar evento de auditoría
    user_id = context.get("user", {}).get("id")
    log_audit_event(
        user_id=user_id,
        action="LOGO_UPLOAD",
        module="Business",
        detail=f"Logo actualizado: {filename}",
        company_id=company_id,
        db=db
    )
    
    return {"message": "Logo subido exitosamente", "logoUrl": logo_url}

# Rutas de usuarios

# Rutas de usuarios

# Rutas de usuarios

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
