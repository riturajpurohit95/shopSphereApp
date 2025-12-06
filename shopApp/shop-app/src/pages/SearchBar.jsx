// src/pages/SearchBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SearchDropdown from "./SearchDropdown";
import "./Search.css"; // Search.css is in the same folder

// Go through API gateway like other calls
const SEARCH_API_URL = "http://localhost:8888/api/products/search";

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Start suggesting from 1 character (Amazon-style)
  const MIN_CHARS = 1;
  const SUGGESTION_LIMIT = 6;

  const handleChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      setError("");
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (value.trim().length >= MIN_CHARS) {
        fetchSuggestions(value.trim());
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);
  };

  const fetchSuggestions = async (term) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const url = `${SEARCH_API_URL}?name=${encodeURIComponent(term)}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const txt = await response.text();
        console.error("Suggestion error:", response.status, txt);
        throw new Error(
          txt || `Failed to fetch suggestions (status ${response.status})`
        );
      }

      const data = await response.json();
      const products = Array.isArray(data) ? data : [];
      const limited = products.slice(0, SUGGESTION_LIMIT);

      setSuggestions(limited);
      setShowDropdown(true);
    } catch (err) {
      console.error(err);
      setError("Unable to fetch suggestions");
      setSuggestions([]);
      setShowDropdown(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;

    setShowDropdown(false);
    // Full search page
    navigate(`/search?query=${encodeURIComponent(term)}`);
  };

  const handleSelectProduct = (productId) => {
    setShowDropdown(false);
    setSearchTerm("");
    // Product details route
    navigate(`/product/${productId}`);
  };

  const handleViewAll = () => {
    const term = searchTerm.trim();
    if (!term) return;

    setShowDropdown(false);
    navigate(`/search?query=${encodeURIComponent(term)}`);
  };

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="Search products..."
          value={searchTerm}
          onChange={handleChange}
        />
        <button type="submit" className="search-button">
          Search
        </button>
      </form>

      {showDropdown && searchTerm.trim() && (
        <SearchDropdown
          query={searchTerm}
          suggestions={suggestions}
          loading={loading}
          error={error}
          onSelect={handleSelectProduct}
          onViewAll={handleViewAll}
        />
      )}
    </div>
  );
};

export default SearchBar;
