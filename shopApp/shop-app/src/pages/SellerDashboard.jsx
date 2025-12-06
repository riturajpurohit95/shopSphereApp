import React, { useEffect, useState } from "react";
import axios from "axios";
import "./SellerDashboard.css";

// axios instance for this page
const api = axios.create({
  baseURL: "http://localhost:8888", // change if your backend runs on a different URL
});

// attach JWT token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // make sure this key matches your login logic
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const emptyForm = {
  name: "",
  mrp: "",
  price: "",
  quantity: "",
  brand: "",
  description: "",
  categoryId: "",
};

const SellerDashboard = () => {
  // ---- get user from localStorage safely ----
  const rawUser = localStorage.getItem("user");
  let storedUser = null;
  try {
    storedUser = rawUser ? JSON.parse(rawUser) : null;
  } catch (e) {
    console.error("Failed to parse stored user", e);
  }

  // In your DB/backend you use userId, so take that.
  // Fallback to id just in case your login stored it that way.
  const userId = storedUser?.userId ?? storedUser?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    todaySales: 0,
    totalOrders: 0,
    activeProducts: 0,
    pendingPayout: 0,
  });

  const [products, setProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  const [notifications, setNotifications] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);

  const [mode, setMode] = useState("add"); // "add" or "edit"
  const [editProductId, setEditProductId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // ---------- helpers ----------
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "-";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const findProductById = (id) =>
    products.find((p) => String(p.productId) === String(id));

  // ---------- load everything ----------
  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");

      // 1. seller dashboard summary (backend uses userId to find-by-seller)
      const dashRes = await api.get("/api/seller/dashboard", {
        params: { userId },
      });
      setStats(dashRes.data.stats || {});
      setNotifications(dashRes.data.notifications || []);
      setLowStockAlerts(dashRes.data.lowStockAlerts || []);

      // 2. seller's own products
      const prodRes = await api.get("/api/seller/products", {
        params: { userId },
      });
      setProducts(prodRes.data || []);

      // 3. recent orders for this seller
      const ordRes = await api.get("/api/seller/orders/recent", {
        params: { userId },
      });
      setRecentOrders(ordRes.data || []);
    } catch (err) {
      console.error("Error fetching seller dashboard:", err);
      setError("Failed to load seller dashboard.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- initial load ----------
  useEffect(() => {
    if (!storedUser) {
      setError("You must be logged in to view this page.");
      return;
    }

    if (!userId) {
      setError("User information is missing. Please log in again.");
      console.log("Stored user in SellerDashboard:", storedUser);
      return;
    }

    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---------- product form ----------
  const handleEditClick = (productId) => {
    const product = findProductById(productId);
    if (!product) return;

    setMode("edit");
    setEditProductId(product.productId);
    setForm({
      name: product.productName,
      mrp: product.productMrp,
      price: product.productPrice,
      quantity: product.productQuantity,
      brand: product.brand,
      description: product.productDescription || "",
      categoryId: product.categoryId || "",
    });
  };

  const handleAddClick = () => {
    setMode("add");
    setEditProductId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    // ✅ validate MRP vs Price on frontend
    const mrpNum = Number(form.mrp);
    const priceNum = Number(form.price);
    if (!Number.isNaN(mrpNum) && !Number.isNaN(priceNum) && priceNum > mrpNum) {
      setError("Price cannot be greater than MRP.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (mode === "add") {
        // CREATE PRODUCT
        const payload = {
          productName: form.name,
          productDescription: form.description,
          productMrp: Number(form.mrp),
          productPrice: Number(form.price),
          productQuantity: Number(form.quantity),
          brand: form.brand,
          categoryId: Number(form.categoryId),
          userId: userId, // link product to seller
        };

        await api.post("/api/seller/products", payload, {
          params: { userId }, // in case your controller also reads from param
        });

        // 🔄 refresh everything so low stock / stats update immediately
        await fetchAll();
        setForm(emptyForm);
        setMode("add");
      } else if (mode === "edit" && editProductId != null) {
        const existing = findProductById(editProductId);
        if (!existing) return;

        const payload = {
          ...existing,
          productName: form.name,
          productDescription: form.description,
          productMrp: Number(form.mrp),
          productPrice: Number(form.price),
          productQuantity: Number(form.quantity),
          brand: form.brand,
          categoryId: Number(form.categoryId || existing.categoryId),
          userId: userId,
        };

        await api.put(`/api/seller/products/${editProductId}`, payload, {
          params: { userId },
        });

        // 🔄 re-fetch so low stock & stats update
        await fetchAll();
      }
    } catch (err) {
      console.error("Error saving product:", err);
      setError("Failed to save product. Please check required fields.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/api/seller/products/${productId}`, {
        params: { userId },
      });
      // 🔄 refresh everything so low stock / stats update immediately
      await fetchAll();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError("Failed to delete product.");
    }
  };

  // ---------- order status ----------
  // Only allow SHIPPED / DELIVERED changes from UI
  const handleOrderStatusChange = (orderId, newStatus) => {
    if (newStatus !== "SHIPPED" && newStatus !== "DELIVERED") return;

    setRecentOrders((prev) =>
      prev.map((o) =>
        o.orderId === orderId ? { ...o, status: newStatus } : o
      )
    );
  };

  const handleOrderStatusSave = async (orderId) => {
    const order = recentOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    try {
      await api.put(`/api/seller/orders/${orderId}/status`, {
        status: order.status, // SHIPPED or DELIVERED
        userId: userId, // in case backend validates seller
      });

      // optional: refresh to be 100% in sync with backend
      await fetchAll();
    } catch (err) {
      console.error("Error updating order status:", err);
      setError("Failed to update order status.");
      fetchAll(); // reset UI with backend data
    }
  };

  // ---------- render ----------
  return (
    <div className="seller-dashboard">
      <div className="seller-dashboard-header">
        <div>
          <h1>Seller Dashboard</h1>
          <p>Overview of your own products, orders, and earnings.</p>
        </div>

        <div className="seller-dashboard-actions">
          <button className="btn-primary" onClick={handleAddClick}>
            + Add Product
          </button>
        </div>
      </div>

      {loading && <div className="seller-dashboard-loading">Loading...</div>}
      {error && <div className="seller-dashboard-error">{error}</div>}

      {/* TOP CARDS */}
      <div className="seller-stats-grid">
        <div className="seller-stat-card">
          <div className="seller-stat-label">Today's Sales</div>
          <div className="seller-stat-value">
            {formatCurrency(stats.todaySales)}
          </div>
          <div className="seller-stat-subtitle">Last 24 hours</div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-label">Total Orders</div>
          <div className="seller-stat-value">{stats.totalOrders}</div>
          <div className="seller-stat-subtitle">
            Orders placed on your products
          </div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-label">Active Products</div>
          <div className="seller-stat-value">{stats.activeProducts}</div>
          <div className="seller-stat-subtitle">Currently live</div>
        </div>

        <div className="seller-stat-card">
          <div className="seller-stat-label">Pending Payout</div>
          <div className="seller-stat-value">
            {formatCurrency(stats.pendingPayout)}
          </div>
          <div className="seller-stat-subtitle">
            To be credited to your account
          </div>
        </div>
      </div>

      <div className="seller-main-grid">
        {/* LEFT: MY PRODUCTS + EDIT/ADD FORM */}
        <section className="seller-section">
          <div className="seller-section-header">
            <h2>My Products</h2>
            <span className="seller-small-muted">
              Showing {products.length} products
            </span>
          </div>

          <div className="seller-table-wrapper">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>MRP</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Brand</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="7">No products yet. Add your first product.</td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.productId}>
                      <td>{p.productId}</td>
                      <td>{p.productName}</td>
                      <td>{formatCurrency(p.productMrp)}</td>
                      <td>{formatCurrency(p.productPrice)}</td>
                      <td>{p.productQuantity}</td>
                      <td>{p.brand}</td>
                      <td>
                        <button
                          className="btn-small"
                          onClick={() => handleEditClick(p.productId)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-small btn-danger"
                          onClick={() => handleDeleteProduct(p.productId)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* EDIT / ADD FORM */}
          <div className="seller-form-wrapper">
            <h3>
              {mode === "add"
                ? "Add New Product"
                : `Edit Product #${editProductId}`}
            </h3>
            <form onSubmit={handleProductSubmit} className="seller-form-grid">
              <label>
                Name
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                MRP
                <input
                  type="number"
                  name="mrp"
                  value={form.mrp}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                Brand
                <input
                  type="text"
                  name="brand"
                  value={form.brand}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label className="seller-form-full">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                />
              </label>
              <label>
                Category ID
                <input
                  type="number"
                  name="categoryId"
                  value={form.categoryId}
                  onChange={handleFormChange}
                  required
                />
              </label>

              <div className="seller-form-actions">
                <button type="submit" className="btn-primary">
                  {mode === "add" ? "Add Product" : "Save Changes"}
                </button>
                {mode === "edit" && (
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={handleAddClick}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        {/* RIGHT: NOTIFICATIONS + LOW STOCK + RECENT ORDERS */}
        <div className="seller-side-column">
          {/* NOTIFICATIONS */}
          <section className="seller-section">
            <div className="seller-section-header">
              <h2>Notifications</h2>
            </div>
            {notifications.length === 0 ? (
              <div className="seller-empty-state">No notifications right now.</div>
            ) : (
              <ul className="seller-notifications-list">
                {notifications.map((note) => (
                  <li key={note.id} className="seller-notification-item">
                    <div className="seller-notification-dot" />
                    <div>
                      <p className="seller-notification-message">
                        {note.message}
                      </p>
                      <span className="seller-notification-time">
                        {note.time}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* LOW STOCK ALERTS */}
          <section className="seller-section">
            <div className="seller-section-header">
              <h2>Low Stock Alerts</h2>
            </div>
            {lowStockAlerts.length === 0 ? (
              <div className="seller-empty-state">No low stock items.</div>
            ) : (
              <ul className="seller-payouts-list">
                {lowStockAlerts.map((item) => (
                  <li key={item.productId} className="seller-payout-item">
                    <div>
                      <div className="seller-payout-amount">
                        {item.productName}
                      </div>
                      <div className="seller-payout-date">
                        Only {item.currentStock} left
                      </div>
                    </div>
                    <span className="status-badge inventory-low-stock">
                      Low stock
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* RECENT ORDERS (WITH STATUS UPDATE) */}
          <section className="seller-section">
            <div className="seller-section-header">
              <h2>Recent Orders</h2>
            </div>
            {recentOrders.length === 0 ? (
              <div className="seller-empty-state">No orders yet.</div>
            ) : (
              <div className="seller-table-wrapper">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.orderId}>
                        <td>{o.orderId}</td>
                        <td>{o.orderDate}</td>
                        <td>{o.productName}</td>
                        <td>{formatCurrency(o.totalAmount)}</td>
                        <td>
                          {/* Only SHIPPED / DELIVERED selectable */}
                          <select
                            value={o.status}
                            onChange={(e) =>
                              handleOrderStatusChange(
                                o.orderId,
                                e.target.value
                              )
                            }
                          >
                            <option value={o.status} disabled>
                              {o.status}
                            </option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                          </select>
                        </td>
                        <td>{o.paymentStatus}</td>
                        <td>
                          <button
                            className="btn-small"
                            onClick={() => handleOrderStatusSave(o.orderId)}
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;


