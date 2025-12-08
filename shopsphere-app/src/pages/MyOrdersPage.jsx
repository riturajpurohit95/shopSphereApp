


// src/pages/MyOrdersPage.jsx
/*import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CartPage.css"; // reuse same card styles

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = Number(localStorage.getItem("userId"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      const txt = await res.text();
      return { __raw: txt };
    }
  };

  const fetchOrders = async () => {
    if (!userId) {
      setError("User not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `http://localhost:8888/api/orders/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 404) {
        setOrders([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to load orders");
      }

      const data = await safeJson(res);
      const list = Array.isArray(data) ? data : [];

      const normalized = list
        .map((o) => ({
          orderId: o.order_id ?? o.orderId,
          totalAmount: o.totalAmount ?? o.total_amount ?? 0,
          orderStatus: (o.orderStatus ?? o.order_status ?? "PENDING").toUpperCase(),
          paymentMethod: o.paymentMethod ?? o.payment_method ?? "",
          paymentStatus: (o.paymentStatus ?? o.payment_status ?? "PENDING").toUpperCase(),
          placedAt: o.placedAt ?? o.placed_at ?? null,
          items: o.items ?? [],
        }))
        .filter((o) => o.orderId != null);

      // newest first
      normalized.sort((a, b) => {
        const da = a.placedAt ? new Date(a.placedAt).getTime() : 0;
        const db = b.placedAt ? new Date(b.placedAt).getTime() : 0;
        return db - da;
      });

      setOrders(normalized);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const formatDateTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatMoney = (v) =>
    Number(v ?? 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });

  const getStatusClass = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "PENDING")
      return "bg-yellow-100 text-yellow-700 border border-yellow-300";
    if (s === "CANCELLED" || s === "REFUNDED")
      return "bg-red-100 text-red-700 border border-red-300";
    if (s === "DELIVERED" || s === "PAID")
      return "bg-green-100 text-green-700 border border-green-300";
    if (s === "FAILED")
      return "bg-gray-100 text-gray-700 border border-gray-300";
    return "bg-gray-100 text-gray-700 border border-gray-300";
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      const res = await fetch(
        `http://localhost:8888/api/orders/${orderId}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to cancel order");
      }

      // refresh orders after cancel
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to cancel order");
    }
  };

  const handleReviewProduct = (order, item) => {
    const productId = item.productId ?? item.product_id;
    if (!productId) {
      alert("Product information not available for review.");
      return;
    }

    navigate(`/product/${productId}`, {
      state: {
        from: "orders",
        orderId: order.orderId,
      },
    });
  };

  return (
    <div className="cart-page-wrapper">
      <div className="cart-card">
        <h1 className="cart-heading">My Orders</h1>
        <p className="cart-sub">Track and review all your orders</p>

        {loading && <p className="cart-info">Loading orders...</p>}
        {error && <p className="cart-error">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="cart-info">You have not placed any orders yet.</p>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="orders-list space-y-4 mt-4">
            {orders.map((order) => (
              <div
                key={order.orderId}
                className="border border-gray-200 rounded-lg p-4 mb-3"
              >
                
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <div>
                    <p className="text-sm text-gray-500">
                      Order ID:{" "}
                      <span className="font-semibold">#{order.orderId}</span>
                    </p>
                    {order.placedAt && (
                      <p className="text-xs text-gray-400">
                        Placed on {formatDateTime(order.placedAt)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full " +
                        getStatusClass(order.orderStatus)
                      }
                    >
                      {order.orderStatus}
                    </span>
                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full " +
                        getStatusClass(order.paymentStatus)
                      }
                    >
                      {order.paymentStatus}
                    </span>
                    <p className="text-sm">
                      <span className="text-gray-500 mr-1">Total:</span>
                      <span className="font-semibold">
                        ₹ {formatMoney(order.totalAmount)}
                      </span>
                    </p>
                    {order.paymentMethod && (
                      <p className="text-xs text-gray-500">
                        Payment: {order.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>

                
                {order.items && order.items.length > 0 && (
                  <div className="mt-2 border-t border-gray-100 pt-2 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={
                          item.orderItemsId ??
                          `${order.orderId}-${item.productId ?? item.product_id}`
                        }
                        className="flex flex-wrap justify-between items-center gap-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity} • ₹
                            {Number(item.unitPrice ?? 0).toLocaleString("en-IN")}
                          </p>
                        </div>

                        {order.orderStatus === "DELIVERED" && (
                          <button
                            className="px-3 py-1 text-xs rounded-full border border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleReviewProduct(order, item)}
                          >
                            Review Product
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

             
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    className="px-3 py-1 text-sm rounded-full border border-red-400 text-red-600 hover:bg-red-50"
                    onClick={() => handleCancel(order.orderId)}
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;*/
// src/pages/MyOrdersPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CartPage.css"; // reuse same card styles

const MyOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userId = Number(localStorage.getItem("userId"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      const txt = await res.text();
      return { __raw: txt };
    }
  };

  const fetchOrders = async () => {
    if (!userId) {
      setError("User not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `http://localhost:8888/api/orders/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.status === 404) {
        setOrders([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to load orders");
      }

      const data = await safeJson(res);
      const list = Array.isArray(data) ? data : [];

      const normalized = list
        .map((o) => ({
          orderId: o.order_id ?? o.orderId,
          totalAmount: o.totalAmount ?? o.total_amount ?? 0,
          orderStatus: (o.orderStatus ?? o.order_status ?? "PENDING").toUpperCase(),
          paymentMethod: o.paymentMethod ?? o.payment_method ?? "",
          paymentStatus: (o.paymentStatus ?? o.payment_status ?? "PENDING").toUpperCase(),
          placedAt: o.placedAt ?? o.placed_at ?? null,
          items: o.items ?? [],
        }))
        .filter((o) => o.orderId != null);

      // newest first
      normalized.sort((a, b) => {
        const da = a.placedAt ? new Date(a.placedAt).getTime() : 0;
        const db = b.placedAt ? new Date(b.placedAt).getTime() : 0;
        return db - da;
      });

      setOrders(normalized);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [userId]);

  const formatDateTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatMoney = (v) =>
    Number(v ?? 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });

  const getStatusClass = (status) => {
    const s = (status || "").toUpperCase();
    if (s === "PENDING")
      return "bg-yellow-100 text-yellow-700 border border-yellow-300";
    if (s === "CANCELLED" || s === "REFUNDED")
      return "bg-red-100 text-red-700 border border-red-300";
    if (s === "DELIVERED" || s === "PAID")
      return "bg-green-100 text-green-700 border border-green-300";
    if (s === "FAILED")
      return "bg-gray-100 text-gray-700 border border-gray-300";
    return "bg-gray-100 text-gray-700 border border-gray-300";
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      const res = await fetch(
        `http://localhost:8888/api/orders/${orderId}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to cancel order");
      }

      // refresh orders after cancel
      await fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to cancel order");
    }
  };

  // ⭐ Review Product: same pattern as ProductDetails / OrderSuccess
  const handleReviewProduct = (order, item) => {
    const productId = item.productId ?? item.product_id;
    if (!productId) {
      alert("Product information not available for review.");
      return;
    }

    navigate(`/product/${productId}`, {
      state: {
        from: "orders",
        orderId: order.orderId,
      },
    });
  };

  return (
    <div className="cart-page-wrapper">
      <div className="cart-card">
        <h1 className="cart-heading">My Orders</h1>
        <p className="cart-sub">Track and review all your orders</p>

        {loading && <p className="cart-info">Loading orders...</p>}
        {error && <p className="cart-error">{error}</p>}
        {!loading && !error && orders.length === 0 && (
          <p className="cart-info">You have not placed any orders yet.</p>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="orders-list space-y-4 mt-4">
            {orders.map((order) => (
              <div
                key={order.orderId}
                className="border border-gray-200 rounded-lg p-4 mb-3"
              >
                {/* Top row: summary */}
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <div>
                    <p className="text-sm text-gray-500">
                      Order ID:{" "}
                      <span className="font-semibold">#{order.orderId}</span>
                    </p>
                    {order.placedAt && (
                      <p className="text-xs text-gray-400">
                        Placed on {formatDateTime(order.placedAt)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full " +
                        getStatusClass(order.orderStatus)
                      }
                    >
                      {order.orderStatus}
                    </span>
                    <span
                      className={
                        "text-xs px-2 py-1 rounded-full " +
                        getStatusClass(order.paymentStatus)
                      }
                    >
                      {order.paymentStatus}
                    </span>
                    <p className="text-sm">
                      <span className="text-gray-500 mr-1">Total:</span>
                      <span className="font-semibold">
                        ₹ {formatMoney(order.totalAmount)}
                      </span>
                    </p>
                    {order.paymentMethod && (
                      <p className="text-xs text-gray-500">
                        Payment: {order.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>

                {/* Order items + Review buttons */}
                {order.items && order.items.length > 0 && (
                  <div className="mt-2 border-t border-gray-100 pt-2 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={
                          item.orderItemsId ??
                          `${order.orderId}-${item.productId ?? item.product_id}`
                        }
                        className="flex flex-wrap justify-between items-center gap-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {item.productName}
                          </p>
                          <p className="text-xs text-gray-500">
                            Qty: {item.quantity} • ₹
                            {Number(item.unitPrice ?? 0).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>

                        {order.orderStatus === "DELIVERED" && (
                          <button
                            className="px-3 py-1 text-xs rounded-full border border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleReviewProduct(order, item)}
                          >
                            Review Product
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    className="px-3 py-1 text-sm rounded-full border border-red-400 text-red-600 hover:bg-red-50"
                    onClick={() => handleCancel(order.orderId)}
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrdersPage;
