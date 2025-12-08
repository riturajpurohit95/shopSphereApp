



import React, { useEffect, useState } from "react";
import axios from "axios";
import profileImg from "../images/blank_1.avif"; // your profile image
import "./SellerDashboard.css";

// Axios instance
const api = axios.create({
  baseURL: "http://localhost:8888",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

const emptyForm = {
  productName: "",
  productMrp: "",
  productPrice: "",
  productQuantity: "",
  brand: "",
  productDescription: "",
  categoryId: "",
};

const SellerDashboard = () => {
  const rawUser = localStorage.getItem("user");
  let storedUser = null;
  try {
    storedUser = rawUser ? JSON.parse(rawUser) : null;
  } catch (e) {
    console.error("Failed to parse stored user", e);
  }

  const userId = storedUser?.userId ?? storedUser?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
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
  const [mode, setMode] = useState("add");
  const [editProductId, setEditProductId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showProfileDetails, setShowProfileDetails] = useState(false);


  // ---------- helpers ----------
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === "") return "-";
    return `₹${Number(amount).toLocaleString("en-IN")}`;
  };

  const findProductById = (id) =>
    products.find((p) => String(p.productId) === String(id));

  // ---------- fetch seller profile ----------
  const fetchProfile = async () => {
    try {
      const res = await api.get(`/api/users/${userId}/profile`);
      setProfile(res.data);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // ---------- fetch products ----------
  const fetchProducts = async () => {
    try {
      const res = await api.get("/api/seller/products", { params: { userId } });
      setProducts(res.data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  // ---------- fetch seller orders ----------
  const fetchSellerOrders = async () => {
    try {
      const res = await api.get(`/api/orders/seller/${userId}`);
      const orders = res.data || [];
      setStats((prev) => ({ ...prev, totalOrders: orders.length }));
      // show latest 5 orders
      setRecentOrders(orders.slice(-5).reverse());
    } catch (err) {
      console.error("Error fetching seller orders:", err);
    }
  };

  // ---------- fetch dashboard stats ----------
  const fetchDashboardStats = async () => {
    try {
      const res = await api.get("/api/seller/dashboard", { params: { userId } });
      setStats((prev) => ({
        ...prev,
        todaySales: res.data.stats?.todaySales || 0,
        activeProducts: res.data.stats?.activeProducts || 0,
        pendingPayout: res.data.stats?.pendingPayout || 0,
      }));
      setNotifications(res.data.notifications || []);
      setLowStockAlerts(res.data.lowStockAlerts || []);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  };

  // ---------- fetch all ----------
  const fetchAll = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError("");
      await Promise.all([
        fetchProfile(),
        fetchProducts(),
        fetchDashboardStats(),
        fetchSellerOrders(),
      ]);
    } catch (err) {
      console.error(err);
      setError("Failed to load seller dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storedUser) {
      setError("You must be logged in to view this page.");
      return;
    }
    fetchAll();
  }, [userId]);

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (!event.target.closest(".seller-profile-icon") && showProfileDetails) {
      setShowProfileDetails(false);
    }
  };
  document.addEventListener("click", handleClickOutside);
  return () => document.removeEventListener("click", handleClickOutside);
}, [showProfileDetails]);


// Handle status change in dropdown locally
const handleOrderStatusChange = (orderId, newStatus) => {
  setRecentOrders(prev =>
    prev.map(order =>
      order.order_id === orderId
        ? { ...order, orderStatus: newStatus }
        : order
    )
  );
};



// Save updated status to the backend
// Save updated status to the backend (send JSON body)
const handleOrderStatusSave = async (orderId) => {
  try {
    const order = recentOrders.find(o => o.order_id === orderId);
    if (!order) return;

    // Send JSON body instead of query param
    await api.put(`/api/orders/${orderId}/status`, { orderStatus: order.orderStatus });

    await fetchAll();
  } catch (err) {
    console.error("Error updating order status:", err);
    setError("Failed to update order status.");
  }
};





  // ---------- product handlers ----------
  const handleEditClick = (productId) => {
    const product = findProductById(productId);
    if (!product) return;
    setMode("edit");
    setEditProductId(product.productId);
    setForm({
      productName: product.productName,
      productMrp: product.productMrp,
      productPrice: product.productPrice,
      productQuantity: product.productQuantity,
      brand: product.brand,
      productDescription: product.productDescription || "",
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
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;

    const mrpNum = Number(form.productMrp);
    const priceNum = Number(form.productPrice);
    if (!Number.isNaN(mrpNum) && !Number.isNaN(priceNum) && priceNum > mrpNum) {
      setError("Price cannot be greater than MRP.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      if (mode === "add") {
        await api.post("/api/seller/products", { ...form, userId }, { params: { userId } });
      } else if (mode === "edit" && editProductId != null) {
        await api.put(`/api/seller/products/${editProductId}`, { ...form, userId }, { params: { userId } });
      }
      await fetchAll();
      setForm(emptyForm);
      setMode("add");
    } catch (err) {
      console.error("Error saving product:", err);
      setError("Failed to save product. Check required fields.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/api/seller/products/${productId}`, { params: { userId } });
      await fetchAll();
    } catch (err) {
      console.error("Error deleting product:", err);
      setError("Failed to delete product.");
    }
  };

  // ---------- render ----------
  return (
    <div className="seller-dashboard">
      {/* --- Header with Profile --- */}
      <div className="seller-dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Seller Dashboard</h1>
          <p>Overview of your own products, orders, and earnings.</p>
        </div>

        {profile && (
          <div style={{ position: "relative" }}>
            <div
              className="seller-profile-icon"
              onClick={() => setShowProfileDetails(!showProfileDetails)}
              style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            >
              <img
                src={profileImg}
                alt="Profile"
                style={{ width: "40px", height: "40px", borderRadius: "50%" }}
              />
              <span style={{ marginLeft: "8px" }}>Welcome, {profile.name}!</span>
            </div>

            {/* Profile details dropdown */}
            {showProfileDetails && (
              <div
                className="profile-dropdown"
                style={{
                  position: "absolute",
                  top: "50px",
                  right: 0,
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  zIndex: 100,
                  width: "200px",
                }}
              >
                <p><strong>Name:</strong> {profile.name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Phone:</strong> {profile.phone}</p>
                {/* <p><strong>Joined:</strong> {new Date(profile.joinedAt).toLocaleDateString()}</p> */}
              </div>
            )}
          </div>
        )}
      </div>
      {loading && <div className="seller-dashboard-loading">Loading...</div>}
      {error && <div className="seller-dashboard-error">{error}</div>}

        {/* <div className="seller-dashboard-actions">
          <button className="btn-primary" onClick={handleAddClick}>
            + Add Product
          </button>
        </div>
      </div>

      {loading && <div className="seller-dashboard-loading">Loading...</div>}
      {error && <div className="seller-dashboard-error">{error}</div>} */}

      {/* Stats */}
      <div className="seller-stats-grid">
        <div className="seller-stat-card">
          <div className="seller-stat-label">Today's Sales</div>
          <div className="seller-stat-value">{formatCurrency(stats.todaySales)}</div>
        </div>
        <div className="seller-stat-card">
          <div className="seller-stat-label">Total Orders</div>
          <div className="seller-stat-value">{stats.totalOrders}</div>
        </div>
        <div className="seller-stat-card">
          <div className="seller-stat-label">Active Products</div>
          <div className="seller-stat-value">{stats.activeProducts}</div>
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
                  name="productName"
                  value={form.productName}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                MRP
                <input
                  type="number"
                  name="productMrp"
                  value={form.productMrp}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                Price
                <input
                  type="number"
                  name="productPrice"
                  value={form.productPrice}
                  onChange={handleFormChange}
                  required
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  name="productQuantity"
                  value={form.productQuantity}
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
                productDescription
                <textarea
                  name="productDescription"
                  value={form.productDescription}
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
                      <tr key={o.order_id}>
                        <td>{o.order_id}</td>

                        <td>{o.orderDate}</td>
                        <td>{o.productName}</td>
                        <td>{formatCurrency(o.totalAmount)}</td>
                        <td>
                          {/* Only SHIPPED / DELIVERED selectable */}
                          <select
                            value={o.orderStatus}
                            onChange={(e) =>
                              handleOrderStatusChange(o.order_id, e.target.value)
                            }
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                          </select>

                        </td>
                        <td>{o.paymentStatus}</td>
                        <td>
                          <button
                            className="btn-small"
                            onClick={() => handleOrderStatusSave(o.order_id)}
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
