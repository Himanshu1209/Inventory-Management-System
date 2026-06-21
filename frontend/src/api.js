const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.error || "Request failed");
  }
  return data;
}

export const api = {
  dashboard: () => request("/api/dashboard"),
  products: (params = "") => request(`/api/products${params}`),
  createProduct: (payload) => request("/api/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  customers: () => request("/api/customers"),
  createCustomer: (payload) => request("/api/customers", { method: "POST", body: JSON.stringify(payload) }),
  updateCustomer: (id, payload) => request(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  orders: () => request("/api/orders"),
  createOrder: (payload) => request("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
};
