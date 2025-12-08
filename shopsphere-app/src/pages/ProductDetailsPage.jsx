// src/pages/ProductDetailsPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./ProductDetailsPage.css";
import api from "../api/axios";

const ProductDetailsPage = () => {
  const { productId } = useParams(); // from /product/:productId
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [myReview, setMyReview] = useState(null);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const storedUserId = localStorage.getItem("userId");
  const userId = storedUserId ? parseInt(storedUserId, 10) : null;
  const token = localStorage.getItem("token");
  const isLoggedIn = !!(userId && token);

  const cameFromOrders = location.state?.from === "orders";

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

  // -------- Fetch reviews --------
  const normalizeReview = (r) => ({
    reviewId: r.reviewId ?? r.review_id,
    userId: r.userId ?? r.user_id,
    productId: r.productId ?? r.product_id,
    rating: r.rating,
    reviewText: r.reviewText ?? r.review_text,
    status: r.status,
    createdAt: r.createdAt ?? r.created_at,
    userName: r.userName ?? r.user_name ?? "User",
  });

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      setReviewsError("");

      const requests = [
        api.get(`/reviews/product/${productId}`), // all reviews for product
      ];

      if (isLoggedIn) {
        // user-specific review
        requests.push(
          api
            .get(`/reviews/user/${userId}/product/${productId}`)
            .catch((err) => {
              if (err.response && err.response.status === 404) {
                return { data: null };
              }
              throw err;
            })
        );
      }

      const [allRes, myRes] = await Promise.all(requests);
      const allData = Array.isArray(allRes.data)
        ? allRes.data.map(normalizeReview)
        : [];

      setReviews(allData);

      if (isLoggedIn && myRes) {
        const mineData = myRes.data;
        if (mineData) {
          const normalized = normalizeReview(mineData);
          setMyReview(normalized);
          setReviewRating(normalized.rating ?? 5);
          setReviewText(normalized.reviewText ?? "");
        } else {
          setMyReview(null);
          setReviewRating(5);
          setReviewText("");
        }
      }
    } catch (err) {
      console.error(err);
      setReviewsError(
        err.response?.data?.message || "Failed to load reviews. Please try again."
      );
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isLoggedIn]);

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
    if (cameFromOrders) {
      navigate("/my-orders");
    } else {
      navigate("/UserDashBoard");
    }
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

  // -------- Submit Review --------
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!ensureLoggedIn()) return;

    if (!reviewRating) {
      alert("Please select a rating.");
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewsError("");

      const payload = {
        userId,
        productId: product.productId ?? product.product_id,
        rating: reviewRating,
        reviewText: reviewText.trim(),
      };

      if (myReview && myReview.reviewId) {
        // update existing
        await api.put(`/reviews/${myReview.reviewId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // create new
        await api.post(`/reviews`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      await fetchReviews();

      // optional: refresh product rating/count
      try {
        const res = await api.get(`/products/${productId}`);
        setProduct(res.data);
      } catch (inner) {
        console.warn("Failed to refresh product rating after review", inner);
      }

      setReviewFormOpen(false);
    } catch (err) {
      console.error(err);
      setReviewsError(
        err.response?.data?.message ||
          "Failed to submit review. Please try again."
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  // -------- Price / Discount / Rating helpers --------
  const sellingPrice = Number(product?.productPrice ?? 0);
  const mrp = Number(product?.productMrp ?? 0);
  const hasDiscount = mrp > 0 && sellingPrice < mrp;
  const discountPercent = hasDiscount
    ? Math.round(((mrp - sellingPrice) / mrp) * 100)
    : null;

  const formatReviewDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="cart-page-wrapper">
      <div className="cart-card product-details-card">
        {loading && <p className="cart-info">Loading product details...</p>}
        {error && <p className="cart-error">{error}</p>}

        {!loading && !error && product && (
          <>
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
                    <span className="mrp">
                      ₹{mrp.toLocaleString("en-IN")}
                    </span>
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
                        background:
                          "linear-gradient(135deg,#ff9f4b,#ff6a3d)",
                      }}
                    >
                      {adding ? "Processing..." : "Buy Now"}
                    </button>
                  </div>

                  <button className="btn-secondary" onClick={handleBack}>
                    {cameFromOrders ? "Back to My Orders" : "Back to Products"}
                  </button>
                </div>
              </div>
            </div>

            {/* REVIEWS SECTION */}
            <div className="product-reviews-section">
              <h2 className="reviews-heading">Customer Reviews</h2>

              {reviewsLoading && (
                <p className="cart-info">Loading reviews...</p>
              )}
              {reviewsError && (
                <p className="cart-error">{reviewsError}</p>
              )}

              {isLoggedIn && (
                <div className="my-review-box">
                  <p className="my-review-summary">
                    {myReview
                      ? "You have already reviewed this product."
                      : "Have you purchased this item? Share your experience."}
                  </p>

                  {!reviewFormOpen && (
                    <button
                      className="btn-primary"
                      style={{ padding: "7px 16px", fontSize: "0.9rem" }}
                      onClick={() => setReviewFormOpen(true)}
                    >
                      {myReview ? "Edit your review" : "Write a review"}
                    </button>
                  )}

                  {reviewFormOpen && (
                    <form
                      className="review-form"
                      onSubmit={handleSubmitReview}
                    >
                      <div className="review-rating-select">
                        <span>Rating:</span>
                        <select
                          value={reviewRating}
                          onChange={(e) =>
                            setReviewRating(Number(e.target.value))
                          }
                        >
                          <option value={5}>5 - Excellent</option>
                          <option value={4}>4 - Good</option>
                          <option value={3}>3 - Average</option>
                          <option value={2}>2 - Poor</option>
                          <option value={1}>1 - Very Bad</option>
                        </select>
                      </div>

                      <textarea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Describe your experience with this product..."
                      />

                      <div className="review-form-actions">
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={submittingReview}
                        >
                          {submittingReview ? "Saving..." : "Save review"}
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setReviewFormOpen(false);
                            if (!myReview) {
                              setReviewRating(5);
                              setReviewText("");
                            } else {
                              setReviewRating(myReview.rating ?? 5);
                              setReviewText(myReview.reviewText ?? "");
                            }
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {!reviewsLoading && reviews.length === 0 && (
                <p className="cart-info">
                  No reviews yet. Be the first to review this product!
                </p>
              )}

              {!reviewsLoading && reviews.length > 0 && (
                <div className="reviews-list">
                  {reviews.map((rev) => (
                    <div key={rev.reviewId} className="review-card">
                      <div className="review-header">
                        <div>
                          <p className="review-author">{rev.userName}</p>
                          <p className="review-date">
                            {formatReviewDate(rev.createdAt)}
                          </p>
                        </div>
                        <div className="review-rating">
                          {rev.rating} ★
                        </div>
                      </div>
                      {rev.reviewText && (
                        <p className="review-text">{rev.reviewText}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!loading && !error && !product && (
          <p className="cart-info">Product not found.</p>
        )}
      </div>
    </div>
  );
};

export default ProductDetailsPage;

