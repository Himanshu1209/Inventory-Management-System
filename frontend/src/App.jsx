import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Boxes,
  Check,
  ClipboardList,
  IndianRupee,
  PackagePlus,
  Search,
  ShoppingCart,
  Trash2,
  Users,
} from "lucide-react";
import { api } from "./api";
import "./styles.css";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const number = new Intl.NumberFormat("en-IN");

const emptyProduct = {
  sku: "",
  name: "",
  category: "",
  description: "",
  price: 0,
  stock_quantity: 0,
  reorder_level: 0,
};

const emptyCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

function App() {
  const [activeView, setActiveView] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [orderForm, setOrderForm] = useState({ customer_id: "", product_id: "", quantity: 1, notes: "" });
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const lowStockProducts = useMemo(
    () => products.filter((product) => product.stock_quantity <= product.reorder_level),
    [products],
  );

  async function loadData() {
    const [summary, productList, customerList, orderList] = await Promise.all([
      api.dashboard(),
      api.products(),
      api.customers(),
      api.orders(),
    ]);
    setDashboard(summary);
    setProducts(productList);
    setCustomers(customerList);
    setOrders(orderList);
    setOrderForm((current) => ({
      ...current,
      customer_id: current.customer_id || customerList[0]?.id || "",
      product_id: current.product_id || productList[0]?.id || "",
    }));
  }

  useEffect(() => {
    loadData().catch(showError);
  }, []);

  async function applyProductFilter() {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (lowStockOnly) params.set("low_stock", "true");
    setProducts(await api.products(`?${params}`));
  }

  useEffect(() => {
    const id = setTimeout(() => applyProductFilter().catch(showError), 250);
    return () => clearTimeout(id);
  }, [search, lowStockOnly]);

  function showSuccess(message) {
    setError("");
    setNotice(message);
    setTimeout(() => setNotice(""), 2600);
  }

  function showError(err) {
    setNotice("");
    setError(err.message || "Something went wrong");
  }

  function updateProductField(field, value) {
    setProductForm((current) => ({ ...current, [field]: value }));
  }

  function updateCustomerField(field, value) {
    setCustomerForm((current) => ({ ...current, [field]: value }));
  }

  async function submitProduct(event) {
    event.preventDefault();
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock_quantity: Number(productForm.stock_quantity),
      reorder_level: Number(productForm.reorder_level),
    };
    if (editingProductId) {
      await api.updateProduct(editingProductId, payload);
      showSuccess("Product updated");
    } else {
      await api.createProduct(payload);
      showSuccess("Product created");
    }
    setProductForm(emptyProduct);
    setEditingProductId(null);
    await loadData();
  }

  function editProduct(product) {
    setProductForm(product);
    setEditingProductId(product.id);
    setActiveView("products");
  }

  async function deleteProduct(id) {
    if (!confirm("Delete this product?")) return;
    await api.deleteProduct(id);
    showSuccess("Product deleted");
    await loadData();
  }

  async function submitCustomer(event) {
    event.preventDefault();
    if (editingCustomerId) {
      await api.updateCustomer(editingCustomerId, customerForm);
      showSuccess("Customer updated");
    } else {
      await api.createCustomer(customerForm);
      showSuccess("Customer created");
    }
    setCustomerForm(emptyCustomer);
    setEditingCustomerId(null);
    await loadData();
  }

  function editCustomer(customer) {
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setEditingCustomerId(customer.id);
    setActiveView("customers");
  }

  async function submitOrder(event) {
    event.preventDefault();
    await api.createOrder({
      customer_id: Number(orderForm.customer_id),
      items: [{ product_id: Number(orderForm.product_id), quantity: Number(orderForm.quantity) }],
      notes: orderForm.notes,
    });
    setOrderForm((current) => ({ ...current, quantity: 1, notes: "" }));
    showSuccess("Order placed and stock updated");
    await loadData();
  }

  const nav = [
    ["dashboard", Boxes, "Dashboard"],
    ["products", PackagePlus, "Products"],
    ["customers", Users, "Customers"],
    ["orders", ShoppingCart, "Orders"],
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span>IMS</span>
          <div>
            <strong>Inventory</strong>
            <small>Management System</small>
          </div>
        </div>
        <nav>
          {nav.map(([key, Icon, label]) => (
            <button key={key} className={activeView === key ? "active" : ""} onClick={() => setActiveView(key)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{nav.find(([key]) => key === activeView)?.[2]}</h1>
            <p>Products, customers, and orders managed through a Python REST API.</p>
          </div>
          <div className="status">
            {notice && <span className="success"><Check size={16} />{notice}</span>}
            {error && <span className="error"><AlertTriangle size={16} />{error}</span>}
          </div>
        </header>

        {activeView === "dashboard" && (
          <section className="view">
            <div className="metrics">
              <Metric icon={Boxes} label="Products" value={dashboard?.total_products || 0} />
              <Metric icon={Users} label="Customers" value={dashboard?.total_customers || 0} />
              <Metric icon={ClipboardList} label="Orders" value={dashboard?.total_orders || 0} />
              <Metric icon={IndianRupee} label="Revenue" value={money.format(dashboard?.revenue || 0)} />
            </div>
            <div className="grid two">
              <section className="panel">
                <h2>Inventory Health</h2>
                <div className="health">
                  <strong>{number.format(dashboard?.total_units || 0)}</strong>
                  <span>units in stock</span>
                  <strong>{money.format(dashboard?.inventory_value || 0)}</strong>
                  <span>inventory value</span>
                </div>
              </section>
              <section className="panel">
                <h2>Low Stock Alerts</h2>
                <div className="stack">
                  {lowStockProducts.length === 0 && <Empty text="No low stock products" />}
                  {lowStockProducts.map((product) => (
                    <div className="list-row" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <small>{product.sku} · reorder at {product.reorder_level}</small>
                      </div>
                      <span className="pill warn">{product.stock_quantity} left</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeView === "products" && (
          <section className="view">
            <div className="grid form-layout">
              <section className="panel">
                <h2>{editingProductId ? "Edit Product" : "Create Product"}</h2>
                <form className="form-grid" onSubmit={(event) => submitProduct(event).catch(showError)}>
                  <Input label="SKU" value={productForm.sku} onChange={(value) => updateProductField("sku", value)} required />
                  <Input label="Name" value={productForm.name} onChange={(value) => updateProductField("name", value)} required />
                  <Input label="Category" value={productForm.category} onChange={(value) => updateProductField("category", value)} required />
                  <Input label="Price" type="number" value={productForm.price} onChange={(value) => updateProductField("price", value)} required />
                  <Input label="Stock" type="number" value={productForm.stock_quantity} onChange={(value) => updateProductField("stock_quantity", value)} required />
                  <Input label="Reorder Level" type="number" value={productForm.reorder_level} onChange={(value) => updateProductField("reorder_level", value)} required />
                  <label className="span-2">Description<textarea value={productForm.description || ""} onChange={(event) => updateProductField("description", event.target.value)} /></label>
                  <button className="primary span-2" type="submit">{editingProductId ? "Update Product" : "Add Product"}</button>
                </form>
              </section>
              <section className="panel">
                <div className="toolbar">
                  <label className="search"><Search size={16} /><input placeholder="Search products" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
                  <label className="checkbox"><input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} /> Low stock</label>
                </div>
                <ProductTable products={products} onEdit={editProduct} onDelete={(id) => deleteProduct(id).catch(showError)} />
              </section>
            </div>
          </section>
        )}

        {activeView === "customers" && (
          <section className="view">
            <div className="grid form-layout">
              <section className="panel">
                <h2>{editingCustomerId ? "Edit Customer" : "Create Customer"}</h2>
                <form className="form-grid" onSubmit={(event) => submitCustomer(event).catch(showError)}>
                  <Input label="Name" value={customerForm.name} onChange={(value) => updateCustomerField("name", value)} required />
                  <Input label="Email" type="email" value={customerForm.email} onChange={(value) => updateCustomerField("email", value)} required />
                  <Input label="Phone" value={customerForm.phone} onChange={(value) => updateCustomerField("phone", value)} />
                  <Input label="Address" value={customerForm.address} onChange={(value) => updateCustomerField("address", value)} />
                  <button className="primary span-2" type="submit">{editingCustomerId ? "Update Customer" : "Add Customer"}</button>
                  {editingCustomerId && (
                    <button
                      className="secondary span-2"
                      type="button"
                      onClick={() => {
                        setCustomerForm(emptyCustomer);
                        setEditingCustomerId(null);
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </form>
              </section>
              <section className="panel">
                <h2>Customers</h2>
                <div className="stack">
                  {customers.map((customer) => (
                    <div className="list-row" key={customer.id}>
                      <div><strong>{customer.name}</strong><small>{customer.email}</small></div>
                      <div className="row-actions">
                        <span className="pill">{customer.phone || "No phone"}</span>
                        <button type="button" onClick={() => editCustomer(customer)}>Edit</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {activeView === "orders" && (
          <section className="view">
            <div className="grid form-layout">
              <section className="panel">
                <h2>Place Order</h2>
                <form className="form-grid" onSubmit={(event) => submitOrder(event).catch(showError)}>
                  <label>Customer<select value={orderForm.customer_id} onChange={(event) => setOrderForm({ ...orderForm, customer_id: event.target.value })}>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
                  <label>Product<select value={orderForm.product_id} onChange={(event) => setOrderForm({ ...orderForm, product_id: event.target.value })}>{products.map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}</select></label>
                  <Input label="Quantity" type="number" value={orderForm.quantity} onChange={(value) => setOrderForm({ ...orderForm, quantity: value })} required />
                  <Input label="Notes" value={orderForm.notes} onChange={(value) => setOrderForm({ ...orderForm, notes: value })} />
                  <button className="primary span-2" type="submit">Place Order</button>
                </form>
              </section>
              <section className="panel">
                <h2>Recent Orders</h2>
                <div className="stack">
                  {orders.length === 0 && <Empty text="No orders yet" />}
                  {orders.map((order) => (
                    <div className="list-row" key={order.id}>
                      <div>
                        <strong>Order #{order.id} · {order.customer?.name}</strong>
                        <small>{order.items.map((item) => `${item.product?.sku} x ${item.quantity}`).join(", ")}</small>
                      </div>
                      <span className="pill">{money.format(order.total_amount)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <article className="metric">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return (
    <label>
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} min={type === "number" ? "0" : undefined} />
    </label>
  );
}

function ProductTable({ products, onEdit, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Product</th>
            <th>Category</th>
            <th>Stock</th>
            <th>Price</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td><strong>{product.sku}</strong></td>
              <td>{product.name}<small>{product.description || "No description"}</small></td>
              <td>{product.category}</td>
              <td><span className={product.stock_quantity <= product.reorder_level ? "pill warn" : "pill"}>{product.stock_quantity}</span></td>
              <td>{money.format(product.price)}</td>
              <td>
                <div className="actions">
                  <button type="button" onClick={() => onEdit(product)}>Edit</button>
                  <button type="button" className="danger" onClick={() => onDelete(product.id)} title="Delete product"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

createRoot(document.getElementById("root")).render(<App />);
