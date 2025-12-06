// src/CheckoutPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CartPage.css";
import api from "../api/axios";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 👇 Data passed from Buy Now (if any)
  const buyNowState = location.state;
  const isBuyNow = !!buyNowState?.buyNow && !!buyNowState?.product;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placingOrder, setPlacingOrder] = useState(false);

  const userId = Number(localStorage.getItem("userId"));
  const token = localStorage.getItem("token");

  // -------- Fetch Cart Items (only for normal checkout) --------
  const fetchCartItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `http://localhost:8888/api/carts/userCart/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to fetch cart items");

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -------- Decide mode: Buy Now vs Cart --------
  useEffect(() => {
    if (isBuyNow) {
      // 👉 Build a single "virtual" item from product
      const p = buyNowState.product;
      const qty = buyNowState.qty ?? 1;
      const price = Number(p.productPrice ?? p.price ?? 0);

      const singleItem = {
        cartItemsId: `buynow-${p.product_id ?? p.productId ?? "x"}`,
        productName: p.productName ?? p.name ?? "Product",
        productPrice: price,
        quantity: qty,
      };

      setItems([singleItem]);
      setLoading(false);
    } else {
      // normal cart checkout
      fetchCartItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBuyNow, userId]);

  // -------- Total --------
  const totalAmount = items.reduce((sum, item) => {
    const price = Number(item.productPrice ?? 0);
    const qty = item.quantity ?? 1;
    return sum + price * qty;
  }, 0);

  // -------- Place Order --------
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    // phone: 10 digits
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    // pincode: 6 digits
    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(pincode)) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    // SUPER SHORT address, safe for DB
    const shippingAddress = `${city}-${pincode}`;

    const payload = {
      userId,
      totalAmount,
      shippingAddress,
      orderStatus: "PENDING",
      paymentMethod,
      razorpayOrderId: null,
    };

    try {
      setPlacingOrder(true);

      const res = await api.post("/orders", payload);
      const order = res.data;

      const orderId = order.orderId ?? order.order_id ?? order.id;
      if (!orderId) throw new Error("Order ID missing");

      if (paymentMethod === "COD") {
        navigate("/orderSuccess", {
          state: { orderId, paymentMethod: "COD", order },
        });
      } else {
        navigate(`/payment/upi/${orderId}`, { state: { order } });
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to place order. Please try again."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="cart-page-wrapper">
      <div className="cart-card checkout-card">
        <h1 className="cart-heading">Checkout</h1>
        <p className="cart-sub">
          {isBuyNow
            ? "Complete your purchase for this item"
            : "Review your cart and place your order"}
        </p>

        {error && <p className="cart-error">{error}</p>}
        {loading && <p className="cart-info">Loading...</p>}

        {!loading && !isBuyNow && items.length === 0 && (
          <p className="cart-info">Your cart is empty.</p>
        )}

        {!loading && items.length > 0 && (
          <div className="checkout-layout">
            {/* LEFT FORM */}
            <form className="checkout-form" onSubmit={handlePlaceOrder}>
              <h2 className="section-heading">Shipping Details</h2>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Diya Singla"
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Chandigarh"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="Chandigarh"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="160047"
                    required
                  />
                </div>
              </div>

              <h2 className="section-heading">Payment Method</h2>
              <div className="payment-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                  />
                  Cash on Delivery
                </label>

                <label className="radio-option">
                  <input
                    type="radio"
                    value="UPI"
                    checked={paymentMethod === "UPI"}
                    onChange={() => setPaymentMethod("UPI")}
                  />
                  UPI (Scan & Pay)
                </label>
              </div>

              <button className="btn-checkout" disabled={placingOrder}>
                {placingOrder
                  ? "Placing Order..."
                  : paymentMethod === "COD"
                  ? "Place Order"
                  : "Proceed to Pay"}
              </button>
            </form>

            {/* RIGHT SUMMARY */}
            <div className="checkout-summary">
              <h2 className="section-heading">Order Summary</h2>

              <div className="cart-items-box summary-box">
                {items.map((item) => {
                  const price = Number(item.productPrice ?? 0);
                  const qty = item.quantity ?? 1;
                  const lineTotal = price * qty;

                  return (
                    <div className="cart-row summary-row" key={item.cartItemsId}>
                      <span className="cart-product-name">
                        {item.productName}
                      </span>

                      <span className="summary-math">
                        {qty} × ₹{price.toLocaleString("en-IN")}
                      </span>

                      <span className="summary-total">
                        = ₹{lineTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}

                <div className="cart-row cart-total summary-total-row">
                  <span className="cart-total-label">Total</span>
                  <span></span>
                  <span>₹{totalAmount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;

