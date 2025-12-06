// src/components/SearchBar.jsx
// src/components/SearchBar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SearchDropdown from "../pages/SearchDropdown";
import "../pages/Search.css"; // used only for dropdown / results classes

const SEARCH_API_URL = "http://localhost:8888/api/products/search";

export default function SearchBar({ className = "" }) {
  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const MIN_CHARS = 1;
  const SUGGESTION_LIMIT = 6;

  const handleChange = (e) => {
    const value = e.target.value;
    setTerm(value);

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

  const fetchSuggestions = async (value) => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const url = `${SEARCH_API_URL}?name=${encodeURIComponent(value)}`;

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
    const q = term.trim();
    if (!q) return;

    setShowDropdown(false);
    navigate(`/search?query=${encodeURIComponent(q)}`);
  };

  const handleSelectProduct = (productId) => {
    setShowDropdown(false);
    setTerm("");
    navigate(`/product/${productId}`);
  };

  const handleViewAll = () => {
    const q = term.trim();
    if (!q) return;

    setShowDropdown(false);
    navigate(`/search?query=${encodeURIComponent(q)}`);
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
    <div className={`relative ${className}`} ref={wrapperRef}>
      {/* 🔵 OLD STYLE SEARCH BAR UI */}
      <form
        onSubmit={handleSubmit}
        className="relative"
        role="search"
        aria-label="Site search"
      >
        <div className="group flex items-center gap-2 w-full max-w-md rounded-full border border-gray-300 bg-white/70 px-4 py-2 shadow-sm transition-colors focus-within:border-gray-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-black/10">
          {/* Search icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-400 group-focus-within:text-gray-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          {/* Input */}
          <input
            type="search"
            placeholder="Search products, categories…"
            value={term}
            onChange={handleChange}
            className="peer w-full bg-transparent text-gray-800 placeholder:text-gray-400 outline-none"
            autoComplete="off"
            aria-label="Search"
          />

          {/* Submit button */}
          <button
            type="submit"
            className="hidden sm:inline-flex rounded-full bg-gray-900 text-white px-3 py-1 text-sm font-medium hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
          >
            Search
          </button>
        </div>
      </form>

      {/* 🔽 DROPDOWN (uses Search.css styles) */}
      {showDropdown && term.trim() && (
        <div className="absolute left-0 mt-2 w-full max-w-md z-30">
          <SearchDropdown
            query={term}
            suggestions={suggestions}
            loading={loading}
            error={error}
            onSelect={handleSelectProduct}
            onViewAll={handleViewAll}
          />
        </div>
      )}
    </div>
  );
}
