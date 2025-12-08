// src/pages/UserDashBoard.jsx
import { Link, useNavigate } from "react-router-dom";
import React, { useEffect, useState, useMemo } from "react";
import SearchBar from "../components/SearchBar";
import profileAvatar from "../images/blank_1.avif";

// ✅ Toast with clear floating styling (top-right)
const Toast = ({ message, type }) => (
  <div
    className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg text-sm z-40 ${
      type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"
    }`}
  >
    {message}
  </div>
);

// 🔹 Helper to read a *valid* userId
const getValidUserId = () => {
  const raw = localStorage.getItem("userId");
  if (!raw || raw === "undefined" || raw === "null") {
    return null;
  }
  return raw;
};

export default function UserDashboard() {
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartExists, setCartExists] = useState(false);
  const [wishlistExists, setWishlistExists] = useState(false);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(true);

  // 👇 For "Load more"
  const [visibleCount, setVisibleCount] = useState(8);

  // 👇 Account dropdown & location state
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [deliveryLocationKey, setDeliveryLocationKey] = useState(
    localStorage.getItem("deliveryLocationKey") || ""
  );

  // 👇 Filter & sort state
  const [priceFilter, setPriceFilter] = useState("ALL"); // ALL, UNDER_1000, 1000_5000, ABOVE_5000
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [sortOption, setSortOption] = useState("RELEVANCE");

  const userId = getValidUserId();
  const token = localStorage.getItem("token");

  const navigate = useNavigate();

  // 🔹 Only 4 allowed locations
  const presetLocations = [
    { id: "0", city: "Chandigarh", pincode: "160047" },
    { id: "1", city: "Jaipur", pincode: "110001" },
    { id: "2", city: "Pune", pincode: "400001" },
    { id: "3", city: "Bengaluru", pincode: "560001" },
  ];

  const getLocationLabel = () => {
    if (!deliveryLocationKey) return "Select your location";
    const found = presetLocations.find((l) => l.id === deliveryLocationKey);
    if (!found) return "Select your location";
    return `${found.city} - ${found.pincode}`;
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, userId, navigate]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 2500);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([fetchProducts(), checkCart(), checkWishlist()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeJson = async (res) => {
    try {
      return await res.json();
    } catch {
      const txt = await res.text();
      return { __raw: txt };
    }
  };

  const fetchProducts = async () => {
    if (!token) return console.error("Please login.");
    try {
      const res = await fetch("http://localhost:8888/api/products", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to fetch products");
      }

      const data = await safeJson(res);
      if (data && data.__raw) throw new Error(data.__raw);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Product fetch error:", err);
      showToast(err.message || "Failed to load products", "error");
    }
  };

  const checkCart = async () => {
    if (!userId || !token) return;
    try {
      const res = await fetch(
        `http://localhost:8888/api/carts/exists/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        setCartExists(false);
        return;
      }

      const exists = await safeJson(res);
      setCartExists(
        Boolean(
          exists && typeof exists === "boolean"
            ? exists
            : exists?.exists ?? exists
        )
      );
    } catch (err) {
      console.error("Cart check failed:", err);
      setCartExists(false);
    }
  };

  const checkWishlist = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8888/api/wishlist/exists`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setWishlistExists(false);
        return;
      }

      const exists = await safeJson(res);
      const existsBool = Boolean(
        exists && typeof exists === "boolean"
          ? exists
          : exists?.exists ?? exists
      );
      setWishlistExists(existsBool);

      if (existsBool) {
        await fetchWishlistItems();
      } else {
        setWishlistItems([]);
      }
    } catch (err) {
      console.error("Wishlist check error:", err);
      setWishlistExists(false);
    }
  };

  const fetchWishlistItems = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8888/api/wishlist/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch wishlist items (status ${res.status})`);
      }

      const data = await safeJson(res);
      const normalized = (Array.isArray(data) ? data : []).map((row) => ({
        wishlistItemsId: row.wishlistItemsId ?? row.id ?? row.wishlist_items_id,
        productId: row.productId ?? row.product_id,
      }));
      setWishlistItems(normalized);
    } catch (err) {
      console.error("Wishlist fetch error:", err);
      setWishlistItems([]);
    }
  };

  // ✅ handleAddToCart: creates cart if needed, stores cartId, adds item
  const handleAddToCart = async (productId) => {
    if (!userId) return showToast("Please login.", "error");

    try {
      let cartData;
      const cartRes = await fetch(
        `http://localhost:8888/api/carts/user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!cartRes.ok) {
        const createRes = await fetch(
          `http://localhost:8888/api/carts/${userId}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!createRes.ok) throw new Error("Failed to create cart");
        cartData = await safeJson(createRes);
      } else {
        cartData = await safeJson(cartRes);
      }

      const cartId = cartData?.cartId ?? cartData?.id;
      if (!cartId) throw new Error("Cart id not available");

      // Save for later use
      localStorage.setItem("cartId", String(cartId));

      const addRes = await fetch(`http://localhost:8888/api/cart-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cartId, productId, quantity: 1 }),
      });

      if (!addRes.ok) {
        const txt = await addRes.text();
        throw new Error(txt || "Failed to add item to cart");
      }

      showToast("Item added to cart");
      setCartExists(true);
    } catch (err) {
      console.error("Add to cart error:", err);
      showToast(err.message || "Failed to add to cart", "error");
    }
  };

  const handleWishlistToggle = async (product) => {
    try {
      const productId = product.product_id ?? product.productId;
      const existing = wishlistItems.find(
        (i) => Number(i.productId) === Number(productId)
      );

      if (existing) {
        const delRes = await fetch(
          `http://localhost:8888/api/wishlist-items/${existing.wishlistItemsId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!delRes.ok) {
          const txt = await delRes.text();
          throw new Error(txt || "Failed to remove from wishlist");
        }

        setWishlistItems((prev) =>
          prev.filter((i) => Number(i.productId) !== Number(productId))
        );
        showToast("Removed from wishlist", "success");
        return;
      }

      let wishlistId = null;

      if (!wishlistExists) {
        const createRes = await fetch(`http://localhost:8888/api/wishlist`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        });

        if (!createRes.ok) {
          const txt = await createRes.text();
          throw new Error(txt || "Failed to create wishlist");
        }

        const created = await safeJson(createRes);
        wishlistId =
          created?.wishlistId ?? created?.id ?? created?.wishlist_id;
        setWishlistExists(true);
      }

      if (!wishlistId) {
        const myRes = await fetch(`http://localhost:8888/api/wishlist/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!myRes.ok) {
          const txt = await myRes.text();
          throw new Error(txt || "Failed to get wishlist id");
        }
        const my = await safeJson(myRes);
        wishlistId = my?.wishlistId ?? my?.id ?? my?.wishlist_id;
      }

      if (!wishlistId) throw new Error("Wishlist id not available");

      const addRes = await fetch(`http://localhost:8888/api/wishlist-items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ wishlistId, productId }),
      });

      if (!addRes.ok) {
        const txt = await addRes.text();
        throw new Error(txt || "Failed to add to wishlist");
      }

      const added = await safeJson(addRes);
      const addedId =
        added?.id ??
        added?.wishlistItemsId ??
        added?.wishlist_items_id ??
        Date.now();

      setWishlistItems((prev) => [
        ...prev,
        { wishlistItemsId: addedId, productId },
      ]);
      setWishlistExists(true);
      showToast("Added to wishlist", "success");
    } catch (err) {
      console.error("Wishlist toggle error:", err);
      showToast(err.message || "Wishlist action failed", "error");
    }
  };

  // 🔹 Derive unique brands from products for brand filter
  const uniqueBrands = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ["All", ...Array.from(set)];
  }, [products]);

  // 🔹 Filter + sort pipeline
  const filteredProducts = useMemo(() => {
    // Step 1: category filter
    let working =
      activeCategory === "All"
        ? products
        : products.filter(
            (p) => (p.categoryId ?? p.category_id) === activeCategory
          );

    // Step 2: price filter
    working = working.filter((p) => {
      const price = Number(p.productPrice) || 0;
      if (priceFilter === "UNDER_1000") return price < 1000;
      if (priceFilter === "1000_5000") return price >= 1000 && price <= 5000;
      if (priceFilter === "ABOVE_5000") return price > 5000;
      return true; // ALL
    });

    // Step 3: brand filter
    if (selectedBrand !== "All") {
      working = working.filter((p) => p.brand === selectedBrand);
    }

    // Step 4: sorting
    const sorted = [...working];
    sorted.sort((a, b) => {
      const priceA = Number(a.productPrice) || 0;
      const priceB = Number(b.productPrice) || 0;
      const mrpA = Number(a.productMrp) || 0;
      const mrpB = Number(b.productMrp) || 0;

      switch (sortOption) {
        case "PRICE_LOW_HIGH":
          return priceA - priceB;
        case "PRICE_HIGH_LOW":
          return priceB - priceA;
        case "DISCOUNT": {
  const discA = mrpA ? ((mrpA - priceA) / mrpA) * 100 : 0;
  const discB = mrpB ? ((mrpB - priceB) / mrpB) * 100 : 0;

  // Primary: discount % high → low
  if (discB !== discA) return discB - discA;

  // Secondary: price low → high
  if (priceA !== priceB) return priceA - priceB;

  // Tertiary: name alphabetically
  return (a.productName || "").localeCompare(b.productName || "");
}

        case "NAME_AZ":
          return (a.productName || "").localeCompare(b.productName || "");
        default:
          return 0; // RELEVANCE
      }
    });

    return sorted;
  }, [products, activeCategory, priceFilter, selectedBrand, sortOption]);

  // 🔹 Only show part of the result (for "Load more")
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const categoryTabs = [
    { id: "All", label: "All" },
    { id: 1, label: "Electronics" },
    { id: 2, label: "Fashion" },
    { id: 3, label: "Books" },
    { id: 4, label: "Kitchen" },
    { id: 5, label: "Sports" },
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleSaveLocation = (e) => {
    e.preventDefault();
    if (!deliveryLocationKey) {
      showToast("Please select a location", "error");
      return;
    }
    localStorage.setItem("deliveryLocationKey", deliveryLocationKey);
    setShowLocationModal(false);
  };

  // 🔹 Footer navigation helper (for About/Terms/etc.)
  const handleFooterNavigate = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900">
      {toast.show && <Toast message={toast.message} type={toast.type} />}

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-10 py-6 bg-white shadow-sm">
        <h1 className="text-2xl font-bold tracking-wide italic">ShopSphere</h1>

        {/* 🔵 LOCATION BUTTON – to the LEFT of SearchBar */}
        <button
          type="button"
          className="hidden md:flex items-center gap-1 ml-6 text-sm text-blue-600 hover:text-blue-800"
          onClick={() => setShowLocationModal(true)}
        >
          <span className="text-lg">📍</span>
          <span className="flex flex-col leading-tight text-left">
            <span className="text-[11px] text-gray-500">Deliver to</span>
            <span className="font-medium">{getLocationLabel()}</span>
          </span>
        </button>

        {/* SearchBar */}
        <div className="hidden md:flex items-center">
          <SearchBar className="w-[28rem]" />
        </div>

        <div className="flex gap-6 items-center text-lg">
          {/* ACCOUNT DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              className="nav-cart-icon flex items-center gap-2"
              onClick={() => setShowAccountMenu((prev) => !prev)}
            >
              <img
                src={profileAvatar}
                alt="Profile"
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="hidden md:inline text-sm font-medium">
                Account ▾
              </span>
            </button>

            {showAccountMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    setShowAccountMenu(false);
                    navigate("/profile");
                  }}
                >
                  Profile
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    setShowAccountMenu(false);
                    navigate("/my-orders");
                  }}
                >
                  My Orders
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Cart + Wishlist */}
          <Link to="/cart" className="nav-cart-icon">
            🛒
          </Link>
          <Link to="/wishlist" className="nav-cart-icon">
            ❤️
          </Link>
        </div>
      </nav>

      {/* CATEGORY TABS */}
      <div className="flex gap-6 px-10 py-4 text-lg font-medium overflow-x-auto mb-4">
        {categoryTabs.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setActiveCategory(c.id);
              setVisibleCount(8); // reset load more
            }}
            className={`pb-1 border-b-2 whitespace-nowrap ${
              activeCategory === c.id
                ? "border-black text-black"
                : "border-transparent text-gray-500"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* FILTERS + SORT BAR */}
      <div className="flex items-center justify-between px-10 pb-4 text-sm">
        {/* Left side: filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Price filter */}
          <select
            value={priceFilter}
            onChange={(e) => {
              setPriceFilter(e.target.value);
              setVisibleCount(8);
            }}
            className="border border-gray-300 rounded-md px-2 py-1 bg-white"
          >
            <option value="ALL">All prices</option>
            <option value="UNDER_1000">Under ₹1,000</option>
            <option value="1000_5000">₹1,000 – ₹5,000</option>
            <option value="ABOVE_5000">Above ₹5,000</option>
          </select>

          {/* Brand filter */}
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setVisibleCount(8);
            }}
            className="border border-gray-300 rounded-md px-2 py-1 bg-white"
          >
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>
                {b === "All" ? "All brands" : b}
              </option>
            ))}
          </select>
        </div>

        {/* Right side: sorting */}
        <div>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 bg-white"
          >
            <option value="RELEVANCE">Sort: Relevance</option>
            <option value="PRICE_LOW_HIGH">Price: Low to High</option>
            <option value="PRICE_HIGH_LOW">Price: High to Low</option>
            <option value="DISCOUNT">Discount: High to Low</option>
            <option value="NAME_AZ">Name: A–Z</option>
          </select>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <section className="px-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 pb-20">
        {loading ? (
          <div className="col-span-4 text-center">Loading...</div>
        ) : visibleProducts.length === 0 ? (
          <div className="col-span-4 text-center text-gray-500 py-8">
            No products found with current filters.
          </div>
        ) : (
          visibleProducts.map((p) => {
            const productId = p.product_id ?? p.productId;
            const inWishlist = wishlistItems.some(
              (item) => Number(item.productId) === Number(productId)
            );

            // 🔹 Calculate discount percentage
            const price = Number(p.productPrice) || 0;
            const mrp = Number(p.productMrp) || 0;
            const discountPercentage =
              mrp && mrp > price
                ? Math.round(((mrp - price) / mrp) * 100)
                : 0;

            return (
              <div
                key={productId}
                className="group bg-white rounded-xl shadow-sm p-4 hover:shadow-lg transition relative"
              >
                {/* CLICK → Product Details */}
                <Link to={`/product/${productId}`} className="block mb-2">
                  <img
                    src={`/images/products/${p.imageUrl}`}
                    alt={p.productName ?? p.name}
                    className="rounded-xl h-52 w-full object-cover mb-4"
                  />

                  <h3 className="text-lg font-semibold">{p.productName}</h3>
                  <p className="text-gray-500 text-sm">{p.brand}</p>

                  <p className="text-gray-700 font-bold mt-1">
                    ₹{price}
                    <span className="text-gray-400 line-through ml-2 text-sm">
                      ₹{mrp}
                    </span>
                    {discountPercentage > 0 && (
                      <span className="text-green-600 text-sm font-semibold ml-2">
                        {discountPercentage}% OFF
                      </span>
                    )}
                  </p>
                </Link>

                {/* BUTTONS */}
                <div className="absolute bottom-2 right-2 flex flex-col gap-2">
                  <button
                    onClick={() => handleAddToCart(productId)}
                    className="bg-white text-green-600 border border-green-500 font-bold px-3 py-1 rounded-full hover:bg-green-50 transition"
                    title="Add to cart"
                  >
                    🛒
                  </button>

                  <button
                    onClick={() => handleWishlistToggle(p)}
                    className="text-2xl transition hover:scale-110"
                    title={
                      inWishlist
                        ? "Remove from wishlist"
                        : "Add to wishlist"
                    }
                  >
                    {inWishlist ? "❤️" : "🤍"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* LOAD MORE – works & hides when done */}
      {!loading && filteredProducts.length > visibleCount && (
        <div className="flex justify-center pb-12">
          <button
            className="px-6 py-3 border border-gray-400 rounded-md hover:bg-gray-100"
            onClick={() => setVisibleCount((prev) => prev + 8)}
          >
            Load more
          </button>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 px-10 py-12 mt-auto">
        <div className="grid gap-8 md:grid-cols-4 mb-8 text-sm">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-white">
              ShopSphere
            </h2>
            <p className="opacity-80">
              Your mini shopping experience with carts, wishlists and secure
              checkout – built as a demo e-commerce project.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-white">Shop</h3>
            <ul className="space-y-2">
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => handleFooterNavigate("/")}
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => handleFooterNavigate("/my-orders")}
                >
                  My Orders
                </button>
              </li>
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => handleFooterNavigate("/wishlist")}
                >
                  Wishlist
                </button>
              </li>
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => handleFooterNavigate("/cart")}
                >
                  Cart
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-white">Help & Info</h3>
            <ul className="space-y-2">
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => handleFooterNavigate("/about")}
                >
                  About Us
                </button>
              </li>
              <li>
                <span className="opacity-80 cursor-default">
                  FAQs (coming soon)
                </span>
              </li>
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => handleFooterNavigate("/terms")}
                >
                  Terms &amp; Conditions
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-white">Contact</h3>
            <ul className="space-y-2">
              <li className="opacity-80">Email: support@shopsphere.com</li>
              <li className="opacity-80">Phone: +91-99999 99999</li>
              <li className="opacity-80">
                Demo project – not a real store 🙂
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4 flex flex-col md:flex-row justify-between text-xs opacity-70 gap-2">
          <p>© 2025 ShopSphere. All rights reserved.</p>
          <p>Built with ❤️ for learning & practice.</p>
        </div>
      </footer>

      {/* LOCATION MODAL */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30">
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-3">Choose your location</h2>

            <form onSubmit={handleSaveLocation} className="space-y-3">
              {presetLocations.map((loc) => (
                <label
                  key={loc.id}
                  className="flex items-center gap-2 text-sm cursor-pointer border border-gray-200 rounded-md px-3 py-2 hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="location"
                    value={loc.id}
                    checked={deliveryLocationKey === loc.id}
                    onChange={(e) => setDeliveryLocationKey(e.target.value)}
                  />
                  <span>
                    <span className="font-medium">{loc.city}</span>{" "}
                    <span className="text-xs text-gray-500">
                      ({loc.pincode})
                    </span>
                  </span>
                </label>
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
                  onClick={() => setShowLocationModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

