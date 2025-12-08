// src/pages/ProfilePage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./UserProfile.css";

const UserProfilePage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    userId: null,
    name: "",
    email: "",
    phone: "",
    role: "",
    locationId: null,
    locationName: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const storedUserId = localStorage.getItem("userId");
  const userId = storedUserId ? parseInt(storedUserId, 10) : null;
  const token = localStorage.getItem("token"); // ✅ NEW

  const normalizeProfile = (data) => {
    const userPart = data.user || data;

    return {
      userId: userPart.userId ?? data.userId ?? null,
      name: userPart.name ?? data.name ?? "",
      email: userPart.email ?? data.email ?? "",
      phone: userPart.phone ?? data.phone ?? "",
      role: userPart.role ?? data.role ?? "",
      locationId:
        userPart.locationId ?? data.locationId ?? data.location?.locationId ?? null,
      locationName:
        data.locationName ??
        data.location?.name ??
        data.location?.city ??
        "",
    };
  };

  useEffect(() => {
    // 1️⃣ AUTH GUARD
    if (!userId || !token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const res = await api.get(`/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${token}` }, // ✅ NEW
        });

        const normalized = normalizeProfile(res.data);
        setForm(normalized);
      } catch (err) {
        console.error(err);
        setError(
          err.response?.data?.message ||
            err.response?.data ||
            "Failed to load profile. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLockedFieldClick = () => {
    alert("Email and role cannot be changed for security reasons.");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }

    if (!userId) {
      setError("User not found. Please log in again.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        userId: userId,
        name: form.name,
        phone: form.phone,
        locationId: form.locationId,
      };

      const res = await api.put(`/users/${userId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }, // ✅ NEW
      });

      setMessage(res.data || "Profile updated successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          err.response?.data ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/UserDashBoard");
  };

  return (
    <div className="profile-page-wrapper">
      <div className="profile-card">
        <h1 className="profile-title">My Profile</h1>
        <p className="profile-subtitle">
          Manage your personal information and account details
        </p>

        {loading && <p className="profile-info">Loading profile...</p>}
        {error && <p className="profile-error">{error}</p>}
        {message && <p className="profile-message">{message}</p>}

        {!loading && !error && (
          <form className="profile-form" onSubmit={handleSave}>
            <div className="profile-grid">
              {/* Name */}
              <div className="profile-field">
                <label className="profile-label" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  className="profile-input"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              {/* Email */}
              <div className="profile-field">
                <label className="profile-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  className="profile-input profile-input-readonly"
                  type="email"
                  value={form.email}
                  readOnly
                  onClick={handleLockedFieldClick}
                />
              </div>

              {/* Phone */}
              <div className="profile-field">
                <label className="profile-label" htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  className="profile-input"
                  type="text"
                  value={form.phone || ""}
                  onChange={handleChange}
                />
              </div>

              {/* Role */}
              <div className="profile-field">
                <label className="profile-label" htmlFor="role">
                  Role
                </label>
                <input
                  id="role"
                  name="role"
                  className="profile-input profile-input-readonly"
                  type="text"
                  value={form.role || ""}
                  readOnly
                  onClick={handleLockedFieldClick}
                />
              </div>

              {/* Location */}
              {form.locationName && (
                <div className="profile-field profile-field-full">
                  <label className="profile-label">Location</label>
                  <input
                    className="profile-input profile-input-readonly"
                    type="text"
                    value={form.locationName}
                    readOnly
                  />
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleBack}
              >
                Back to Dashboard
              </button>

              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UserProfilePage;
