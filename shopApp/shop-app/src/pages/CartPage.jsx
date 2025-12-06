// src/pages/CartPage.jsx
import React, { useEffect, useState } from "react";

// ---------------- Toast Component ----------------
const Toast = ({ message, type }) => (
  <div
    className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg text-sm z-40 ${
      type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"
    }`}
  >
    {message}
  </div>
);

const CartPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartExists, setCartExists] = useState(true);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 2500);
  };

  const storedUserId = localStorage.getItem("userId");
  const storedRole = localStorage.getItem("role");
  const userId = storedUserId ? parseInt(storedUserId, 10) : null;
  const token = localStorage.getItem("token");

  // ---------------- useEffect ----------------
  useEffect(() => {
    if (!userId) {
      setError("User not found. Please login again.");
      setLoading(false);
      return;
    }

    if (storedRole !== "BUYER") {
      setError("Only buyers have a cart.");
      setLoading(false);
      return;
    }

    checkCartExists();
  }, [userId, storedRole]);

  // ---------------- API: Check if cart exists ----------------
  const checkCartExists = async () => {
    try {
      const res = await fetch(
        `http://localhost:8888/api/carts/exists/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      const exists = typeof data === "boolean" ? data : data?.exists ?? false;

      setCartExists(exists);

      if (exists) fetchCartItems();
      else setLoading(false);
    } catch (err) {
      setError("Failed to check cart existence");
      setLoading(false);
    }
  };

  // ---------------- API: Fetch cart items ----------------
  const fetchCartItems = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        `http://localhost:8888/api/carts/userCart/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to fetch cart items");

      const data = await res.json();

      const itemsArray = Array.isArray(data)
        ? data
        : Array.isArray(data.cartItems)
        ? data.cartItems
        : [];

      setItems(itemsArray);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- API: Create new cart ----------------
  const handleCreateCart = async () => {
    try {
      await fetch(`http://localhost:8888/api/carts/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setCartExists(true);
      showToast("Cart created successfully!");
      fetchCartItems();
    } catch (err) {
      showToast("Failed to create cart", "error");
    }
  };

  // ---------------- API: Remove cart item ----------------
  const handleRemove = async (cartItemId) => {
    try {
      const res = await fetch(
        `http://localhost:8888/api/cart-items/${cartItemId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to delete item");

      showToast("Item removed from cart");
      fetchCartItems();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ---------------- API: Update quantity ----------------
  const handleQuantityChange = async (cartItemId, newQty) => {
    if (newQty < 1) return;

    try {
      const res = await fetch(
        `http://localhost:8888/api/cart-items/${cartItemId}/quantity/${newQty}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Failed to update quantity");

      showToast("Quantity updated");
      fetchCartItems();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ---------------- Move item to wishlist ----------------
  const handleMoveToWishlist = async (item) => {
    try {
      const productId = item.productId ?? item.product_id;
      const cartItemId = item.cartItemId ?? item.cartItemsId;

      if (!productId) throw new Error("Product ID missing");
      if (!cartItemId) throw new Error("Cart Item ID missing");

      // Check if wishlist exists
      const existsRes = await fetch(
        `http://localhost:8888/api/wishlist/exists`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const existsData = await existsRes.json();
      const exists =
        typeof existsData === "boolean" ? existsData : existsData?.exists ?? false;

      let wishlistId;

      if (!exists) {
        // Create new wishlist
        const createRes = await fetch(`http://localhost:8888/api/wishlist`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        const created = await createRes.json();
        wishlistId = created.wishlistId ?? created.id;
      } else {
        // Get existing wishlist
        const myRes = await fetch(`http://localhost:8888/api/wishlist/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const my = await myRes.json();
        wishlistId = my.wishlistId ?? my.id;
      }

      if (!wishlistId) throw new Error("Wishlist ID missing");

      // Add to wishlist
      await fetch(`http://localhost:8888/api/wishlist-items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wishlistId, productId }),
      });

      // Remove from cart
      await handleRemove(cartItemId);

      showToast(`"${item.productName}" moved to wishlist`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // ---------------- Total Calculation ----------------
  const total = items.reduce((sum, item) => {
    const price = item.productPrice ?? 0;
    const qty = item.quantity ?? 1;
    return sum + price * qty;
  }, 0);

  // ---------------- JSX ----------------
  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 relative">
      {toast.show && <Toast message={toast.message} type={toast.type} />}

      {/* Back */}
      <button
        onClick={() => (window.location.href = "/UserDashBoard")}
        className="absolute top-6 left-6 flex items-center text-gray-500 hover:text-gray-700"
      >
        <span className="text-2xl mr-2">←</span> Back
      </button>

      <h1 className="text-4xl font-bold mb-2">My Cart 🛒</h1>
      <p className="text-gray-600 mb-8">Review your products before checkout</p>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !cartExists && (
        <button
          onClick={handleCreateCart}
          className="fixed bottom-4 right-4 bg-blue-900 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-800"
        >
          Create Cart
        </button>
      )}

      {!loading && cartExists && (
        <div className="w-full max-w-3xl flex flex-col gap-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500">Your cart is empty.</p>
          ) : (
            items.map((item) => {
              const cartItemId =
                item.cartItemId ?? item.cartItemsId ?? item.id;

              const name = item.productName ?? "Product";
              const qty = item.quantity ?? 1;
              const price = item.productPrice ?? 0;

              return (
                <div
                  key={cartItemId}
                  className="grid grid-cols-[3fr_1.5fr] gap-4 p-4 bg-white rounded-xl shadow-md hover:shadow-lg"
                >
                  <div>
                    <div className="font-semibold text-lg">{name}</div>
                    <div className="font-medium">₹{price}</div>
                    <div className="text-sm text-green-600">In stock</div>
                  </div>

                  <div className="flex justify-end items-center gap-2">
                    <button
                      onClick={() => handleQuantityChange(cartItemId, qty + 1)}
                      className="px-3 py-1 bg-gray-200 rounded-md"
                    >
                      +
                    </button>
                    <span>{qty}</span>
                    <button
                      onClick={() => handleQuantityChange(cartItemId, qty - 1)}
                      className="px-3 py-1 bg-gray-200 rounded-md"
                    >
                      -
                    </button>

                    <button
                      onClick={() => handleMoveToWishlist(item)}
                      className="text-2xl hover:scale-110"
                    >
                      ❤️
                    </button>

                    <button
                      onClick={() => handleRemove(cartItemId)}
                      className="px-2 py-1 border border-red-500 text-red-500 font-bold rounded-lg
                                 hover:bg-red-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}

          <div className="flex justify-end text-xl font-bold mt-4">
            Total: ₹{total}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              className="bg-blue-900 text-white px-6 py-2 rounded-lg"
              onClick={() => (window.location.href = "/UserDashBoard")}
            >
              Continue Shopping
            </button>

            <button
              className="bg-green-600 text-white px-6 py-2 rounded-lg"
              onClick={() => (window.location.href = "/order")}
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
