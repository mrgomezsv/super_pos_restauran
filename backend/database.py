"""
Configuración de base de datos SQLite para Super POS
"""

import os
from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
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

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False)  # En producción usar hash
    role = Column(String(20), nullable=False)  # admin, manager, cashier
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    lastLogin = Column(DateTime, nullable=True)

class ProductCategory(Base):
    __tablename__ = "product_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    isActive = Column(Boolean, default=True)

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
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

class FiscalDocument(Base):
    __tablename__ = "fiscal_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    prefix = Column(String(10), nullable=False)
    initialCorrelative = Column(Integer, default=1)
    currentCorrelative = Column(Integer, default=1)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    invoiceNumber = Column(String(50), unique=True, nullable=False)
    customerName = Column(String(200), nullable=True)
    customerDocument = Column(String(50), nullable=True)
    customerEmail = Column(String(100), nullable=True)
    invoiceType = Column(String(20), nullable=False)  # consumidor_final, credito_fiscal
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
    cashier = relationship("User", backref="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")

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
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    accountType = Column(String(20), nullable=False)  # activo, pasivo, patrimonio, ingreso, gasto
    nature = Column(String(20), nullable=False)  # deudora, acreedora
    level = Column(Integer, nullable=False)
    parentId = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    isActive = Column(Boolean, default=True)
    createdAt = Column(DateTime, default=func.now())
    updatedAt = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relaciones
    parent = relationship("Account", remote_side=[id], backref="children")

class JournalEntry(Base):
    __tablename__ = "journal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    entryNumber = Column(String(20), unique=True, nullable=False)
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
    creator = relationship("User", foreign_keys=[createdBy], backref="created_entries")
    poster = relationship("User", foreign_keys=[postedBy], backref="posted_entries")
    lines = relationship("JournalLine", back_populates="journal_entry", cascade="all, delete-orphan")

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
    productId = Column(Integer, ForeignKey("products.id"))
    movementType = Column(String(20), nullable=False)  # entrada, salida
    quantity = Column(Integer, nullable=False)
    unitCost = Column(Float, nullable=False)
    totalCost = Column(Float, nullable=False)
    reference = Column(String(100), nullable=False)
    referenceId = Column(Integer, nullable=True)
    createdAt = Column(DateTime, default=func.now())
    
    # Relaciones
    product = relationship("Product", backref="inventory_movements")

class ArInvoice(Base):
    __tablename__ = "ar_invoices"
    
    id = Column(Integer, primary_key=True, index=True)
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
    journal_entry = relationship("JournalEntry", backref="ar_invoices")

class ApInvoice(Base):
    __tablename__ = "ap_invoices"
    
    id = Column(Integer, primary_key=True, index=True)
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
    journal_entry = relationship("JournalEntry", backref="ap_invoices")

# Función para crear todas las tablas
def create_tables():
    """Crear todas las tablas en la base de datos"""
    Base.metadata.create_all(bind=engine)

# Función para obtener sesión de BD (synchronous)
def get_db_session() -> Session:
    """Obtener sesión síncrona para usar en FastAPI"""
    return SessionLocal()
