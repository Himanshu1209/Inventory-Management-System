from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import case, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from . import models, schemas


def create_product(db: Session, payload: schemas.ProductCreate):
    product = models.Product(**payload.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product SKU already exists") from exc
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, payload: schemas.ProductUpdate):
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product SKU already exists") from exc
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int):
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"deleted": True}


def create_customer(db: Session, payload: schemas.CustomerCreate):
    customer = models.Customer(**payload.model_dump())
    db.add(customer)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer email already exists") from exc
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer_id: int, payload: schemas.CustomerUpdate):
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    for key, value in payload.model_dump().items():
        setattr(customer, key, value)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer email already exists") from exc
    db.refresh(customer)
    return customer


def create_order(db: Session, payload: schemas.OrderCreate):
    customer = db.get(models.Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    requested = defaultdict(int)
    for item in payload.items:
        requested[item.product_id] += item.quantity

    products = (
        db.query(models.Product)
        .filter(models.Product.id.in_(requested.keys()))
        .with_for_update()
        .all()
    )
    products_by_id = {product.id: product for product in products}
    missing = set(requested.keys()) - set(products_by_id.keys())
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product not found: {sorted(missing)[0]}")

    for product_id, quantity in requested.items():
        product = products_by_id[product_id]
        if product.stock_quantity < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.sku}. Available: {product.stock_quantity}",
            )

    order = models.Order(customer_id=payload.customer_id, notes=payload.notes, total_amount=0)
    db.add(order)
    total = 0.0

    for product_id, quantity in requested.items():
        product = products_by_id[product_id]
        product.stock_quantity -= quantity
        line_total = product.price * quantity
        total += line_total
        db.add(
            models.OrderItem(
                order=order,
                product_id=product.id,
                quantity=quantity,
                unit_price=product.price,
                line_total=line_total,
            )
        )

    order.total_amount = total
    db.commit()
    return (
        db.query(models.Order)
        .options(joinedload(models.Order.customer), joinedload(models.Order.items).joinedload(models.OrderItem.product))
        .filter(models.Order.id == order.id)
        .one()
    )


def dashboard_summary(db: Session):
    product_stats = db.query(
        func.count(models.Product.id),
        func.coalesce(func.sum(models.Product.stock_quantity), 0),
        func.coalesce(func.sum(models.Product.stock_quantity * models.Product.price), 0),
        func.coalesce(
            func.sum(case((models.Product.stock_quantity <= models.Product.reorder_level, 1), else_=0)),
            0,
        ),
    ).one()

    total_customers = db.query(func.count(models.Customer.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    revenue = db.query(func.coalesce(func.sum(models.Order.total_amount), 0)).scalar() or 0

    return {
        "total_products": product_stats[0] or 0,
        "total_units": product_stats[1] or 0,
        "inventory_value": float(product_stats[2] or 0),
        "low_stock_products": product_stats[3] or 0,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "revenue": float(revenue),
    }
