from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from . import models, schemas, services
from .config import get_settings
from .database import Base, engine, get_db


settings = get_settings()


@asynccontextmanager
async def lifespan(app_: FastAPI):
    Base.metadata.create_all(bind=engine)
    if settings.environment != "test":
        seed_data()
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Inventory Management API is running",
        "docs": "/docs",
        "health": "/health",
    }


def seed_data():
    from .database import SessionLocal

    db = SessionLocal()
    try:
        if db.query(models.Product).count():
            return
        db.add_all(
            [
                models.Product(sku="SKU-1001", name="Wireless Keyboard", category="Electronics", price=1299, stock_quantity=42, reorder_level=15),
                models.Product(sku="SKU-1002", name="USB-C Hub", category="Electronics", price=1899, stock_quantity=8, reorder_level=10),
                models.Product(sku="SKU-2001", name="Office Chair", category="Furniture", price=5799, stock_quantity=21, reorder_level=5),
                models.Product(sku="SKU-3001", name="Notebook Pack", category="Stationery", price=249, stock_quantity=120, reorder_level=30),
            ]
        )
        db.add_all(
            [
                models.Customer(name="Aarav Sharma", email="aarav@example.com", phone="+91-98765-10001", address="Gurugram"),
                models.Customer(name="Meera Kapoor", email="meera@example.com", phone="+91-98765-10002", address="Delhi"),
            ]
        )
        db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


@app.get("/api/dashboard", response_model=schemas.DashboardSummary)
def get_dashboard(db: Session = Depends(get_db)):
    return services.dashboard_summary(db)


@app.get("/api/products", response_model=list[schemas.ProductRead])
def list_products(
    q: str = "",
    low_stock: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(models.Product)
    if q:
        needle = f"%{q}%"
        query = query.filter(
            (models.Product.name.ilike(needle))
            | (models.Product.sku.ilike(needle))
            | (models.Product.category.ilike(needle))
        )
    if low_stock:
        query = query.filter(models.Product.stock_quantity <= models.Product.reorder_level)
    return query.order_by(models.Product.updated_at.desc(), models.Product.id.desc()).all()


@app.post("/api/products", response_model=schemas.ProductRead, status_code=201)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    return services.create_product(db, payload)


@app.get("/api/products/{product_id}", response_model=schemas.ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(models.Product, product_id)
    if not product:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.put("/api/products/{product_id}", response_model=schemas.ProductRead)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    return services.update_product(db, product_id, payload)


@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    return services.delete_product(db, product_id)


@app.get("/api/customers", response_model=list[schemas.CustomerRead])
def list_customers(q: str = "", db: Session = Depends(get_db)):
    query = db.query(models.Customer)
    if q:
        needle = f"%{q}%"
        query = query.filter((models.Customer.name.ilike(needle)) | (models.Customer.email.ilike(needle)))
    return query.order_by(models.Customer.created_at.desc(), models.Customer.id.desc()).all()


@app.post("/api/customers", response_model=schemas.CustomerRead, status_code=201)
def create_customer(payload: schemas.CustomerCreate, db: Session = Depends(get_db)):
    return services.create_customer(db, payload)


@app.put("/api/customers/{customer_id}", response_model=schemas.CustomerRead)
def update_customer(customer_id: int, payload: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    return services.update_customer(db, customer_id, payload)


@app.get("/api/orders", response_model=list[schemas.OrderRead])
def list_orders(limit: int = Query(25, ge=1, le=100), db: Session = Depends(get_db)):
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.customer), joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .order_by(models.Order.created_at.desc(), models.Order.id.desc())
        .limit(limit)
        .all()
    )


@app.post("/api/orders", response_model=schemas.OrderRead, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    return services.create_order(db, payload)


@app.get("/api/categories")
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(models.Product.category, func.count(models.Product.id)).group_by(models.Product.category).all()
    return [{"category": row[0], "count": row[1]} for row in rows]
