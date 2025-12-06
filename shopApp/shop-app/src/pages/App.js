 import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
 import Login from './pages/Login';
// //import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
// import ProtectedRoute from './components/ProtectedRoute';
 import CartPage from './pages/CartPage';
 import WishlistPage from './pages/WishlistPage';
 import UserDashBoard from './pages/UserDashBoard';
import SignUpPage from './pages/SignUpPage';
 import UserDashBoard from './pages/UserDashBoard';
 import UserProfilePage from './pages/UserProfilePage';

 import CheckoutPage from './CheckoutPage';
 import UpiPaymentPage from './UpiPaymentPage';
 import OrderSuccess from './OrderSuccess';

 function App() {
   return (
    <BrowserRouter>
     <Routes>
        <Route path="/login" element={<Login />} />

       
 
         <Route path="/UserDashBoard" element={<UserDashBoard />} />
         {/* ⬅️ New signup route */}
        <Route path="/SignUpPage" element={<SignUpPage />} />

    <Route path="/admin" element={<AdminDashboard />} />
     <Route path="/cart" element={<CartPage />} />
       <Route path="/wishlist" element={<WishlistPage />} />
       <Route path="/profile" element={<UserProfilePage />} />
       <Route path="/order" element={<CheckoutPage />} />
       <Route path="/orderSuccess" element={<OrderSuccess />} />
       <Route path="/payment" element={<UpiPaymentPage />} />
       <Route path="/product" element={<pro />} />
        
         <Route path="*" element={<Navigate to="/login" replace />} />
       </Routes>
    </BrowserRouter>
  );
 }

 export default App;
