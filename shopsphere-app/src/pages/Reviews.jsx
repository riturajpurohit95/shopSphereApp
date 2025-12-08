// import React, { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../api/axios";

// /**
//  * Tailwind-based ReviewPage
//  * - route param: :productId
//  * - uses localStorage token or localStorage.userId to determine logged-in user
//  * - GET /api/reviews/product/{productId}
//  * - POST /api/reviews
//  */
// export default function ReviewPage() {
//   const { productId } = useParams();
//   const [rating, setRating] = useState(0); // 1..5
//   const [hoverRating, setHoverRating] = useState(0);
//   const [reviewText, setReviewText] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [message, setMessage] = useState({ type: "", text: "" });
//   const [reviews, setReviews] = useState([]);
//   const [loadingReviews, setLoadingReviews] = useState(true);

//   // Try to determine userId:
//   const getUserId = () => {
//     const userIdFromStorage = localStorage.getItem("userId");
//     if (userIdFromStorage) return Number(userIdFromStorage);
//     const token = localStorage.getItem("token");
//     if (!token) return null;
//     try {
//       // minimal jwt payload parse: header.payload.signature
//       const payload = token.split(".")[1];
//       const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
//       // common claim names: sub, userId, id
//       if (decoded.userId) return Number(decoded.userId);
//       if (decoded.id) return Number(decoded.id);
//       if (decoded.sub && !isNaN(Number(decoded.sub))) return Number(decoded.sub);
//     } catch (e) {
//       // fallback
//     }
//     return null;
//   };

//   const loggedUserId = getUserId();

//   useEffect(() => {
//     fetchReviews();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [productId]);

//   async function fetchReviews() {
//     setLoadingReviews(true);
//     setMessage({ type: "", text: "" });
//     try {
//       const res = await api.get(/api/reviews/product/${productId});
//       setReviews(res.data || []);
//     } catch (err) {
//       if (err.response && err.response.status === 404) {
//         setReviews([]);
//       } else {
//         console.error(err);
//         setMessage({ type: "error", text: "Failed to load reviews. Try again later." });
//       }
//     } finally {
//       setLoadingReviews(false);
//     }
//   }

//   function validate() {
//     if (!loggedUserId) {
//       setMessage({ type: "error", text: "You must be logged in to submit a review." });
//       return false;
//     }
//     const r = Number(rating);
//     if (!r || r < 1 || r > 5) {
//       setMessage({ type: "error", text: "Please give a rating between 1 and 5 stars." });
//       return false;
//     }
//     if (!reviewText || !reviewText.trim()) {
//       setMessage({ type: "error", text: "Review text cannot be empty." });
//       return false;
//     }
//     if (!productId || Number(productId) <= 0) {
//       setMessage({ type: "error", text: "Invalid product. Cannot submit review." });
//       return false;
//     }
//     return true;
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     setMessage({ type: "", text: "" });

//     if (!validate()) return;

//     setSubmitting(true);
//     try {
//       const payload = {
//         userId: loggedUserId,
//         productId: Number(productId),
//         rating: Number(rating),
//         reviewText: reviewText.trim(),
//       };

//       const res = await api.post("/api/reviews", payload, {
//         headers: { "Content-Type": "application/json" },
//       });

