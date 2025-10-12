"""
Esquemas de validación para el sistema Super POS
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr

# Esquemas de usuario
class UserResponse(BaseModel):
    id: int
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

# Esquemas de documentos fiscales
class FiscalDocumentResponse(BaseModel):
    id: int
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