// src/App.js
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import UserDashBoard from "./pages/UserDashBoard";
import SignUpPage from "./pages/SignUpPage";
import UpiPaymentPage from "./pages/UpiPaymentPage";
import OrderSuccessPage from "./pages/OrderSuccess";
import AdminDashboard from "./pages/AdminDashboard";
import WishlistPage from "./pages/WishlistPage";
import CheckoutPage from "./pages/CheckoutPage";
import CartPage from "./pages/CartPage";
import UserProfilePage from "./pages/UserProfilePage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import SellerDashboard from "./pages/SellerDashboard";

import SearchResultsPage from "./pages/SearchResultsPage";

function App() {
  // Simple auth check
  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/SignUpPage" element={<SignUpPage />} />

        {/* PROTECTED ROUTES */}
        <Route
          path="/UserDashBoard"
          element={
            isLoggedIn ? <UserDashBoard /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/profile"
          element={
            isLoggedIn ? <UserProfilePage /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/admin"
          element={
            isLoggedIn ? <AdminDashboard /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/seller"
          element={
            isLoggedIn ? <SellerDashboard /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/cart"
          element={isLoggedIn ? <CartPage /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/wishlist"
          element={
            isLoggedIn ? <WishlistPage /> : <Navigate to="/login" replace />
          }
        />

        {/* ✅ Product details route */}
        <Route
          path="/product/:productId"
          element={
            isLoggedIn ? (
              <ProductDetailsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ✅ My Orders route */}
        <Route
          path="/my-orders"
          element={
            isLoggedIn ? <MyOrdersPage /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/order"
          element={
            isLoggedIn ? <CheckoutPage /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/payment"
          element={
            isLoggedIn ? <UpiPaymentPage /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/orderSuccess"
          element={
            isLoggedIn ? (
              <OrderSuccessPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* ⭐ NEW: Search results route (protected) */}
       <Route
  path="/search"
  element={
    isLoggedIn ? <SearchResultsPage /> : <Navigate to="/login" replace />
  }
/>
        {/* FALLBACK ROUTE */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
