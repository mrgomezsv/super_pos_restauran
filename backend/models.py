"""
Modelos de datos para el sistema Super POS
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# Modelos base
class Company(BaseModel):
    """Modelo para empresas cliente (multi-tenant)"""
    id: int
    nombre: str
    razonSocial: str
    nit: str
    dui: Optional[str] = None
    telefono: Optional[str] = None
    email: str
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    pais: str = "El Salvador"
    tipoEmpresa: str  # retail, manufacturing, services, restaurant, other
    estado: str = "activa"  # activa, inactiva, suspendida
    fechaRegistro: datetime
    contactoPrincipal: Optional[str] = None
    limiteCredito: float = 0.0
    saldoActual: float = 0.0
    adminUserId: Optional[int] = None
    subscriptionPlan: str = "basic"  # basic, premium, enterprise
    maxUsers: int = 5
    maxProducts: int = 1000
    maxSalesPerMonth: int = 500
    databaseSchema: Optional[str] = None
    isActive: bool = True
    createdAt: datetime
    updatedAt: datetime

class User(BaseModel):
    id: int
    company_id: Optional[int] = None  # Nullable para usuarios SUDO
    username: str
    name: str
    email: str
    password: str
    role: str  # sudo, admin, manager, cashier
    isActive: bool
    createdAt: datetime
    lastLogin: Optional[datetime] = None

class Product(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    description: Optional[str] = None
    price: float
    cost: float
    category: str
    brand: Optional[str] = None
    stock: int
    minStock: int
    maxStock: int
    barcode: Optional[str] = None
    taxRate: float  # Porcentaje de impuesto
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class ProductCategory(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str] = None
    isActive: bool

class FiscalDocument(BaseModel):
    id: int
    company_id: int
    code: str  # Código interno único
    name: str  # Nombre del documento (ej: "Consumidor Final", "Crédito Fiscal")
    description: Optional[str] = None
    prefix: str  # Prefijo para la numeración (ej: "CF", "CCF")
    initialCorrelative: int  # Correlativo inicial
    currentCorrelative: int  # Correlativo actual
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class CartItem(BaseModel):
    productId: int
    productName: str
    quantity: int
    unitPrice: float
    subtotal: float
    tax: float
    total: float

class Sale(BaseModel):
    id: int
    company_id: int
    invoiceNumber: str
    customerName: Optional[str] = None
    customerDocument: Optional[str] = None
    customerEmail: Optional[str] = None
    invoiceType: str  # consumidor_final, credito_fiscal
    items: List[CartItem]
    subtotal: float
    taxAmount: float
    discountAmount: float
    total: float
    paymentMethod: str  # cash, card, transfer
    paymentAmount: float
    change: float
    cashierId: int
    cashierName: str
    createdAt: datetime
    status: str  # completed, cancelled, refunded

# Modelos contables
class Account(BaseModel):
    id: int
    company_id: int
    code: str  # Código de cuenta (ej: "1101", "4101")
    name: str
    accountType: str  # activo, pasivo, patrimonio, ingreso, gasto
    nature: str  # deudora, acreedora
    level: int  # Nivel jerárquico (1-5)
    parentId: Optional[int] = None
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class JournalEntry(BaseModel):
    id: int
    company_id: int
    entryNumber: str  # Número de póliza
    date: datetime
    source: str  # pos, purchase, payment, adjustment
    reference: str  # Referencia externa (ej: número de venta)
    description: str
    currency: str = "USD"
    status: str = "draft"  # draft, posted, reversed
    createdBy: int  # ID del usuario
    postedBy: Optional[int] = None
    postedAt: Optional[datetime] = None
    createdAt: datetime
    lines: List['JournalLine'] = []

class JournalLine(BaseModel):
    id: int
    journalEntryId: int
    accountId: int
    description: str
    debit: float = 0.0
    credit: float = 0.0
    costCenter: Optional[str] = None
    createdAt: datetime

class InventoryMovement(BaseModel):
    id: int
    company_id: int
    productId: int
    movementType: str  # entrada, salida
    quantity: int
    unitCost: float
    totalCost: float
    reference: str  # Referencia a póliza o documento
    referenceId: Optional[int] = None
    createdAt: datetime

class ArInvoice(BaseModel):  # Accounts Receivable Invoice
    id: int
    company_id: int
    invoiceNumber: str
    customerName: str
    customerDui: Optional[str] = None
    subtotal: float
    taxAmount: float
    total: float
    invoiceType: str
    controlNumber: Optional[str] = None
    journalEntryId: Optional[int] = None
    createdAt: datetime

class ApInvoice(BaseModel):  # Accounts Payable Invoice
    id: int
    company_id: int
    invoiceNumber: str
    supplierName: str
    supplierNrc: Optional[str] = None
    subtotal: float
    taxAmount: float
    total: float
    invoiceType: str
    controlNumber: Optional[str] = None
    journalEntryId: Optional[int] = None
    createdAt: datetime

# Los esquemas de respuesta están definidos en schemas.py
