import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Toast = ({ message, type }) => (
  <div
    className={`fixed top-5 right-5 px-4 py-2 rounded-lg text-white font-medium transition-transform duration-300 z-50 ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    }`}
  >
    {message}
  </div>
);

const WishlistPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const token = localStorage.getItem("token");

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 2500);
  };

  const fetchWishlistItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("http://localhost:8888/api/wishlist/items", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok)
        throw new Error(`Failed to load wishlist (status ${res.status})`);

      const wishlistData = await res.json();

      const normalizedItems = wishlistData.map((item) => ({
        wishlistItemId:
          item.wishlistItemsId ?? item.wishlist_items_id ?? item.id,
        productId: item.productId ?? item.product_id,
      }));

      const productsPromise = normalizedItems.map(async (wi) => {
        const resp = await fetch(
          `http://localhost:8888/api/products/${wi.productId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!resp.ok)
          throw new Error(`Failed to fetch product ${wi.productId}`);

        const product = await resp.json();
        return {
          wishlistItemId: wi.wishlistItemId,
          productId: wi.productId,
          name: product.productName,
          price: product.productPrice,
          imageUrl: product.imageUrl,
        };
      });

      const result = await Promise.all(productsPromise);
      setItems(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlistItems();
  }, []);

  const handleRemove = async (wishlistItemId) => {
    try {
      const res = await fetch(
        `http://localhost:8888/api/wishlist-items/${wishlistItemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Failed to remove item");

      setItems((prev) =>
        prev.filter((i) => i.wishlistItemId !== wishlistItemId)
      );
      showToast("Item removed from wishlist");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleMoveToCart = async (wishlistItemId, productId) => {
    try {
      const userId = localStorage.getItem("userId");

      const cartRes = await fetch(
        `http://localhost:8888/api/carts/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let cartData = await cartRes.json();
      let cartId = cartData.cartId;

      if (!cartId) {
        const newCartRes = await fetch(
          `http://localhost:8888/api/carts/${userId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const newCartData = await newCartRes.json();
        cartId = newCartData.cartId;
      }

      const addRes = await fetch("http://localhost:8888/api/cart-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cartId, productId, quantity: 1 }),
      });

      if (!addRes.ok) throw new Error("Failed to add item to cart");

      await handleRemove(wishlistItemId);
      showToast("Moved to cart");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 py-10 px-4">
      {toast.show && <Toast message={toast.message} type={toast.type} />}

      <button
        onClick={() => window.history.back()}
        className="absolute top-6 left-6 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className="text-2xl mr-2">←</span> Back
      </button>

      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md p-8 sm:p-10">
        <h1 className="text-4xl font-bold text-center text-blue-900 mb-2">
          My Wishlist <span className="align-middle text-2xl">❤️</span>
        </h1>
        <p className="text-center text-lg text-blue-800 mb-6">
          Save items you love and manage them here.
        </p>

        {loading && (
          <p className="text-center text-blue-900">Loading wishlist...</p>
        )}
        {error && <p className="text-center text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <div className="text-center text-blue-900 text-lg font-medium mb-6">
              {items.length} item(s) in your wishlist
            </div>

            {items.length === 0 ? (
              <p className="text-center text-blue-900">Your wishlist is empty.</p>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {items.map((item) => (
                  <div
                    key={item.wishlistItemId}
                    className="grid grid-cols-1 sm:grid-cols-[1.2fr_3fr_1.5fr] gap-4 p-4 bg-white border-b border-gray-200 items-center"
                  >
                    <div className="flex justify-center sm:justify-start">
                      <img
                        src={`/images/products/${item.imageUrl}`}
                        alt={item.name}
                        className="w-20 h-20 rounded-lg object-cover shadow-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="font-semibold text-lg text-blue-900">
                        {item.name}
                      </div>
                      <div className="font-medium text-base text-blue-900">
                        ₹{item.price.toLocaleString("en-IN")}
                      </div>
                      <div className="text-sm text-green-600">In stock</div>
                    </div>

                    <div className="flex justify-end sm:justify-end items-center gap-2 mt-2 sm:mt-0">
                      <button
                        onClick={() =>
                          handleMoveToCart(item.wishlistItemId, item.productId)
                        }
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium transition-all hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5"
                      >
                        Move to Cart
                      </button>
                      <button
                        onClick={() => handleRemove(item.wishlistItemId)}
                        className="px-2 py-1 rounded-lg border border-red-500 text-red-500 font-bold text-lg transition-all hover:bg-red-500 hover:text-white hover:scale-105"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
