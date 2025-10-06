"""
Modelos de datos para el sistema Super POS
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# Modelos base
class User(BaseModel):
    id: int
    username: str
    name: str
    email: str
    password: str
    role: str  # admin, manager, cashier
    isActive: bool
    createdAt: datetime
    lastLogin: Optional[datetime] = None

class Product(BaseModel):
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
    taxRate: float  # Porcentaje de impuesto
    isActive: bool
    createdAt: datetime
    updatedAt: datetime

class ProductCategory(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    isActive: bool

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

# Los esquemas de respuesta están definidos en schemas.py
