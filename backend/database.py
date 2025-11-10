"""
Configuración de base de datos para Super POS
Soporta SQLite (desarrollo) y PostgreSQL (producción)
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, UniqueConstraint, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func

# Importar configuración
from config import settings

# Detectar tipo de base de datos desde DATABASE_URL
DATABASE_URL = settings.database_url
is_postgresql = DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://")

# Crear engine según el tipo de base de datos
if is_postgresql:
    # Configuración para PostgreSQL (producción)
    engine = create_engine(
        DATABASE_URL,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_pre_ping=True,  # Verificar conexiones antes de usar
        pool_recycle=3600,  # Reciclar conexiones después de 1 hora
        echo=settings.debug
    )
    print(f"✓ Conectado a PostgreSQL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'configurado'}")
else:
    # Configuración para SQLite (desarrollo)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=settings.debug
    )
    print(f"✓ Conectado a SQLite: {DATABASE_URL}")

# Crear sesión
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para los modelos
Base = declarative_base()

# Dependency para obtener sesión de BD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Modelos de base de datos (equivalentes a los modelos Pydantic)

class Company(Base):
    """Modelo para empresas cliente (multi-tenant)"""
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(200), nullable=False)
    razonSocial = Column(String(200), nullable=False)
    nit = Column(String(50), unique=True, nullable=False, index=True)
    dui = Column(String(20), nullable=True)
    telefono = Column(String(20), nullable=True)
    email = Column(String(100), nullable=False)
    direccion = Column(Text, nullable=True)
    ciudad = Column(String(100), nullable=True)
    pais = Column(String(50), default="El Salvador")
    tipoEmpresa = Column(String(50), nullable=False)  # retail, manufacturing, services, restaurant, other
    estado = Column(String(20), default="activa")  # activa, inactiva, suspendida
    fechaRegistro = Column(DateTime, default=func.now())
    contactoPrincipal = Column(String(200), nullable=True)
    limiteCredito = Column(Float, default=0.0)
    saldoActual = Column(Float, default=0.0)
    
    # Usuario administrador de la compañía
    adminUserId = Column(Integer, nullable=True)  # Se asignará después de crear el usuario
    
    # Configuración de suscripción
    subscriptionPlan = Column(String(50), default="basic")  # basic, premium, enterprise
    maxUsers = Column(Integer, default=5)
    maxProducts = Column(Integer, default=1000)
    maxSalesPerMonth = Column(Integer, default=500)
    
    # Configuración técnica
    databaseSchema = Column(String(100), nullable=True)  # Para futuro uso con schemas separados
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    users = relationship("User", back_populates="company", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="company", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="company", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)  # Nullable para usuarios SUDO
    username = Column(String(50), index=True, nullable=False)  # Removido unique para permitir mismo username en diferentes compañías
    name = Column(String(100), nullable=False)
    email = Column(String(100), index=True, nullable=False)  # Removido unique para permitir mismo email en diferentes compañías
    password = Column(String(100), nullable=False)  # En producción usar hash
    role = Column(String(20), nullable=False)  # sudo, admin, manager, cashier
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    lastLogin = Column(DateTime, nullable=True)
    
    # Relaciones
    company = relationship("Company", back_populates="users")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('username', 'company_id', name='unique_username_per_company'),
        UniqueConstraint('email', 'company_id', name='unique_email_per_company'),
    )

class ProductCategory(Base):
    __tablename__ = "product_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    isActive = Column(Boolean, default=True)
    
    # Relaciones
    company = relationship("Company", backref="product_categories")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('name', 'company_id', name='unique_category_name_per_company'),
    )

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(20), index=True, nullable=False)  # Removido unique para permitir mismo código en diferentes compañías
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False, default=0.0)
    cost = Column(Float, nullable=False)
    category = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    stock = Column(Integer, default=0)
    minStock = Column(Integer, default=0)
    maxStock = Column(Integer, default=0)
    barcode = Column(String(50), nullable=True, index=True)
    taxRate = Column(Float, default=15.0)  # Porcentaje de impuesto
    isActive = Column(Boolean, default=True)
    productType = Column(String(20), nullable=False, default="final")  # ingredient, preparation, final
    unitOfMeasure = Column(String(20), nullable=False, default="unidad")
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    company = relationship("Company", back_populates="products")
    recipes = relationship("Recipe", back_populates="product", foreign_keys="[Recipe.product_id]")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('code', 'company_id', name='unique_product_code_per_company'),
        UniqueConstraint('barcode', 'company_id', name='unique_barcode_per_company'),
    )


def ensure_database_schema() -> None:
    """
    Garantiza que la estructura de la base de datos esté actualizada con los
    campos más recientes sin requerir migraciones manuales.
    """
    if is_postgresql:
        # En PostgreSQL se asume que existe un sistema de migraciones externo,
        # por lo que no se realizan alteraciones automáticas.
        return

    with engine.begin() as connection:
        product_columns = {
            row._mapping["name"] for row in connection.execute(text("PRAGMA table_info(products)"))
        }

        if "productType" not in product_columns:
            connection.execute(
                text("ALTER TABLE products ADD COLUMN productType VARCHAR(20) NOT NULL DEFAULT 'final'")
            )

        if "unitOfMeasure" not in product_columns:
            connection.execute(
                text("ALTER TABLE products ADD COLUMN unitOfMeasure VARCHAR(20) NOT NULL DEFAULT 'unidad'")
            )

        # Normalizar datos existentes para cumplir con el nuevo modelo de ingredientes
        connection.execute(
            text("UPDATE products SET productType = 'ingredient' WHERE productType IS NULL OR productType = ''")
        )
        connection.execute(
            text("UPDATE products SET unitOfMeasure = 'unidad' WHERE unitOfMeasure IS NULL OR unitOfMeasure = ''")
        )
        connection.execute(
            text("UPDATE products SET category = 'Ingredientes' WHERE category IS NULL OR category = ''")
        )

class FiscalDocument(Base):
    __tablename__ = "fiscal_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(50), nullable=False)  # Removido unique para permitir mismo código en diferentes compañías
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    prefix = Column(String(10), nullable=False)
    initialCorrelative = Column(Integer, default=1)
    currentCorrelative = Column(Integer, default=1)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    company = relationship("Company", backref="fiscal_documents")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('code', 'company_id', name='unique_fiscal_doc_code_per_company'),
    )

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    invoiceNumber = Column(String(50), nullable=False)  # Removido unique para permitir mismo número en diferentes compañías
    customerName = Column(String(200), nullable=True)
    customerDocument = Column(String(50), nullable=True)
    customerEmail = Column(String(100), nullable=True)
    invoiceType = Column(String(20), nullable=False)  # Código del documento fiscal (CF, CCF, NC, ND, NR, CR, CL, FE, FSE, CD)
    subtotal = Column(Float, nullable=False)
    taxAmount = Column(Float, nullable=False)
    discountAmount = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    paymentMethod = Column(String(20), nullable=False)  # cash, card, transfer, bitcoin
    paymentAmount = Column(Float, nullable=False)
    change = Column(Float, default=0.0)
    cashierId = Column(Integer, ForeignKey("users.id"))
    cashierName = Column(String(100), nullable=False)
    createdAt = Column(DateTime, default=func.now())
    status = Column(String(20), default="completed")  # completed, cancelled, refunded
    
    # Relaciones
    company = relationship("Company", back_populates="sales")
    cashier = relationship("User", backref="sales_as_cashier")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('invoiceNumber', 'company_id', name='unique_invoice_number_per_company'),
    )

class SaleItem(Base):
    __tablename__ = "sale_items"
    
    id = Column(Integer, primary_key=True, index=True)
    saleId = Column(Integer, ForeignKey("sales.id"))
    productId = Column(Integer, ForeignKey("products.id"))
    productName = Column(String(200), nullable=False)
    quantity = Column(Integer, nullable=False)
    unitPrice = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    
    # Relaciones
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", backref="sale_items")

# Modelos contables
class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    code = Column(String(20), nullable=False)  # Removido unique para permitir mismo código en diferentes compañías
    name = Column(String(200), nullable=False)
    accountType = Column(String(20), nullable=False)  # activo, pasivo, patrimonio, ingreso, gasto
    nature = Column(String(20), nullable=False)  # deudora, acreedora
    level = Column(Integer, nullable=False)
    parentId = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    company = relationship("Company", backref="accounts")
    parent = relationship("Account", remote_side=[id], backref="children")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('code', 'company_id', name='unique_account_code_per_company'),
    )

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    entryNumber = Column(String(20), nullable=False)  # Removido unique para permitir mismo número en diferentes compañías
    date = Column(DateTime, default=func.now())
    source = Column(String(20), nullable=False)  # pos, purchase, payment, adjustment
    reference = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(String(20), default="draft")  # draft, posted, reversed
    createdBy = Column(Integer, ForeignKey("users.id"))
    postedBy = Column(Integer, ForeignKey("users.id"), nullable=True)
    postedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    company = relationship("Company", backref="journal_entries")
    creator = relationship("User", foreign_keys=[createdBy], backref="created_entries")
    poster = relationship("User", foreign_keys=[postedBy], backref="posted_entries")
    lines = relationship("JournalLine", back_populates="journal_entry", cascade="all, delete-orphan")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('entryNumber', 'company_id', name='unique_entry_number_per_company'),
    )

class JournalLine(Base):
    __tablename__ = "journal_lines"
    
    id = Column(Integer, primary_key=True, index=True)
    journalEntryId = Column(Integer, ForeignKey("journal_entries.id"))
    accountId = Column(Integer, ForeignKey("accounts.id"))
    description = Column(Text, nullable=False)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    costCenter = Column(String(50), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    journal_entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("Account", backref="journal_lines")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    productId = Column(Integer, ForeignKey("products.id"))
    movementType = Column(String(20), nullable=False)  # entrada, salida
    quantity = Column(Integer, nullable=False)
    unitCost = Column(Float, nullable=False)
    totalCost = Column(Float, nullable=False)
    reference = Column(String(100), nullable=False)
    referenceId = Column(Integer, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    company = relationship("Company", backref="inventory_movements")
    product = relationship("Product", backref="inventory_movements")

class ArInvoice(Base):
    __tablename__ = "ar_invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    invoiceNumber = Column(String(50), nullable=False)
    customerName = Column(String(200), nullable=False)
    customerDui = Column(String(50), nullable=True)
    subtotal = Column(Float, nullable=False)
    taxAmount = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    invoiceType = Column(String(20), nullable=False)
    controlNumber = Column(String(100), nullable=True)
    journalEntryId = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    company = relationship("Company", backref="ar_invoices")
    journal_entry = relationship("JournalEntry", backref="ar_invoices")

class ApInvoice(Base):
    __tablename__ = "ap_invoices"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    invoiceNumber = Column(String(50), nullable=False)
    supplierName = Column(String(200), nullable=False)
    supplierNrc = Column(String(50), nullable=True)
    subtotal = Column(Float, nullable=False)
    taxAmount = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    invoiceType = Column(String(20), nullable=False)
    controlNumber = Column(String(100), nullable=True)
    journalEntryId = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    company = relationship("Company", backref="ap_invoices")
    journal_entry = relationship("JournalEntry", backref="ap_invoices")

# Proveedores
class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    nit = Column(String(50), nullable=True)  # NIT separado
    nrc = Column(String(50), nullable=True)  # NRC separado
    email = Column(String(120), nullable=True)  # Email principal
    email2 = Column(String(120), nullable=True)  # Email secundario
    email3 = Column(String(120), nullable=True)  # Email adicional
    phone = Column(String(30), nullable=True)  # Teléfono principal
    phone2 = Column(String(30), nullable=True)  # Teléfono secundario
    phone3 = Column(String(30), nullable=True)  # Teléfono adicional
    address = Column(Text, nullable=True)  # Dirección completa
    contact_person = Column(String(200), nullable=True)  # Vendedor o Contacto
    business_activity = Column(String(200), nullable=True)  # Giro o actividad económica
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())

    company = relationship("Company", backref="suppliers")
    __table_args__ = (
        UniqueConstraint('name', 'company_id', name='unique_supplier_name_per_company'),
    )

# Órdenes de Compra
class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    po_number = Column(String(50), nullable=False, index=True)  # OC-001
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    order_date = Column(DateTime, nullable=False, default=func.now())
    expected_delivery_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="pending", index=True)  # pending, approved, received, cancelled
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    company = relationship("Company", backref="purchase_orders")
    supplier = relationship("Supplier", backref="purchase_orders")
    creator = relationship("User", foreign_keys=[created_by], backref="created_purchase_orders")
    approver = relationship("User", foreign_keys=[approved_by], backref="approved_purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    goods_receipts = relationship("GoodsReceipt", back_populates="purchase_order")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('po_number', 'company_id', name='unique_po_number_per_company'),
    )

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    
    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)  # Null si producto nuevo
    product_name = Column(String(200), nullable=False)
    product_sku = Column(String(20), nullable=True)  # SKU si existe o se generará
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    tax_rate = Column(Float, default=15.0)
    subtotal = Column(Float, nullable=False)
    tax_amount = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    received_quantity = Column(Integer, default=0)  # Cantidad recibida acumulada
    
    # Relaciones
    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", backref="purchase_order_items")

# Recepciones de Mercancía
class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True)
    receipt_number = Column(String(50), nullable=False, index=True)  # GR-001
    receipt_date = Column(DateTime, nullable=False, default=func.now())
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False, index=True)
    received_by = Column(Integer, ForeignKey("users.id"))
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    is_accounted = Column(Boolean, default=False)  # Si ya fue contabilizado
    journal_entry_id = Column(Integer, ForeignKey("journal_entries.id"), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    company = relationship("Company", backref="goods_receipts")
    purchase_order = relationship("PurchaseOrder", back_populates="goods_receipts")
    supplier = relationship("Supplier", backref="goods_receipts")
    receiver = relationship("User", backref="goods_receipts")
    journal_entry = relationship("JournalEntry", backref="goods_receipts")
    items = relationship("GoodsReceiptItem", back_populates="goods_receipt", cascade="all, delete-orphan")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('receipt_number', 'company_id', name='unique_receipt_number_per_company'),
    )

class GoodsReceiptItem(Base):
    __tablename__ = "goods_receipt_items"
    
    id = Column(Integer, primary_key=True, index=True)
    goods_receipt_id = Column(Integer, ForeignKey("goods_receipts.id"), nullable=False, index=True)
    purchase_order_item_id = Column(Integer, ForeignKey("purchase_order_items.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    
    # Relaciones
    goods_receipt = relationship("GoodsReceipt", back_populates="items")
    purchase_order_item = relationship("PurchaseOrderItem", backref="goods_receipt_items")
    product = relationship("Product", backref="goods_receipt_items")

# Descuentos
class Discount(Base):
    __tablename__ = "discounts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    percent = Column(Float, nullable=False)  # 0..100
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())

    company = relationship("Company", backref="discounts")
    __table_args__ = (
        UniqueConstraint('name', 'company_id', name='unique_discount_name_per_company'),
    )

# Sesiones de Caja
class CashSession(Base):
    __tablename__ = "cash_sessions"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    userId = Column(Integer, ForeignKey("users.id"))
    openedAt = Column(DateTime, default=func.now())
    closedAt = Column(DateTime, nullable=True)
    openingAmount = Column(Float, default=0.0)
    closingAmount = Column(Float, nullable=True)
    status = Column(String(20), default="open")  # open/closed

    company = relationship("Company", backref="cash_sessions")
    user = relationship("User", backref="cash_sessions")

# Bitácora
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"))
    action = Column(String(50), nullable=False)
    module = Column(String(50), nullable=False)
    detail = Column(Text, nullable=True)
    createdAt = Column(DateTime, default=func.now())

    company = relationship("Company", backref="audit_logs")
    user = relationship("User", backref="audit_logs")

# Recetas y Producción
class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)  # Producto final que se produce
    code = Column(String(50), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    batch_size = Column(Float, nullable=False, default=1.0)  # Cantidad de unidades que produce la receta
    unit_of_measure = Column(String(20), default="unidades")  # unidad, kg, litro, etc.
    preparation_time = Column(Integer, default=0)  # Tiempo en minutos
    cost_per_batch = Column(Float, default=0.0)  # Costo calculado por lote
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    company = relationship("Company", backref="recipes")
    product = relationship("Product", back_populates="recipes", foreign_keys=[product_id])
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    production_orders = relationship("ProductionOrder", back_populates="recipe")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('code', 'company_id', name='unique_recipe_code_per_company'),
        UniqueConstraint('product_id', 'company_id', name='unique_recipe_product_per_company'),  # Un producto solo puede tener una receta
    )

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    
    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False, index=True)
    ingredient_product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Float, nullable=False)  # Cantidad necesaria por lote
    unit_of_measure = Column(String(20), nullable=False)  # unidad, kg, litro, gramos, ml, etc.
    unit_cost = Column(Float, default=0.0)  # Costo unitario del ingrediente (referencia)
    total_cost = Column(Float, default=0.0)  # Costo total = quantity * unit_cost
    notes = Column(Text, nullable=True)
    
    # Relaciones
    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient_product = relationship("Product", foreign_keys=[ingredient_product_id], backref="ingredients_in")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('recipe_id', 'ingredient_product_id', name='unique_ingredient_per_recipe'),  # Un ingrediente solo una vez por receta
    )

class ProductionOrder(Base):
    __tablename__ = "production_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id"), nullable=False, index=True)
    production_number = Column(String(50), nullable=False, index=True)  # PROD-001
    production_date = Column(DateTime, nullable=False, default=func.now())
    quantity_to_produce = Column(Float, nullable=False)  # Cantidad a producir
    quantity_produced = Column(Float, default=0.0)  # Cantidad real producida
    unit_of_measure = Column(String(20), nullable=False)
    status = Column(String(20), default="planned", index=True)  # planned, in_progress, completed, cancelled
    planned_start_date = Column(DateTime, nullable=True)
    planned_end_date = Column(DateTime, nullable=True)
    actual_start_date = Column(DateTime, nullable=True)
    actual_end_date = Column(DateTime, nullable=True)
    cost_per_unit = Column(Float, default=0.0)  # Costo por unidad producida
    total_cost = Column(Float, default=0.0)  # Costo total de la producción
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    completed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    company = relationship("Company", backref="production_orders")
    recipe = relationship("Recipe", back_populates="production_orders")
    creator = relationship("User", foreign_keys=[created_by], backref="created_production_orders")
    completer = relationship("User", foreign_keys=[completed_by], backref="completed_production_orders")
    consumption_items = relationship("ProductionConsumption", back_populates="production_order", cascade="all, delete-orphan")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('production_number', 'company_id', name='unique_production_number_per_company'),
    )

class ProductionConsumption(Base):
    __tablename__ = "production_consumptions"
    
    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id"), nullable=False, index=True)
    ingredient_product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity_required = Column(Float, nullable=False)  # Cantidad requerida según la receta
    quantity_consumed = Column(Float, nullable=False)  # Cantidad real consumida
    unit_of_measure = Column(String(20), nullable=False)
    unit_cost = Column(Float, nullable=False)  # Costo unitario al momento del consumo
    total_cost = Column(Float, nullable=False)  # Costo total del ingrediente consumido
    
    # Relaciones
    production_order = relationship("ProductionOrder", back_populates="consumption_items")
    ingredient_product = relationship("Product", backref="production_consumptions")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('production_order_id', 'ingredient_product_id', name='unique_consumption_item_per_order'),
    )

# Función para crear todas las tablas
def create_tables():
    """Crear todas las tablas en la base de datos"""
    Base.metadata.create_all(bind=engine)

# Función para obtener sesión de BD (synchronous)
def get_db_session() -> Session:
    """Obtener sesión síncrona para usar en FastAPI"""
    return SessionLocal()
