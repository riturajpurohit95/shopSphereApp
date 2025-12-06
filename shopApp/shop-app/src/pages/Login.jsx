import loginBg from "../images/3.jpg";
import "./Login.css";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { jwtDecode } from "jwt-decode";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data || {};

      // 1) token
      const token = data.token;
      if (!token) {
        setError("Login failed: missing token in response.");
        return;
      }
      localStorage.setItem("token", token);

      // 2) try user info from response
      const backendUser = data.user || {};

      const uidFromResponse =
        data.userId ||
        data.id ||
        data.user_id ||
        data.userid ||
        backendUser.userId ||
        backendUser.id ||
        null;

      const roleFromResponse = data.role || backendUser.role || null;

      const emailFromResponse =
        data.email || backendUser.email || email;

      // 3) decode token as fallback
      let decoded = {};
      try {
        decoded = jwtDecode(token);
      } catch (decodeErr) {
        console.warn("Failed to decode JWT", decodeErr);
      }

      const uid =
        uidFromResponse ||
        decoded.userId ||
        decoded.id ||
        decoded.user_id ||
        decoded.userid ||
        null;

      const role = (roleFromResponse || decoded.role || "USER").toUpperCase();

      const finalEmail =
        emailFromResponse || decoded.email || email;

      if (!uid) {
        setError(
          "Login succeeded but user id was not found in response/token."
        );
        return;
      }

      // 4) normalize user and store
      const normalizedUser = {
        id: uid,
        userId: uid, // same value so dashboards can use either
        role: role, // ADMIN / SELLER / USER / MERCHANT etc.
        email: finalEmail,
        name: data.name || backendUser.name || decoded.name || "",
      };

      localStorage.setItem("user", JSON.stringify(normalizedUser));

      // (optional separate keys)
      localStorage.setItem("userId", String(uid));
      localStorage.setItem("role", role);
      localStorage.setItem("email", finalEmail);

      console.log("Logged in user:", normalizedUser);

      // 5) navigate based on role
      if (role === "ADMIN") {
        navigate("/admin");
      } else if (role === "SELLER" || role === "MERCHANT") {
        navigate("/seller");
      } else {
        navigate("/UserDashBoard");
      }
    } catch (err) {
      console.error("Login error:", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Login failed. Please try again.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div
        className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2"
        style={{ minHeight: 460 }}
      >
        {/* LEFT FORM */}
        <section className="flex items-center justify-center p-6 bg-white">
          <div className="w-full max-w-sm">
            <h1 className="text-center text-xl md:text-2xl font-semibold text-gray-900 mb-1">
              <i>Welcome to ShopSphere</i>
            </h1>
            <h4 className="text-center text-sm text-gray-600 mb-4">
              <i>Start Your Adventure Today</i>
            </h4>

            <form onSubmit={handleLogin} className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Email
                </label>
                <input
                  className="mt-1 block w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Password
                </label>
                <input
                  className="mt-1 block w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                className="w-full mt-1 inline-flex items-center justify-center px-4 py-2 text-sm bg-black text-white rounded-md hover:opacity-95"
                type="submit"
              >
                Login
              </button>
            </form>

            <h6 className="mt-2 text-xs text-gray-600 text-center">
              <i>
                Not a user yet?{" "}
                <Link to="/SignUpPage" className="text-black font-medium">
                  Sign Up
                </Link>
              </i>
            </h6>

            {error && (
              <div
                role="alert"
                className="mt-2 rounded-md bg-red-50 border border-red-100 p-2 text-xs text-red-700 text-center"
              >
                {error}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT IMAGE */}
        <section className="bg-white" style={{ height: 460 }}>
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${loginBg})` }}
          />
        </section>
      </div>
    </div>
  );
}