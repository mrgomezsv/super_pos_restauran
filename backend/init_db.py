"""
Inicialización de base de datos con datos semilla para Super POS
"""

from datetime import datetime
from sqlalchemy.orm import Session
from database import engine, Base, get_db_session
from database import (
    User, Product, ProductCategory, FiscalDocument, Account,
    JournalEntry, JournalLine, InventoryMovement, ArInvoice, ApInvoice
)

def create_tables():
    """Crear todas las tablas"""
    print("Creando tablas...")
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas exitosamente")

def init_users(db: Session):
    """Inicializar usuarios por defecto"""
    print("Inicializando usuarios...")
    
    # Verificar si ya existen usuarios
    if db.query(User).count() > 0:
        print("Los usuarios ya existen, omitiendo...")
        return
    
    users = [
        User(
            id=1,
            username="admin",
            name="Administrador",
            email="admin@superpos.com",
            password="admin123",  # En producción usar hash
            role="admin",
            isActive=True,
            createdAt=datetime.now()
        ),
        User(
            id=2,
            username="cajero1",
            name="Juan Pérez",
            email="juan@superpos.com",
            password="cajero123",
            role="cashier",
            isActive=True,
            createdAt=datetime.now()
        )
    ]
    
    for user in users:
        db.add(user)
    db.commit()
    print(f"Creados {len(users)} usuarios")

