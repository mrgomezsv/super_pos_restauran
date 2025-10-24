"""
Configuración de base de datos SQLite para Super POS
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func

# Configuración de SQLite
DATABASE_URL = "sqlite:///./superpos.db"

# Crear engine
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    echo=False  # Cambiar a True para debug SQL
)

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
    price = Column(Float, nullable=False)
    cost = Column(Float, nullable=False)
    category = Column(String(100), nullable=True)
    brand = Column(String(100), nullable=True)
    stock = Column(Integer, default=0)
    minStock = Column(Integer, default=0)
    maxStock = Column(Integer, default=0)
    barcode = Column(String(50), nullable=True, index=True)
    taxRate = Column(Float, default=15.0)  # Porcentaje de impuesto
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    company = relationship("Company", back_populates="products")
    
    # Restricciones
    __table_args__ = (
        UniqueConstraint('code', 'company_id', name='unique_product_code_per_company'),
        UniqueConstraint('barcode', 'company_id', name='unique_barcode_per_company'),
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
    taxId = Column(String(50), nullable=True)  # NRC/NIT
    email = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    address = Column(Text, nullable=True)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())

    company = relationship("Company", backref="suppliers")
    __table_args__ = (
        UniqueConstraint('name', 'company_id', name='unique_supplier_name_per_company'),
    )

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

# Función para crear todas las tablas
def create_tables():
    """Crear todas las tablas en la base de datos"""
    Base.metadata.create_all(bind=engine)

# Función para obtener sesión de BD (synchronous)
def get_db_session() -> Session:
    """Obtener sesión síncrona para usar en FastAPI"""
    return SessionLocal()
