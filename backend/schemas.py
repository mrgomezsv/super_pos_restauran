"""
Esquemas de validación para el sistema Super POS
"""

from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr

# Esquemas de usuario
class UserResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    username: str
    name: str
    email: str
    role: str
    isActive: bool
    createdAt: datetime
    lastLogin: Optional[datetime] = None

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(..., pattern="^(admin|manager|cashier)$")
    isActive: bool = True

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, max_length=100)
    role: Optional[str] = Field(None, pattern="^(admin|manager|cashier)$")
    isActive: Optional[bool] = None

# Esquemas de autenticación
class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6, max_length=100)

class LoginResponse(BaseModel):
    token: str
    user: UserResponse
    expiresIn: int

# Esquemas de producto
class ProductResponse(BaseModel):
    id: int
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
    taxRate: float
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class ProductCreate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)  # Opcional, se genera automáticamente
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    price: float = Field(..., gt=0)
    cost: float = Field(0, ge=0)
    category: str = Field(..., min_length=2, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    stock: int = Field(..., ge=0)
    minStock: int = Field(..., ge=0)
    maxStock: Optional[int] = Field(None, ge=0)
    barcode: Optional[str] = Field(None, max_length=50)
    taxRate: float = Field(15.0, ge=0, le=100)
    isActive: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    price: Optional[float] = Field(None, gt=0)
    cost: Optional[float] = Field(None, ge=0)
    category: Optional[str] = Field(None, min_length=2, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    stock: Optional[int] = Field(None, ge=0)
    minStock: Optional[int] = Field(None, ge=0)
    maxStock: Optional[int] = Field(None, ge=0)
    barcode: Optional[str] = Field(None, max_length=50)
    taxRate: Optional[float] = Field(None, ge=0, le=100)
    isActive: Optional[bool] = None

# Esquemas de categoría
class ProductCategory(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    isActive: bool

class ProductCategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    isActive: bool = True

class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    isActive: Optional[bool] = None

# Accounting Schemas
class JournalLineResponse(BaseModel):
    id: int
    journalEntryId: int
    accountCode: str
    accountName: str
    description: Optional[str] = None
    debit: float
    credit: float

class JournalEntryResponse(BaseModel):
    id: int
    company_id: int
    entryNumber: int
    date: datetime
    description: str
    reference: Optional[str] = None
    totalDebit: float
    totalCredit: float
    createdAt: datetime
    lines: List[JournalLineResponse] = []

class JournalEntryDetailResponse(BaseModel):
    id: int
    company_id: int
    entryNumber: int
    date: datetime
    description: str
    reference: Optional[str] = None
    totalDebit: float
    totalCredit: float
    createdAt: datetime
    lines: List[JournalLineResponse]

class JournalLineCreate(BaseModel):
    accountCode: str
    accountName: str
    description: Optional[str] = None
    debit: float = 0.0
    credit: float = 0.0

class JournalEntryCreate(BaseModel):
    date: datetime
    description: str
    reference: Optional[str] = None
    lines: List[JournalLineCreate]

# Ledger Schemas
class LedgerMovementResponse(BaseModel):
    date: datetime
    entryNumber: int
    description: str
    debit: float
    credit: float

class LedgerEntryResponse(BaseModel):
    accountCode: str
    accountName: str
    movements: List[LedgerMovementResponse]
    totalDebit: float
    totalCredit: float
    balance: float

class LedgerAccountDetailResponse(BaseModel):
    accountCode: str
    accountName: str
    movements: List[LedgerMovementResponse]
    totalDebit: float
    totalCredit: float
    balance: float

# Trial Balance Schemas
class TrialBalanceAccountResponse(BaseModel):
    accountCode: str
    accountName: str
    totalDebit: float
    totalCredit: float
    balance: float

class TrialBalanceResponse(BaseModel):
    asOfDate: date
    assets: List[TrialBalanceAccountResponse]
    liabilities: List[TrialBalanceAccountResponse]
    equity: List[TrialBalanceAccountResponse]
    totalAssetsDebit: float
    totalAssetsCredit: float
    totalAssetsBalance: float
    totalLiabilitiesDebit: float
    totalLiabilitiesCredit: float
    totalLiabilitiesBalance: float
    totalEquityDebit: float
    totalEquityCredit: float
    totalEquityBalance: float
    totalDebits: float
    totalCredits: float
    isBalanced: bool

# Reports Schemas
class DailySalesResponse(BaseModel):
    date: str
    salesCount: int
    totalAmount: float

class UserSalesResponse(BaseModel):
    userId: int
    salesCount: int
    totalAmount: float

class SalesSummaryReportResponse(BaseModel):
    periodStart: date
    periodEnd: date
    totalSales: int
    totalAmount: float
    totalTax: float
    totalDiscount: float
    averageSaleAmount: float
    dailySales: List[DailySalesResponse]
    userSales: List[UserSalesResponse]

class InventoryProductResponse(BaseModel):
    id: int
    name: str
    code: str
    stock: int
    price: float
    value: float
    category: str

class InventoryStatusReportResponse(BaseModel):
    totalProducts: int
    totalValue: float
    lowStockThreshold: int
    lowStockProducts: List[InventoryProductResponse]
    outOfStockProducts: List[InventoryProductResponse]
    normalStockProducts: List[InventoryProductResponse]
    lowStockCount: int
    outOfStockCount: int
    normalStockCount: int

class SalesMetricsResponse(BaseModel):
    totalAmount: float
    totalTax: float
    totalDiscount: float
    salesCount: int
    averageSaleAmount: float

class AccountingMetricsResponse(BaseModel):
    totalDebits: float
    totalCredits: float
    journalEntriesCount: int
    accountsWithActivity: int

class AccountTotalResponse(BaseModel):
    accountCode: str
    accountName: str
    totalDebit: float
    totalCredit: float
    balance: float

class FinancialSummaryReportResponse(BaseModel):
    periodStart: date
    periodEnd: date
    salesMetrics: SalesMetricsResponse
    accountingMetrics: AccountingMetricsResponse
    accountTotals: List[AccountTotalResponse]

# Account Schemas
class AccountResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    accountType: str
    parentCode: Optional[str] = None
    level: int
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class AccountCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=10)
    name: str = Field(..., min_length=2, max_length=200)
    accountType: str = Field(..., regex="^(activo|pasivo|patrimonio|ingreso|gasto)$")
    parentCode: Optional[str] = Field(None, max_length=10)

class AccountUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=2, max_length=10)
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    accountType: Optional[str] = Field(None, regex="^(activo|pasivo|patrimonio|ingreso|gasto)$")
    parentCode: Optional[str] = Field(None, max_length=10)
    isActive: Optional[bool] = None

# Esquemas de documentos fiscales
class FiscalDocumentResponse(BaseModel):
    id: int
    company_id: int
    code: str
    name: str
    description: Optional[str] = None
    prefix: str
    initialCorrelative: int
    currentCorrelative: int
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class FiscalDocumentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    prefix: str = Field(..., min_length=1, max_length=10)
    initialCorrelative: int = Field(1, ge=1)
    isActive: bool = True

class FiscalDocumentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=300)
    prefix: Optional[str] = Field(None, min_length=1, max_length=10)
    isActive: Optional[bool] = None

