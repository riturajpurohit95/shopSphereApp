// src/pages/ProductDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ProductDetailsPage.css";
import api from "../api/axios";

const ProductDetailsPage = () => {
  const { productId } = useParams(); // from /product/:productId
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const storedUserId = localStorage.getItem("userId");
  const userId = storedUserId ? parseInt(storedUserId, 10) : null;
  const token = localStorage.getItem("token");

  // -------- Fetch product details --------
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get(`/products/${productId}`); // GET /api/products/{id}
        setProduct(res.data);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            "Failed to load product details. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // -------- Helpers --------
  const ensureLoggedIn = () => {
    if (!userId || !token) {
      alert("Please log in again to continue.");
      return false;
    }
    if (!product) return false;
    return true;
  };

  // 🔹 Get or create a cart, return cartId (for Add to Cart flow)
  const getOrCreateCartId = async () => {
    let res;
    let cartData;

    // 1️⃣ Try get existing cart
    res = await fetch(`http://localhost:8888/api/carts/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // 2️⃣ Create cart if not exists
      res = await fetch(`http://localhost:8888/api/carts/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create cart");
      }
    }

    cartData = await res.json();
    const cartId = cartData.cartId ?? cartData.id;
    if (!cartId) throw new Error("Cart id not available from server");

    return cartId;
  };

  const handleQtyChange = (newQty) => {
    if (newQty < 1) return;
    setQty(newQty);
  };

  const handleBack = () => {
    navigate("/UserDashBoard");
  };

  // -------- Add to Cart (normal cart, not buy now) --------
  const handleAddToCart = async () => {
    if (!ensureLoggedIn()) return;

    try {
      setAdding(true);
      setError("");

      const cartId = await getOrCreateCartId();
      const productIdToUse = product.product_id ?? product.productId;

      const payload = {
        cartId,
        productId: productIdToUse,
        quantity: qty,
      };

      const res = await fetch("http://localhost:8888/api/cart-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to add product to cart");
      }

      if (
        window.confirm("Item added to cart. Do you want to go to your cart?")
      ) {
        navigate("/cart");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.message || "Failed to add product to cart. Please try again."
      );
    } finally {
      setAdding(false);
    }
  };

  // -------- Buy Now (AMAZON STYLE: ONLY THIS PRODUCT) --------
  const handleBuyNow = () => {
    if (!ensureLoggedIn()) return;

    // ✅ Do NOT touch cart, just send this product + qty to checkout
    navigate("/order", {
      state: {
        buyNow: true,
        product,
        qty,
      },
    });
  };

  // -------- Price / Discount / Rating helpers --------
  const sellingPrice = Number(product?.productPrice ?? 0);
  const mrp = Number(product?.productMrp ?? 0);
  const hasDiscount = mrp > 0 && sellingPrice < mrp;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - sellingPrice) / mrp) * 100)
    : null;

  return (
    <div className="cart-page-wrapper">
      <div className="cart-card product-details-card">
        {loading && <p className="cart-info">Loading product details...</p>}
        {error && <p className="cart-error">{error}</p>}

        {!loading && !error && product && (
          <div className="product-details-layout">
            {/* LEFT: image */}
            <div className="product-image-box">
              {product.imageUrl ? (
                <img
                  src={
                    product.imageUrl.startsWith("http")
                      ? product.imageUrl
                      : `/images/products/${product.imageUrl}`
                  }
                  alt={product.productName}
                  className="product-image-main"
                />
              ) : (
                <div className="product-image-placeholder">
                  {product.productName?.[0] || "P"}
                </div>
              )}
            </div>

            {/* RIGHT: info */}
            <div className="product-info-box">
              <h1 className="product-title">
                {product.productName || "Product"}
              </h1>

              {/* price + mrp + discount */}
              <div className="product-price-section">
                <span className="price">
                  ₹{sellingPrice.toLocaleString("en-IN")}
                </span>
                {mrp > 0 && (
                  <span className="mrp">₹{mrp.toLocaleString("en-IN")}</span>
                )}
                {hasDiscount && (
                  <span className="discount">{discountPercent}% off</span>
                )}
              </div>

              {product.brand && (
                <p className="product-meta">
                  Brand: <span>{product.brand}</span>
                </p>
              )}

              <p className="product-meta">
                Rating:{" "}
                <span className="rating-value">
                  {Number(product.productAvgRating || 0).toFixed(1)} ★
                </span>{" "}
                <span className="rating-count">
                  ({product.productReviewsCount || 0} reviews)
                </span>
              </p>

              {product.productDescription && (
                <p className="product-description">
                  {product.productDescription}
                </p>
              )}

              <div className="product-actions">
                <div className="product-qty-control">
                  <span>Quantity</span>
                  <div className="cart-qty-box">
                    <button
                      className="qty-btn"
                      onClick={() => handleQtyChange(qty - 1)}
                    >
                      -
                    </button>
                    <span className="qty-value">{qty}</span>
                    <button
                      className="qty-btn"
                      onClick={() => handleQtyChange(qty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="product-buttons">
                  <button
                    className="btn-primary"
                    onClick={handleAddToCart}
                    disabled={adding}
                  >
                    {adding ? "Processing..." : "Add to Cart"}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleBuyNow}
                    disabled={adding}
                    style={{
                      background: "linear-gradient(135deg,#ff9f4b,#ff6a3d)",
                    }}
                  >
                    {adding ? "Processing..." : "Buy Now"}
                  </button>
                </div>

                <button className="btn-secondary" onClick={handleBack}>
                  Back to Products
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !product && (
          <p className="cart-info">Product not found.</p>
        )}
      </div>
    </div>
  );
};

export default ProductDetailsPage;
