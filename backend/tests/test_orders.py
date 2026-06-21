import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["ENVIRONMENT"] = "test"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def test_order_reduces_stock():
    product = client.post(
        "/api/products",
        json={
            "sku": "T-100",
            "name": "Test Product",
            "category": "QA",
            "price": 100,
            "stock_quantity": 5,
            "reorder_level": 1,
        },
    ).json()
    customer = client.post(
        "/api/customers",
        json={"name": "Test Customer", "email": "test@example.com"},
    ).json()

    response = client.post(
        "/api/orders",
        json={"customer_id": customer["id"], "items": [{"product_id": product["id"], "quantity": 2}]},
    )

    assert response.status_code == 201
    updated = client.get(f"/api/products/{product['id']}").json()
    assert updated["stock_quantity"] == 3


def test_order_rejects_insufficient_stock():
    product = client.post(
        "/api/products",
        json={
            "sku": "T-200",
            "name": "Limited Product",
            "category": "QA",
            "price": 100,
            "stock_quantity": 1,
            "reorder_level": 1,
        },
    ).json()
    customer = client.post(
        "/api/customers",
        json={"name": "Test Customer", "email": "limited@example.com"},
    ).json()

    response = client.post(
        "/api/orders",
        json={"customer_id": customer["id"], "items": [{"product_id": product["id"], "quantity": 2}]},
    )

    assert response.status_code == 400
    updated = client.get(f"/api/products/{product['id']}").json()
    assert updated["stock_quantity"] == 1