//       const reviewId = res.data?.reviewId;
//       setMessage({ type: "success", text: Review submitted${reviewId ? ` (id: ${reviewId}) : ""}.` });
//       setRating(0);
//       setHoverRating(0);
//       setReviewText("");
//       fetchReviews();
//     } catch (err) {
//       console.error(err);
//       if (err.response && err.response.data) {
//         const data = err.response.data;
//         const text = typeof data === "string" ? data : (data.message || JSON.stringify(data));
//         setMessage({ type: "error", text });
//       } else {
//         setMessage({ type: "error", text: "Failed to submit review. Please try again." });
//       }
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   function formatTimestamp(ts) {
//     if (!ts) return "";
//     try {
//       const d = new Date(ts);
//       return d.toLocaleString();
//     } catch {
//       return String(ts);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
//       <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-8">
//         {/* Left card - write review */}
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
//           <div>
//             <h2 className="text-lg font-semibold text-slate-900">Write a Review</h2>
//             <p className="text-sm text-gray-500 mt-1">Help others by leaving an honest rating and review.</p>
//           </div>

//           <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
//             <label className="text-sm font-medium text-slate-700">Your rating</label>
//             <div className="flex items-center gap-2" role="radiogroup" aria-label="Rating">
//               {[1, 2, 3, 4, 5].map((i) => {
//                 const filled = i <= (hoverRating || rating);
//                 return (
//                   <button
//                     key={i}
//                     type="button"
//                     className={`p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-transform ${
//                       filled ? "transform -translate-y-0.5" : ""
//                     }`}
//                     onClick={() => setRating(i)}
//                     onMouseEnter={() => setHoverRating(i)}
//                     onMouseLeave={() => setHoverRating(0)}
//                     aria-pressed={filled}
//                     aria-label={${i} star${i > 1 ? "s" : ""}}
//                   >
//                     <svg viewBox="0 0 24 24" className={w-7 h-7 ${filled ? "text-indigo-600" : "text-gray-300"}} fill="currentColor" aria-hidden>
//                       <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.402 8.176L12 18.896l-7.336 3.876 1.402-8.176L.132 9.21l8.2-1.192z"/>
//                     </svg>
//                   </button>
//                 );
//               })}
//             </div>

//             <label htmlFor="reviewText" className="text-sm font-medium text-slate-700">Your review</label>
//             <textarea
//               id="reviewText"
//               className="w-full resize-y min-h-[110px] rounded-xl border border-gray-100 p-3 text-sm placeholder-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none"
//               placeholder="Share your experience — what you liked, disliked, or any tips for others."
//               value={reviewText}
//               onChange={(e) => setReviewText(e.target.value)}
//               maxLength={2000}
//               required
//             />

//             {message.text && (
//               <div className={text-sm px-3 py-2 rounded-lg ${message.type === "error" ? "bg-red-50 text-red-600 border border-red-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"}}>
//                 {message.text}
//               </div>
//             )}

//             <div className="flex gap-3 mt-2">
//               <button
//                 type="submit"
//                 disabled={submitting}
//                 className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-white shadow-sm ${
//                   submitting ? "bg-indigo-400 cursor-not-allowed" : "bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
//                 }`}
//               >
//                 {submitting ? "Submitting…" : "Submit review"}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => {
//                   setRating(0);
//                   setHoverRating(0);
//                   setReviewText("");
//                   setMessage({ type: "", text: "" });
//                 }}
//                 className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
//               >
//                 Clear
//               </button>
//             </div>
//           </form>
//         </div>

//         {/* Right area - reviews list */}
//         <div className="space-y-4">
//           <div className="flex items-center justify-between">
//             <h3 className="text-lg font-semibold text-slate-900">Customer reviews</h3>
//           </div>

//           <div>
//             {loadingReviews ? (
//               <div className="text-sm text-gray-500">Loading reviews…</div>
//             ) : reviews.length === 0 ? (
//               <div className="text-sm text-gray-500">Be the first to review this product.</div>
//             ) : (
//               <ul className="space-y-4">
//                 {reviews.map((r) => (
//                   <li key={r.reviewId ?? ${r.userId}-${r.createdAt}} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
//                     <div className="flex items-start justify-between gap-3">
//                       <div className="flex items-center gap-3">
//                         <div className="flex gap-1">
//                           {Array.from({ length: 5 }).map((_, i) => (
//                             <svg key={i} viewBox="0 0 24 24" className={w-4 h-4 ${i < (r.rating || 0) ? "text-indigo-600" : "text-gray-200"}} fill="currentColor" aria-hidden>
//                               <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.786 1.402 8.176L12 18.896l-7.336 3.876 1.402-8.176L.132 9.21l8.2-1.192z" />
//                             </svg>
//                           ))}
//                         </div>
//                       </div>

//                       <div className="text-right">
//                         <div className="text-sm font-medium text-slate-800">User {r.userId ?? "—"}</div>
//                         <div className="text-xs text-gray-500">{formatTimestamp(r.createdAt)}</div>
//                       </div>
//                     </div>

//                     <p className="mt-3 text-sm text-slate-800 whitespace-pre-wrap">{r.reviewText}</p>

//                     {r.status && r.status !== "VISIBLE" && (
//                       <div className="mt-3 inline-block px-2 py-1 text-xs rounded-md bg-gray-50 text-gray-700 border border-gray-100">
//                         {r.status.toLowerCase()}
//                       </div>
//                     )}
//                   </li>
//                 ))}
//               </ul>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }