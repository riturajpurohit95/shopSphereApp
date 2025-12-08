// import React from 'react';
// import { Navigate } from 'react-router-dom';

// export default function ProtectedRoute({ children }) {
//   const token = localStorage.getItem('token');
//   return token ? children : <Navigate to="/login" replace />;
// }



import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function hasBypassQuery(location) {
  const params = new URLSearchParams(location.search);
  return params.get('bypass') === 'true';
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // ✅ If URL has ?bypass=true, allow access.
  if (hasBypassQuery(location)) {
    return children;
  }

  return token ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
