// src/OrderSuccess.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CartPage.css";
import "./ProductDetailsPage.css"; // reuse same theme
import api from "../api/axios";

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const order = location.state?.order;
  const orderId =
    location.state?.orderId ||
    order?.order_id ||
    order?.orderId ||
    order?.id;

  const paymentMethod =
    location.state?.paymentMethod || order?.paymentMethod || "COD";

  // 🔹 Recommended products (CATEGORY ONLY)
  const [recommended, setRecommended] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");

  useEffect(() => {
    const fetchRecommended = async () => {
      try {
        setRecLoading(true);
        setRecError("");

        // 1️⃣ Get all products from backend
        const res = await api.get("/products");
        const all = Array.isArray(res.data) ? res.data : [];
        if (!all.length) {
          setRecommended([]);
          return;
        }

        // 2️⃣ Collect productIds from this order (from multiple possible shapes)
        const orderedIds = new Set();

        // ✅ MERGE all possible item lists instead of using `||`
        const possibleItems = [
          ...(Array.isArray(order?.items) ? order.items : []),
          ...(Array.isArray(order?.orderItems) ? order.orderItems : []),
          ...(Array.isArray(order?.cartItems) ? order.cartItems : []),
          ...(Array.isArray(location.state?.products)
            ? location.state.products
            : []),
        ];

        possibleItems.forEach((item) => {
          if (!item) return;

          const nestedProduct = item.product || item.productDto || null;

          const id =
            nestedProduct?.productId ??
            nestedProduct?.product_id ??
            item.productId ??
            item.product_id ??
            item.id ??
            null;

          if (id != null) orderedIds.add(id);
        });

        // ❗ If we don't even know which products were ordered, just stop
        if (orderedIds.size === 0) {
          setRecommended([]);
          return;
        }

        // 3️⃣ Derive categories from the master products list using orderedIds
        const orderedCategories = new Set();

        const orderedProducts = all.filter((p) =>
          orderedIds.has(p.productId ?? p.product_id)
        );

        orderedProducts.forEach((p) => {
          const cat = p.categoryId ?? p.category_id ?? null;
          if (cat != null) orderedCategories.add(cat);
        });

        // If we still have no categories, better to show no recos than random
        if (orderedCategories.size === 0) {
          setRecommended([]);
          return;
        }

        // 4️⃣ Candidates = products in SAME CATEGORY, not already ordered
        let candidates = all.filter((p) => {
          const id = p.productId ?? p.product_id;
          if (!id || orderedIds.has(id)) return false;

          const cat = p.categoryId ?? p.category_id;
          return orderedCategories.has(cat);
        });

        if (!candidates.length) {
          setRecommended([]);
          return;
        }

        // 5️⃣ Sort: higher discount → lower price → name A–Z
        candidates.sort((a, b) => {
          const priceA = Number(a.productPrice) || 0;
          const priceB = Number(b.productPrice) || 0;
          const mrpA = Number(a.productMrp) || 0;
          const mrpB = Number(b.productMrp) || 0;

          const discA = mrpA ? ((mrpA - priceA) / mrpA) * 100 : 0;
          const discB = mrpB ? ((mrpB - priceB) / mrpB) * 100 : 0;

          if (discB !== discA) return discB - discA;
          if (priceA !== priceB) return priceA - priceB;
          return (a.productName || "").localeCompare(b.productName || "");
        });

        setRecommended(candidates.slice(0, 4)); // show up to 4
      } catch (err) {
        console.error(err);
        setRecError(
          err.response?.data?.message ||
            "Failed to load recommendations. Please try again."
        );
      } finally {
        setRecLoading(false);
      }
    };

    fetchRecommended();
  }, [order, location.state]);

  // 👇 new: just a small flag for layout
  const isSingleRecommendation = recommended.length === 1;

  return (
    <div className="cart-page-wrapper">
      {/* SINGLE CARD: success + recommendations */}
      <div className="cart-card product-details-card success-card">
        <div className="success-icon-circle">✓</div>

        <h1 className="product-title" style={{ textAlign: "center" }}>
          Order Placed Successfully 🎉
        </h1>

        {orderId && (
          <p className="cart-sub success-subtext">
            Your Order ID is <strong>#{orderId}</strong>.
          </p>
        )}

        <p className="cart-sub success-subtext">
          Payment method:{" "}
          <strong>
            {paymentMethod === "UPI" ? "UPI" : "Cash on Delivery"}
          </strong>
        </p>

        <p className="cart-sub success-subtext">
          You can track this order and leave a review from{" "}
          <strong>My Orders</strong>.
        </p>

        <div className="success-actions">
          <button
            className="btn-checkout"
            onClick={() => navigate("/UserDashBoard")}
          >
            Go to Dashboard
          </button>

          <button
            className="btn-secondary"
            onClick={() => navigate("/my-orders")}
          >
            View My Orders
          </button>
        </div>

        {/* Divider */}
        <hr
          style={{
            margin: "24px 0",
            border: "none",
            borderTop: "1px solid #eee",
          }}
        />

        {/* RECOMMENDATIONS SECTION */}
        <h2 className="reviews-heading" style={{ marginBottom: "12px" }}>
          You might also like
        </h2>

        {recLoading && (
          <p className="cart-info">Loading recommendations...</p>
        )}
        {recError && <p className="cart-error">{recError}</p>}

        {!recLoading && !recError && recommended.length === 0 && (
          <p className="cart-info">
            No recommendations available right now.
          </p>
        )}

        {!recLoading && recommended.length > 0 && (
          <div
            className="similar-products-grid"
            style={{
              display: isSingleRecommendation ? "flex" : "grid",
              justifyContent: isSingleRecommendation ? "center" : "stretch",
              gridTemplateColumns: isSingleRecommendation
                ? undefined
                : "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginTop: "8px",
            }}
          >
            {recommended.map((p) => {
              const id = p.productId ?? p.product_id;
              const price = Number(p.productPrice) || 0;
              const mrp = Number(p.productMrp) || 0;
              const hasDisc = mrp > 0 && price < mrp;
              const disc = hasDisc
                ? Math.round(((mrp - price) / mrp) * 100)
                : null;

              return (
                <div
                  key={id}
                  className="similar-product-card"
                  style={{
                    cursor: "pointer",
                    borderRadius: "12px",
                    border: "1px solid #eee",
                    padding: "10px",
                    background: "#fff",
                    boxShadow: "0 3px 10px rgba(15,23,42,0.03)",
                    // 👇 Only constrain width when there is a single card
                    maxWidth: isSingleRecommendation ? "320px" : "none",
                    width: isSingleRecommendation ? "100%" : "auto",
                  }}
                  onClick={() =>
                    navigate(`/product/${id}`, {
                      state: { from: "orders" },
                    })
                  }
                >
                  <div
                    className="similar-product-image-box"
                    style={{
                      width: "100%",
                      height: "150px",
                      borderRadius: "10px",
                      overflow: "hidden",
                      marginBottom: "8px",
                    }}
                  >
                    {p.imageUrl ? (
                      <img
                        src={
                          p.imageUrl.startsWith("http")
                            ? p.imageUrl
                            : `/images/products/${p.imageUrl}`
                        }
                        alt={p.productName}
                        className="similar-product-image"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div className="product-image-placeholder">
                        {p.productName?.[0] || "P"}
                      </div>
                    )}
                  </div>
                  <div className="similar-product-info">
                    <p
                      className="similar-product-title"
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        marginBottom: "2px",
                      }}
                    >
                      {p.productName}
                    </p>
                    {p.brand && (
                      <p
                        className="similar-product-brand"
                        style={{
                          fontSize: "0.8rem",
                          color: "#6b7280",
                          marginBottom: "4px",
                        }}
                      >
                        {p.brand}
                      </p>
                    )}
                    <p
                      className="similar-product-price-row"
                      style={{ fontSize: "0.9rem" }}
                    >
                      <span className="price">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      {mrp > 0 && (
                        <span
                          className="mrp"
                          style={{
                            marginLeft: "6px",
                            textDecoration: "line-through",
                            color: "#9ca3af",
                            fontSize: "0.8rem",
                          }}
                        >
                          ₹{mrp.toLocaleString("en-IN")}
                        </span>
                      )}
                      {disc != null && disc > 0 && (
                        <span
                          className="discount"
                          style={{
                            marginLeft: "6px",
                            color: "#16a34a",
                            fontSize: "0.8rem",
                            fontWeight: 600,
                          }}
                        >
                          {disc}% off
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderSuccess;

