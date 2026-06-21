from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import OrderStatus


class ProductBase(BaseModel):
    sku: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=160)
    category: str = Field(min_length=2, max_length=100)
    description: str = ""
    price: float = Field(ge=0)
    stock_quantity: int = Field(ge=0)
    reorder_level: int = Field(ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(ProductBase):
    pass


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class CustomerBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str = ""
    address: str = ""


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(min_length=1)
    notes: str = ""


class OrderItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    unit_price: float
    line_total: float
    product: Optional[ProductRead] = None


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    status: OrderStatus
    total_amount: float
    notes: str
    created_at: datetime
    customer: Optional[CustomerRead] = None
    items: List[OrderItemRead] = []


class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    total_units: int
    low_stock_products: int
    inventory_value: float
    revenue: float