# Esquemas de venta
class CartItem(BaseModel):
    productId: int
    productName: str
    quantity: int
    unitPrice: float
    subtotal: float
    tax: float
    total: float

class CartItemCreate(BaseModel):
    productId: int = Field(..., gt=0)
    productName: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    unitPrice: float = Field(..., gt=0)
    subtotal: float = Field(..., ge=0)
    tax: float = Field(..., ge=0)
    total: float = Field(..., ge=0)

class SaleCreate(BaseModel):
    customerName: Optional[str] = Field(None, max_length=100)
    customerDocument: Optional[str] = Field(None, max_length=20)
    customerEmail: Optional[EmailStr] = None
    invoiceType: str = Field(..., min_length=1, max_length=100)  # Acepta cualquier código de documento fiscal
    items: List[CartItemCreate]
    subtotal: float = Field(..., ge=0)
    taxAmount: float = Field(..., ge=0)
    discountAmount: float = Field(0, ge=0)
    total: float = Field(..., gt=0)
    paymentMethod: str = Field(..., pattern="^(cash|card|transfer|bitcoin)$")
    paymentAmount: float = Field(..., gt=0)
    change: float = Field(..., ge=0)
    cashierId: int = Field(..., gt=0)
    cashierName: str = Field(..., min_length=2, max_length=100)
    status: str = Field("completed", pattern="^(completed|cancelled|refunded)$")

class SaleResponse(BaseModel):
    id: int
    invoiceNumber: str
    customerName: Optional[str] = None
    customerDocument: Optional[str] = None
    customerEmail: Optional[str] = None
    invoiceType: str
    items: List[CartItem]
    subtotal: float
    taxAmount: float
    discountAmount: float
    total: float
    paymentMethod: str
    paymentAmount: float
    change: float
    cashierId: int
    cashierName: str
    createdAt: datetime
    status: str

class SaleSummary(BaseModel):
    totalSales: float
    totalTransactions: int
    averageTicket: float
    salesByPaymentMethod: dict
    salesByInvoiceType: dict

# Proveedores
class SupplierResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    name: str
    taxId: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    isActive: bool
    createdAt: datetime

