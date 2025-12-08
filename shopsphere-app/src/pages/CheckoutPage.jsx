// src/CheckoutPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./CartPage.css";
import api from "../api/axios";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const buyNowState = location.state;
  const isBuyNow = !!buyNowState?.buyNow && !!buyNowState?.product;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationId, setLocationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [placingOrder, setPlacingOrder] = useState(false);

  const userId = Number(localStorage.getItem("userId"));
  const token = localStorage.getItem("token");

  // Auto-fill user details
  useEffect(() => {
    const storedName = localStorage.getItem("userName");
    const storedPhone = localStorage.getItem("userPhone");
    const storedLocationId = localStorage.getItem("locationId");

    if (storedName) setName(storedName);
    if (storedPhone) setPhone(storedPhone);
    if (storedLocationId) setLocationId(Number(storedLocationId));
  }, []);

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

      // Ensure productId and quantity exist
      const sanitizedItems = (Array.isArray(data) ? data : []).map((item) => ({
        productId: item.productId ?? item.product_id,
        productName: item.productName ?? item.name ?? "Product",
        productPrice: Number(item.productPrice ?? item.price ?? 0),
        quantity: item.quantity ?? 1,
      }));

      setItems(sanitizedItems);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isBuyNow) {
      const p = buyNowState.product;
      const qty = buyNowState.qty ?? 1;
      const price = Number(p.productPrice ?? p.price ?? 0);

      const singleItem = {
        productId: p.product_id ?? p.productId,
        productName: p.productName ?? p.name ?? "Product",
        productPrice: price,
        quantity: qty,
      };

      setItems([singleItem]);
      setLoading(false);
    } else {
      fetchCartItems();
    }
  }, [isBuyNow, userId]);

  const totalAmount = items.reduce(
    (sum, item) => sum + item.productPrice * item.quantity,
    0
  );

  const cityOptions = [
    { id: 1, name: "Chandigarh", code: 20 },
    { id: 2, name: "Jaipur", code: 40 },
    { id: 3, name: "Pune", code: 60 },
    { id: 4, name: "Banglore", code: 80 },
  ];

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (!locationId) {
      setError("Please select a city.");
      return;
    }

    const selectedCity = cityOptions.find(
      (c) => c.id === Number(locationId)
    );
    const shippingAddress = `${selectedCity.name}-${selectedCity.code}`;

    const payload = {
      userId,
      shippingAddress,
      paymentMethod,
      orderStatus: "PENDING",
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    try {
      setPlacingOrder(true);

      const res = await api.post("/orders/create", payload);
      const order = res.data;

      const orderId = order.orderId ?? order.order_id ?? order.id;
      if (!orderId) throw new Error("Order ID missing");

      if (paymentMethod === "COD") {
        navigate("/order-success", {
          state: { orderId, paymentMethod: "COD", order, products: items },
        });
      } else {
        // 🔹 UPI: also send items so we can recommend later
        navigate(`/payment/upi/${orderId}`, {
          state: { orderId, paymentMethod: "UPI", order, products: items },
        });
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

        {!loading && items.length > 0 && (
          <div className="checkout-layout">
            <form className="checkout-form" onSubmit={handlePlaceOrder}>
              <h2 className="section-heading">Shipping Details</h2>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={phone} disabled />
              </div>

              <div className="form-group">
                <label>City</label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                >
                  <option value="">Select City</option>
                  {cityOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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

            <div className="checkout-summary">
              <h2 className="section-heading">Order Summary</h2>

              <div className="cart-items-box summary-box">
                {items.map((item, idx) => (
                  <div className="cart-row summary-row" key={idx}>
                    <span className="cart-product-name">
                      {item.productName}
                    </span>
                    <span className="summary-math">
                      {item.quantity} × ₹{item.productPrice}
                    </span>
                    <span className="summary-total">
                      = ₹{item.quantity * item.productPrice}
                    </span>
                  </div>
                ))}

                <div className="cart-row cart-total summary-total-row">
                  <span className="cart-total-label">Total</span>
                  <span></span>
                  <span>₹{totalAmount}</span>
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
