// src/UpiPaymentPage.jsx
import React, { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./CartPage.css";
import api from '../api/axios';
import upiQr from "../images/Logo_1.png"; // make sure file exists here

const UpiPaymentPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const order = location.state?.order;

  const handleConfirmPayment = async () => {
    setError("");
    try {
      setLoading(true);

      // PUT /api/orders/{id}/payment-status?status=PAID
      await api.put(`/orders/${orderId}/payment-status`, null, {
        params: { status: "PAID" },
      });

      navigate("/order-success", {
        state: {
          orderId,
          paymentMethod: "UPI",
        },
      });
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to confirm payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const amount = order?.totalAmount
    ? Number(order.totalAmount)
    : null;

  return (
    <div className="cart-page-wrapper">
      <div className="cart-card upi-card">
        <h1 className="cart-heading">Scan &amp; Pay</h1>
        <p className="cart-sub">
          Scan this QR using any UPI app and complete the payment.
        </p>

        <div className="upi-content">
          <div className="upi-qr-wrapper">
            <img src={upiQr} alt="UPI QR code" className="upi-qr" />
          </div>

          <div className="upi-details">
            <p>UPI ID</p>
            <p className="upi-id">shopsphere@upi</p>
            {amount !== null && (
              <p className="upi-amount">
                Amount:{" "}
                <strong>
                  ₹{amount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </p>
            )}
            <p className="upi-note">
              After completing the payment in your UPI app, click the button
              below.
            </p>
          </div>
        </div>

        {error && <p className="cart-error">{error}</p>}

        <button
          className="btn-checkout"
          onClick={handleConfirmPayment}
          disabled={loading}
        >
          {loading ? "Confirming..." : "I have completed the payment"}
        </button>
      </div>
    </div>
  );
};

export default UpiPaymentPage;