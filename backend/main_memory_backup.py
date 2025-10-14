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
    ),
    Product(
        id=4,
        code="SKU00004",
        name="Arroz Blanco 1lb",
        description="Arroz blanco de primera calidad 1 libra",
        price=1.50,
        cost=0.90,
        category="Cereales",
        brand="Arrocera Nacional",
        stock=120,
        minStock=20,
        maxStock=200,
        barcode="4567890123456",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=5,
        code="SKU00005",
        name="Frijoles Negros 1lb",
        description="Frijoles negros de primera calidad",
        price=1.80,
        cost=1.20,
        category="Cereales",
        brand="Granos del Campo",
        stock=90,
        minStock=15,
        maxStock=150,
        barcode="5678901234567",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=6,
        code="SKU00006",
        name="Aceite Vegetal 1L",
        description="Aceite vegetal 100% puro 1 litro",
        price=4.50,
        cost=3.20,
        category="Despensa",
        brand="Aceites del Sol",
        stock=60,
        minStock=10,
        maxStock=120,
        barcode="6789012345678",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=7,
        code="SKU00007",
        name="Huevos Blancos x12",
        description="Huevos blancos de gallina, cartón de 12 unidades",
        price=3.50,
        cost=2.80,
        category="Lácteos",
        brand="Granja Santa Rosa",
        stock=45,
        minStock=8,
        maxStock=100,
        barcode="7890123456789",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=8,
        code="SKU00008",
        name="Queso Fresco 1lb",
        description="Queso fresco elaborado artesanalmente",
        price=5.25,
        cost=3.80,
        category="Lácteos",
        brand="Quesería El Rancho",
        stock=30,
        minStock=5,
        maxStock=60,
        barcode="8901234567890",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=9,
        code="SKU00009",
        name="Pollo Entero Fresco",
        description="Pollo entero fresco, aproximadamente 3-4 lbs",
        price=8.50,
        cost=6.00,
        category="Carnes",
        brand="Avícola San Miguel",
        stock=25,
        minStock=5,
        maxStock=50,
        barcode="9012345678901",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=10,
        code="SKU00010",
        name="Carne Molida 1lb",
        description="Carne de res molida 80/20",
        price=6.75,
        cost=4.50,
        category="Carnes",
        brand="Carnes Premium",
        stock=40,
        minStock=8,
        maxStock=80,
        barcode="0123456789012",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=11,
        code="SKU00011",
        name="Tomate Fresco 1lb",
        description="Tomates frescos de la región",
        price=1.25,
        cost=0.70,
        category="Frutas y Verduras",
        brand="Huerta Fresca",
        stock=80,
        minStock=15,
        maxStock=150,
        barcode="1234567890124",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=12,
        code="SKU00012",
        name="Cebolla Blanca 1lb",
        description="Cebolla blanca fresca",
        price=0.95,
        cost=0.50,
        category="Frutas y Verduras",
        brand="Huerta Fresca",
        stock=100,
        minStock=20,
        maxStock=180,
        barcode="2345678901235",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=13,
        code="SKU00013",
        name="Plátano Verde 1lb",
        description="Plátanos verdes para cocinar",
        price=0.75,
        cost=0.40,
        category="Frutas y Verduras",
        brand="Frutales del Trópico",
        stock=95,
        minStock=20,
        maxStock=170,
        barcode="3456789012346",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=14,
        code="SKU00014",
        name="Papas 2lb",
        description="Papas frescas bolsa de 2 libras",
        price=2.25,
        cost=1.40,
        category="Frutas y Verduras",
        brand="Huerta Fresca",
        stock=70,
        minStock=12,
        maxStock=140,
        barcode="4567890123457",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=15,
        code="SKU00015",
        name="Azúcar Blanca 2lb",
        description="Azúcar blanca refinada bolsa de 2 libras",
        price=2.10,
        cost=1.50,
        category="Despensa",
        brand="Azucarera Central",
        stock=85,
        minStock=15,
        maxStock=160,
        barcode="5678901234568",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=16,
        code="SKU00016",
        name="Sal de Mesa 1lb",
        description="Sal de mesa yodada y fluorada",
        price=0.65,
        cost=0.35,
        category="Despensa",
        brand="Sal Marina",
        stock=110,
        minStock=20,
        maxStock=200,
        barcode="6789012345679",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=17,
        code="SKU00017",
        name="Pasta Espagueti 1lb",
        description="Pasta espagueti de sémola de trigo",
        price=1.45,
        cost=0.90,
        category="Despensa",
        brand="Pastas La Italiana",
        stock=75,
        minStock=12,
        maxStock=140,
        barcode="7890123456780",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=18,
        code="SKU00018",
        name="Café Molido 400g",
        description="Café molido 100% arábica 400 gramos",
        price=6.50,
        cost=4.20,
        category="Bebidas",
        brand="Café del Valle",
        stock=55,
        minStock=10,
        maxStock=100,
        barcode="8901234567891",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=19,
        code="SKU00019",
        name="Jabón de Baño 3pack",
        description="Jabón de tocador pack de 3 unidades",
        price=2.75,
        cost=1.80,
        category="Cuidado Personal",
        brand="Jabones Premium",
        stock=65,
        minStock=12,
        maxStock=130,
        barcode="9012345678902",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=20,
        code="SKU00020",
        name="Pasta Dental 100ml",
        description="Pasta dental con flúor 100ml",
        price=3.25,
        cost=2.10,
        category="Cuidado Personal",
        brand="Sonrisa Blanca",
        stock=80,
        minStock=15,
        maxStock=150,
        barcode="0123456789013",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=21,
        code="SKU00021",
        name="Champú 400ml",
        description="Champú para todo tipo de cabello",
        price=5.50,
        cost=3.50,
        category="Cuidado Personal",
        brand="Cabello Sano",
        stock=48,
        minStock=10,
        maxStock=90,
        barcode="1234567890125",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=22,
        code="SKU00022",
        name="Papel Higiénico 4 rollos",
        description="Papel higiénico doble hoja pack de 4 rollos",
        price=3.80,
        cost=2.50,
        category="Limpieza",
        brand="Suave Plus",
        stock=95,
        minStock=18,
        maxStock=180,
        barcode="2345678901236",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=23,
        code="SKU00023",
        name="Detergente en Polvo 1kg",
        description="Detergente en polvo para ropa 1 kilogramo",
        price=4.95,
        cost=3.20,
        category="Limpieza",
        brand="Limpio Total",
        stock=52,
        minStock=10,
        maxStock=100,
        barcode="3456789012347",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=24,
        code="SKU00024",
        name="Cloro 1L",
        description="Cloro desinfectante 1 litro",
        price=2.25,
        cost=1.40,
        category="Limpieza",
        brand="Desinfect Max",
        stock=68,
        minStock=12,
        maxStock=130,
        barcode="4567890123458",
        taxRate=15,
        isActive=True,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    ),
    Product(
        id=25,
        code="SKU00025",
        name="Galletas de Chocolate 300g",
        description="Galletas con chispas de chocolate 300 gramos",
        price=3.15,
        cost=2.00,
        category="Snacks",
        brand="Dulce Momento",
        stock=72,
        minStock=14,
        maxStock=140,
        barcode="5678901234569",
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
    ProductCategory(id=15, name="Jardín", description="Productos de jardinería", isActive=True),
    ProductCategory(id=16, name="Despensa", description="Productos de despensa y abarrotes", isActive=True)
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

# Datos contables iniciales
accounts_db = [
    # Activos
    Account(id=1, code="1101", name="Caja", accountType="activo", nature="deudora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    Account(id=2, code="1102", name="Bancos", accountType="activo", nature="deudora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    Account(id=3, code="1201", name="Cuentas por Cobrar", accountType="activo", nature="deudora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    Account(id=4, code="1301", name="Inventarios", accountType="activo", nature="deudora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    
    # Pasivos
    Account(id=5, code="2101", name="Cuentas por Pagar", accountType="pasivo", nature="acreedora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    Account(id=6, code="2201", name="IVA Crédito Fiscal", accountType="pasivo", nature="acreedora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    
    # Patrimonio
    Account(id=7, code="3101", name="Capital Social", accountType="patrimonio", nature="acreedora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    Account(id=8, code="3201", name="Utilidades Retenidas", accountType="patrimonio", nature="acreedora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    
    # Ingresos
    Account(id=9, code="4101", name="Ventas", accountType="ingreso", nature="acreedora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    Account(id=10, code="4201", name="IVA Débito Fiscal", accountType="ingreso", nature="acreedora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    
    # Gastos
    Account(id=11, code="5101", name="Costo de Ventas", accountType="gasto", nature="deudora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    Account(id=12, code="5201", name="Gastos Operativos", accountType="gasto", nature="deudora", level=2, parentId=None, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
]

# Bases de datos contables
journal_entries_db = []
journal_lines_db = []
inventory_movements_db = []
ar_invoices_db = []
ap_invoices_db = []

# Contadores para IDs únicos
next_journal_entry_id = 1
next_journal_line_id = 1
next_inventory_movement_id = 1
next_ar_invoice_id = 1
next_ap_invoice_id = 1

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

def create_journal_entry(source: str, reference: str, description: str, lines_data: List[dict], created_by: int) -> JournalEntry:
    """Crear póliza contable"""
    global next_journal_entry_id, next_journal_line_id
    
    # Crear póliza
    journal_entry = JournalEntry(
        id=next_journal_entry_id,
        entryNumber=f"POL-{next_journal_entry_id:06d}",
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
    
    # Crear líneas de la póliza
    journal_lines = []
    for line_data in lines_data:
        journal_line = JournalLine(
            id=next_journal_line_id,
            journalEntryId=journal_entry.id,
            accountId=line_data["accountId"],
            description=line_data["description"],
            debit=line_data.get("debit", 0.0),
            credit=line_data.get("credit", 0.0),
            costCenter=line_data.get("costCenter"),
            createdAt=datetime.now()
        )
        journal_lines.append(journal_line)
        journal_lines_db.append(journal_line)
        next_journal_line_id += 1
    
    journal_entry.lines = journal_lines
    journal_entries_db.append(journal_entry)
    next_journal_entry_id += 1
    
    return journal_entry

def create_inventory_movement(product_id: int, movement_type: str, quantity: int, unit_cost: float, reference: str, reference_id: Optional[int] = None) -> InventoryMovement:
    """Crear movimiento de inventario"""
    global next_inventory_movement_id
    
    movement = InventoryMovement(
        id=next_inventory_movement_id,
        productId=product_id,
        movementType=movement_type,
        quantity=quantity,
        unitCost=unit_cost,
        totalCost=quantity * unit_cost,
        reference=reference,
        referenceId=reference_id,
        createdAt=datetime.now()
    )
    
    inventory_movements_db.append(movement)
    next_inventory_movement_id += 1
    
    return movement

def post_sale_to_accounting(sale: Sale) -> dict:
    """Contabilizar venta en libros contables"""
    global next_ar_invoice_id
    
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
            created_by=sale.cashierId
        )
        
        # 2. Crear póliza de costo (Costo de Ventas + Inventarios)
        cost_entry = None
        total_cost = 0.0
        
        for item in sale.items:
            # Buscar producto para obtener costo
            product = next((p for p in products_db if p.id == item.productId), None)
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
                    reference_id=sale.id
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
                created_by=sale.cashierId
            )
        
        # 3. Crear registro de factura AR
        ar_invoice = ArInvoice(
            id=next_ar_invoice_id,
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
        
        ar_invoices_db.append(ar_invoice)
        next_ar_invoice_id += 1
        
        return {
            "success": True,
            "income_entry_id": income_entry.id,
            "cost_entry_id": cost_entry.id if cost_entry else None,
            "ar_invoice_id": ar_invoice.id,
            "message": "Venta contabilizada exitosamente"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Error al contabilizar la venta"
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
    
    # Contabilizar la venta en libros contables
    accounting_result = post_sale_to_accounting(new_sale)
    
    # Log del resultado de contabilización (opcional)
    if accounting_result["success"]:
        print(f"Venta {new_sale.invoiceNumber} contabilizada exitosamente")
    else:
        print(f"Error al contabilizar venta {new_sale.invoiceNumber}: {accounting_result['error']}")
    
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

# Endpoints contables
@app.get("/api/accounting/accounts")
async def get_accounts():
    """Obtener catálogo de cuentas"""
    return accounts_db

@app.get("/api/accounting/journal-entries")
async def get_journal_entries(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    source: Optional[str] = None
):
    """Obtener pólizas contables (Libro Diario)"""
    entries = journal_entries_db.copy()
    
    # Filtrar por fecha si se proporciona
    if startDate or endDate:
        filtered_entries = []
        for entry in entries:
            entry_date = entry.date.date()
            
            if startDate:
                start = datetime.strptime(startDate, "%Y-%m-%d").date()
                if entry_date < start:
                    continue
            
            if endDate:
                end = datetime.strptime(endDate, "%Y-%m-%d").date()
                if entry_date > end:
                    continue
            
            filtered_entries.append(entry)
        entries = filtered_entries
    
    # Filtrar por fuente si se proporciona
    if source:
        entries = [e for e in entries if e.source == source]
    
    # Ordenar por fecha descendente
    entries.sort(key=lambda x: x.date, reverse=True)
    
    return entries

@app.get("/api/accounting/ledger")
async def get_ledger():
    """Obtener Libro Mayor (saldos por cuenta)"""
    ledger = {}
    
    # Inicializar saldos por cuenta
    for account in accounts_db:
        ledger[account.id] = {
            "account": account,
            "debit_total": 0.0,
            "credit_total": 0.0,
            "balance": 0.0
        }
    
    # Calcular totales de débitos y créditos
    for line in journal_lines_db:
        if line.journalEntryId in [je.id for je in journal_entries_db if je.status == "posted"]:
            if line.accountId in ledger:
                ledger[line.accountId]["debit_total"] += line.debit
                ledger[line.accountId]["credit_total"] += line.credit
    
    # Calcular saldos
    for account_id, data in ledger.items():
        account = data["account"]
        if account.nature == "deudora":
            data["balance"] = data["debit_total"] - data["credit_total"]
        else:  # acreedora
            data["balance"] = data["credit_total"] - data["debit_total"]
    
    return ledger

@app.get("/api/accounting/inventory-movements")
async def get_inventory_movements(
    productId: Optional[int] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None
):
    """Obtener movimientos de inventario"""
    movements = inventory_movements_db.copy()
    
    # Filtrar por producto
    if productId:
        movements = [m for m in movements if m.productId == productId]
    
    # Filtrar por fecha
    if startDate or endDate:
        filtered_movements = []
        for movement in movements:
            movement_date = movement.createdAt.date()
            
            if startDate:
                start = datetime.strptime(startDate, "%Y-%m-%d").date()
                if movement_date < start:
                    continue
            
            if endDate:
                end = datetime.strptime(endDate, "%Y-%m-%d").date()
                if movement_date > end:
                    continue
            
            filtered_movements.append(movement)
        movements = filtered_movements
    
    # Ordenar por fecha descendente
    movements.sort(key=lambda x: x.createdAt, reverse=True)
    
    return {"movements": movements}

@app.get("/api/accounting/vat/sales")
async def get_vat_sales(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None
):
    """Obtener Libro de Ventas (IVA)"""
    invoices = ar_invoices_db.copy()
    
    # Filtrar por fecha
    if startDate or endDate:
        filtered_invoices = []
        for invoice in invoices:
            invoice_date = invoice.createdAt.date()
            
            if startDate:
                start = datetime.strptime(startDate, "%Y-%m-%d").date()
                if invoice_date < start:
                    continue
            
            if endDate:
                end = datetime.strptime(endDate, "%Y-%m-%d").date()
                if invoice_date > end:
                    continue
            
            filtered_invoices.append(invoice)
        invoices = filtered_invoices
    
    # Ordenar por fecha descendente
    invoices.sort(key=lambda x: x.createdAt, reverse=True)
    
    return invoices

@app.get("/api/accounting/trial-balance")
async def get_trial_balance():
    """Obtener Balance de Comprobación"""
    ledger = await get_ledger()
    
    trial_balance = []
    total_debits = 0.0
    total_credits = 0.0
    
    for account_id, data in ledger.items():
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
        "service": "Super POS API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