def init_categories(db: Session):
    """Inicializar categorías de productos"""
    print("Inicializando categorías...")
    
    if db.query(ProductCategory).count() > 0:
        print("Las categorías ya existen, omitiendo...")
        return
    
    categories = [
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
    
    for category in categories:
        db.add(category)
    db.commit()
    print(f"Creadas {len(categories)} categorías")

def init_fiscal_documents(db: Session):
    """Inicializar documentos fiscales"""
    print("Inicializando documentos fiscales...")
    
    if db.query(FiscalDocument).count() > 0:
        print("Los documentos fiscales ya existen, omitiendo...")
        return
    
    documents = [
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
    
    for document in documents:
        db.add(document)
    db.commit()
    print(f"Creados {len(documents)} documentos fiscales")

def init_accounts(db: Session):
    """Inicializar catálogo de cuentas contables"""
    print("Inicializando cuentas contables...")
    
    if db.query(Account).count() > 0:
        print("Las cuentas contables ya existen, omitiendo...")
        return
    
    accounts = [
        # Activos
        Account(id=1, code="1101", name="Caja", accountType="activo", nature="deudora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Account(id=2, code="1102", name="Bancos", accountType="activo", nature="deudora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Account(id=3, code="1201", name="Cuentas por Cobrar", accountType="activo", nature="deudora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Account(id=4, code="1301", name="Inventarios", accountType="activo", nature="deudora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Pasivos
        Account(id=5, code="2101", name="Cuentas por Pagar", accountType="pasivo", nature="acreedora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Account(id=6, code="2201", name="IVA Crédito Fiscal", accountType="pasivo", nature="acreedora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Patrimonio
        Account(id=7, code="3101", name="Capital Social", accountType="patrimonio", nature="acreedora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Account(id=8, code="3201", name="Utilidades Retenidas", accountType="patrimonio", nature="acreedora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Ingresos
        Account(id=9, code="4101", name="Ventas", accountType="ingreso", nature="acreedora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Account(id=10, code="4201", name="IVA Débito Fiscal", accountType="ingreso", nature="acreedora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Gastos
        Account(id=11, code="5101", name="Costo de Ventas", accountType="gasto", nature="deudora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Account(id=12, code="5201", name="Gastos Operativos", accountType="gasto", nature="deudora", level=2, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    ]
    
    for account in accounts:
        db.add(account)
    db.commit()
    print(f"Creadas {len(accounts)} cuentas contables")

def init_products(db: Session):
    """Inicializar productos de ejemplo"""
    print("Inicializando productos...")
    
    if db.query(Product).count() > 0:
        print("Los productos ya existen, omitiendo...")
        return
    
    products = [
        # Bebidas
        Product(id=1, code="SKU00001", name="Coca Cola 350ml", description="Bebida gaseosa Coca Cola 350ml", price=1.25, cost=0.80, category="Bebidas", brand="Coca Cola", stock=100, minStock=10, maxStock=200, barcode="1234567890123", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=18, code="SKU00018", name="Café Molido 400g", description="Café molido 100% arábica 400 gramos", price=6.50, cost=4.20, category="Bebidas", brand="Café del Valle", stock=55, minStock=10, maxStock=100, barcode="8901234567891", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Panadería
        Product(id=2, code="SKU00002", name="Pan Integral", description="Pan integral 500g", price=2.50, cost=1.80, category="Panadería", brand="Panadería El Sol", stock=50, minStock=5, maxStock=100, barcode="2345678901234", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Lácteos
        Product(id=3, code="SKU00003", name="Leche Entera 1L", description="Leche entera pasteurizada 1 litro", price=3.20, cost=2.50, category="Lácteos", brand="Lácteos del Valle", stock=75, minStock=15, maxStock=150, barcode="3456789012345", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=7, code="SKU00007", name="Huevos Blancos x12", description="Huevos blancos de gallina, cartón de 12 unidades", price=3.50, cost=2.80, category="Lácteos", brand="Granja Santa Rosa", stock=45, minStock=8, maxStock=100, barcode="7890123456789", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=8, code="SKU00008", name="Queso Fresco 1lb", description="Queso fresco elaborado artesanalmente", price=5.25, cost=3.80, category="Lácteos", brand="Quesería El Rancho", stock=30, minStock=5, maxStock=60, barcode="8901234567890", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Cereales
        Product(id=4, code="SKU00004", name="Arroz Blanco 1lb", description="Arroz blanco de primera calidad 1 libra", price=1.50, cost=0.90, category="Cereales", brand="Arrocera Nacional", stock=120, minStock=20, maxStock=200, barcode="4567890123456", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=5, code="SKU00005", name="Frijoles Negros 1lb", description="Frijoles negros de primera calidad", price=1.80, cost=1.20, category="Cereales", brand="Granos del Campo", stock=90, minStock=15, maxStock=150, barcode="5678901234567", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Despensa
        Product(id=6, code="SKU00006", name="Aceite Vegetal 1L", description="Aceite vegetal 100% puro 1 litro", price=4.50, cost=3.20, category="Despensa", brand="Aceites del Sol", stock=60, minStock=10, maxStock=120, barcode="6789012345678", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=15, code="SKU00015", name="Azúcar Blanca 2lb", description="Azúcar blanca refinada bolsa de 2 libras", price=2.10, cost=1.50, category="Despensa", brand="Azucarera Central", stock=85, minStock=15, maxStock=160, barcode="5678901234568", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=16, code="SKU00016", name="Sal de Mesa 1lb", description="Sal de mesa yodada y fluorada", price=0.65, cost=0.35, category="Despensa", brand="Sal Marina", stock=110, minStock=20, maxStock=200, barcode="6789012345679", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=17, code="SKU00017", name="Pasta Espagueti 1lb", description="Pasta espagueti de sémola de trigo", price=1.45, cost=0.90, category="Despensa", brand="Pastas La Italiana", stock=75, minStock=12, maxStock=140, barcode="7890123456780", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Carnes
        Product(id=9, code="SKU00009", name="Pollo Entero Fresco", description="Pollo entero fresco, aproximadamente 3-4 lbs", price=8.50, cost=6.00, category="Carnes", brand="Avícola San Miguel", stock=25, minStock=5, maxStock=50, barcode="9012345678901", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=10, code="SKU00010", name="Carne Molida 1lb", description="Carne de res molida 80/20", price=6.75, cost=4.50, category="Carnes", brand="Carnes Premium", stock=40, minStock=8, maxStock=80, barcode="0123456789012", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Frutas y Verduras
        Product(id=11, code="SKU00011", name="Tomate Fresco 1lb", description="Tomates frescos de la región", price=1.25, cost=0.70, category="Frutas y Verduras", brand="Huerta Fresca", stock=80, minStock=15, maxStock=150, barcode="1234567890124", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=12, code="SKU00012", name="Cebolla Blanca 1lb", description="Cebolla blanca fresca", price=0.95, cost=0.50, category="Frutas y Verduras", brand="Huerta Fresca", stock=100, minStock=20, maxStock=180, barcode="2345678901235", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=13, code="SKU00013", name="Plátano Verde 1lb", description="Plátanos verdes para cocinar", price=0.75, cost=0.40, category="Frutas y Verduras", brand="Frutales del Trópico", stock=95, minStock=20, maxStock=170, barcode="3456789012346", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=14, code="SKU00014", name="Papas 2lb", description="Papas frescas bolsa de 2 libras", price=2.25, cost=1.40, category="Frutas y Verduras", brand="Huerta Fresca", stock=70, minStock=12, maxStock=140, barcode="4567890123457", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Cuidado Personal
        Product(id=19, code="SKU00019", name="Jabón de Baño 3pack", description="Jabón de tocador pack de 3 unidades", price=2.75, cost=1.80, category="Cuidado Personal", brand="Jabones Premium", stock=65, minStock=12, maxStock=130, barcode="9012345678902", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=20, code="SKU00020", name="Pasta Dental 100ml", description="Pasta dental con flúor 100ml", price=3.25, cost=2.10, category="Cuidado Personal", brand="Sonrisa Blanca", stock=80, minStock=15, maxStock=150, barcode="0123456789013", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=21, code="SKU00021", name="Champú 400ml", description="Champú para todo tipo de cabello", price=5.50, cost=3.50, category="Cuidado Personal", brand="Cabello Sano", stock=48, minStock=10, maxStock=90, barcode="1234567890125", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Limpieza
        Product(id=22, code="SKU00022", name="Papel Higiénico 4 rollos", description="Papel higiénico doble hoja pack de 4 rollos", price=3.80, cost=2.50, category="Limpieza", brand="Suave Plus", stock=95, minStock=18, maxStock=180, barcode="2345678901236", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=23, code="SKU00023", name="Detergente en Polvo 1kg", description="Detergente en polvo para ropa 1 kilogramo", price=4.95, cost=3.20, category="Limpieza", brand="Limpio Total", stock=52, minStock=10, maxStock=100, barcode="3456789012347", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        Product(id=24, code="SKU00024", name="Cloro 1L", description="Cloro desinfectante 1 litro", price=2.25, cost=1.40, category="Limpieza", brand="Desinfect Max", stock=68, minStock=12, maxStock=130, barcode="4567890123458", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
        
        # Snacks
        Product(id=25, code="SKU00025", name="Galletas de Chocolate 300g", description="Galletas con chispas de chocolate 300 gramos", price=3.15, cost=2.00, category="Snacks", brand="Dulce Momento", stock=72, minStock=14, maxStock=140, barcode="5678901234569", taxRate=15, isActive=True, createdAt=datetime.now(), updatedAt=datetime.now()),
    ]
    
    for product in products:
        db.add(product)
    db.commit()
    print(f"Creados {len(products)} productos")

def initialize_database():
    """Función principal para inicializar toda la base de datos"""
    print("=== Inicializando base de datos Super POS ===")
    
    # Crear tablas
    create_tables()
    
    # Obtener sesión de BD
    db = get_db_session()
    
    try:
        # Inicializar datos semilla
        init_users(db)
        init_categories(db)
        init_fiscal_documents(db)
        init_accounts(db)
        init_products(db)
        
        print("=== Base de datos inicializada exitosamente ===")
        
    except Exception as e:
        print(f"Error inicializando base de datos: {e}")
        db.rollback()
        raise e
    
    finally:
        db.close()

if __name__ == "__main__":
    initialize_database()
