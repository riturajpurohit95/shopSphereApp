// src/pages/SearchResultsPage.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import "./Search.css";

const SEARCH_API_URL = "http://localhost:8888/api/products/search";

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();

  const query =
    searchParams.get("query") ||
    searchParams.get("q") ||
    "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setProducts([]);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        const url = `${SEARCH_API_URL}?name=${encodeURIComponent(term)}`;

        console.log("➡️ Fetching search results from:", url);

        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          const txt = await response.text();
          console.error("Search error:", response.status, txt);
          throw new Error(
            txt || `Failed to fetch search results (status ${response.status})`
          );
        }

        const data = await response.json();
        const productsArray = Array.isArray(data) ? data : [];
        setProducts(productsArray);
      } catch (err) {
        console.error("❌ Search fetch failed:", err);
        setError(err.message || "Unable to fetch search results");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const hasResults = products && products.length > 0;

  const getImageSrc = (imageUrl) => {
    if (!imageUrl) return null;
    return imageUrl.startsWith("http")
      ? imageUrl
      : `/images/products/${imageUrl}`;
  };

  return (
    <div className="search-results-page">
      <h2 className="search-results-title">
        Search results for: <span>&quot;{query}&quot;</span>
      </h2>

      {loading && <p className="search-results-message">Loading...</p>}

      {!loading && error && (
        <p className="search-results-message search-results-error">
          {error}
        </p>
      )}

      {!loading && !error && !hasResults && query.trim() && (
        <p className="search-results-message">No products found.</p>
      )}

      {!loading && !error && !query.trim() && (
        <p className="search-results-message">
          Type something in the search bar to see results.
        </p>
      )}

      {!loading && !error && hasResults && (
        <div className="search-results-grid">
          {products.map((product) => {
            const imgSrc = getImageSrc(product.imageUrl);
            return (
              <Link
                key={product.product_id}
                to={`/product/${product.product_id}`}
                className="search-result-card"
              >
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={product.productName}
                    className="search-result-image"
                  />
                ) : (
                  <div className="search-result-image placeholder" />
                )}

                <div className="search-result-info">
                  <h3 className="search-result-name">
                    {product.productName}
                  </h3>

                  {product.productPrice !== undefined &&
                    product.productPrice !== null && (
                      <p className="search-result-price">
                        ₹{product.productPrice}
                      </p>
                    )}

                  {product.brand && (
                    <p className="search-result-brand">{product.brand}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SearchResultsPage;

