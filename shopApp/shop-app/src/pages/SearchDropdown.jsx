// src/components/SearchDropdown.jsx
// src/pages/SearchDropdown.jsx
import React from "react";

const SearchDropdown = ({
  query,
  suggestions,
  loading,
  error,
  onSelect,
  onViewAll,
}) => {
  const hasResults = suggestions && suggestions.length > 0;

  return (
    <div className="search-dropdown">
      {loading && (
        <div className="search-dropdown-item search-dropdown-message">
          Searching...
        </div>
      )}

      {!loading && error && (
        <div className="search-dropdown-item search-dropdown-error">
          {error}
        </div>
      )}

      {!loading && !error && !hasResults && (
        <div className="search-dropdown-item search-dropdown-message">
          No results found
        </div>
      )}

      {!loading &&
        !error &&
        hasResults &&
        suggestions.map((product) => (
          <button
            key={product.product_id}
            type="button"
            className="search-dropdown-item"
            onClick={() => onSelect(product.product_id)}
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.productName}
                className="search-dropdown-image"
              />
            ) : (
              <div className="search-dropdown-image placeholder" />
            )}

            <div className="search-dropdown-info">
              <div className="search-dropdown-name">
                {product.productName}
              </div>

              {product.productPrice !== undefined &&
                product.productPrice !== null && (
                  <div className="search-dropdown-price">
                    ₹{product.productPrice}
                  </div>
                )}

              {product.brand && (
                <div className="search-dropdown-brand">
                  {product.brand}
                </div>
              )}
            </div>
          </button>
        ))}

      {!loading && hasResults && (
        <button
          type="button"
          className="search-dropdown-footer"
          onClick={onViewAll}
        >
          View all results for &quot;{query}&quot;
        </button>
      )}
    </div>
  );
};

export default SearchDropdown;
