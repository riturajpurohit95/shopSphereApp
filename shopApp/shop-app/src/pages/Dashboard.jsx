

// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();

  const [username, setUsername] = useState(localStorage.getItem('username') || 'Guest');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

useEffect(() => {
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  if (!token || !userId) return;

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/users/${userId}/profile`, {
        headers: {
          Authorization: `Bearer ${token}`, // <-- Pass token here
        },
      });
      setProfile(res.data);

      if (res.data.name) {
        setUsername(res.data.name);
      }
    } catch (err) {
      setError(err.response?.data || "Could not fetch profile data");
    } finally {
      setLoading(false);
    }
  };

  fetchProfile();
}, []);


  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="dash-root">
      <header className="dash-header">
        <h1>Dashboard</h1>
        <div className="dash-header-right">
          <span className="dash-username">Hello, <strong>{username}</strong></span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="dash-main">

        {/* Profile */}
        <section className="card">
          <h3>Profile</h3>

          {loading && <p>Loading profile…</p>}
          {error && <p style={{ color: 'crimson' }}>{error}</p>}

          {!loading && profile && (
            <div>
              <p>Name: <strong>{profile.name}</strong></p>
              <p>Email: <strong>{profile.email}</strong></p>
              <p>Phone: <strong>{profile.phone}</strong></p>
              <p>Role: <strong>{profile.role}</strong></p>
              <p>City: <strong>{profile.city}</strong></p>
              <p>Hub Value: <strong>{profile.hub_value}</strong></p>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