class SupplierCreate(BaseModel):
    name: str
    taxId: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    isActive: bool = True

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    taxId: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    isActive: Optional[bool] = None

# Descuentos
class DiscountResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    name: str
    percent: float
    isActive: bool
    createdAt: datetime

class DiscountCreate(BaseModel):
    name: str
    percent: float
    isActive: bool = True

class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    percent: Optional[float] = None
    isActive: Optional[bool] = None

# Sesión de Caja
class CashSessionResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    userId: int
    openedAt: datetime
    closedAt: Optional[datetime] = None
    openingAmount: float
    closingAmount: Optional[float] = None
    status: str

class CashSessionOpen(BaseModel):
    openingAmount: float = 0.0

class CashSessionClose(BaseModel):
    closingAmount: float = 0.0

# Bitácora
class AuditLogResponse(BaseModel):
    id: int
    company_id: Optional[int] = None
    userId: int
    action: str
    module: str
    detail: Optional[str] = None
    createdAt: datetime

# Product Categories Schemas
class ProductCategoryResponse(BaseModel):
    id: int
    company_id: int
    name: str
    description: Optional[str] = None
    isActive: bool
    createdAt: datetime

class ProductCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None

# Esquemas de compañía (multi-tenant)
class CompanyResponse(BaseModel):
    id: int
    nombre: str
    razonSocial: str
    nit: str
    dui: Optional[str] = None
    telefono: Optional[str] = None
    email: str
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    pais: str
    tipoEmpresa: str
    estado: str
    fechaRegistro: datetime
    contactoPrincipal: Optional[str] = None
    limiteCredito: float
    saldoActual: float
    adminUserId: Optional[int] = None
    subscriptionPlan: str
    maxUsers: int
    maxProducts: int
    maxSalesPerMonth: int
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class CompanyCreate(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=200)
    razonSocial: str = Field(..., min_length=2, max_length=200)
    nit: str = Field(..., min_length=5, max_length=50)
    dui: Optional[str] = Field(None, max_length=20)
    telefono: Optional[str] = Field(None, max_length=20)
    email: EmailStr
    direccion: Optional[str] = Field(None, max_length=500)
    ciudad: Optional[str] = Field("San Salvador", max_length=100)
    pais: str = Field("El Salvador", max_length=50)
    tipoEmpresa: str = Field(..., pattern="^(retail|manufacturing|services|restaurant|other)$")
    contactoPrincipal: Optional[str] = Field(None, max_length=200)
    limiteCredito: Optional[float] = Field(0.0, ge=0)
    subscriptionPlan: Optional[str] = Field("basic", pattern="^(basic|premium|enterprise)$")
    maxUsers: Optional[int] = Field(5, ge=1, le=100)
    maxProducts: Optional[int] = Field(1000, ge=1, le=50000)
    maxSalesPerMonth: Optional[int] = Field(500, ge=1, le=100000)

class CompanyWithAdminCreate(BaseModel):
    """Esquema para crear compañía junto con usuario administrador"""
    # Datos de compañía
    company: CompanyCreate
    # Datos de usuario administrador
    admin_username: str = Field(..., min_length=3, max_length=50)
    admin_name: str = Field(..., min_length=2, max_length=100)
    admin_email: EmailStr
    admin_password: str = Field(..., min_length=6, max_length=100)

class CompanyUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=200)
    razonSocial: Optional[str] = Field(None, min_length=2, max_length=200)
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    direccion: Optional[str] = Field(None, max_length=500)
    ciudad: Optional[str] = Field(None, max_length=100)
    contactoPrincipal: Optional[str] = Field(None, max_length=200)
    limiteCredito: Optional[float] = Field(None, ge=0)
    estado: Optional[str] = Field(None, pattern="^(activa|inactiva|suspendida)$")
    subscriptionPlan: Optional[str] = Field(None, pattern="^(basic|premium|enterprise)$")
    maxUsers: Optional[int] = Field(None, ge=1, le=100)
    maxProducts: Optional[int] = Field(None, ge=1, le=50000)
    maxSalesPerMonth: Optional[int] = Field(None, ge=1, le=100000)

class CompanyStatusUpdate(BaseModel):
    estado: str = Field(..., pattern="^(activa|inactiva|suspendida)$")

class CompanyCreationResponse(BaseModel):
    success: bool
    message: str
    company_id: Optional[int] = None
    admin_user_id: Optional[int] = None
    accounts_created: Optional[int] = None
    fiscal_docs_created: Optional[int] = None
    categories_created: Optional[int] = None
    products_created: Optional[int] = None
    error: Optional[str] = None

# Esquemas de contexto de compañía
class CompanyContext(BaseModel):
    """Contexto actual de compañía para el usuario"""
    user_id: int
    username: str
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    user_role: str
    is_sudo: bool = False
    permissions: List[str] = []