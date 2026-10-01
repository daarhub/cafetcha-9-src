import { Star } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import {
  addCustomerNotification,
  getCurrentCustomer,
} from "../../Customer/customerStore";

// ---------------------------------------------------------------------------
// Reviews store — localStorage-backed "database" for every review.
//
// Two collections:
// - cafetcha-reviews : all reviews
//     [{ id, targetKind: "store" | "product", productId?, customerId,
//        customerName, rating (1-5), text, createdAt }]
//
// Guests view reviews; only logged-in customers can post (no limit on how
// many reviews a customer may write).
// ---------------------------------------------------------------------------

const REVIEWS_KEY = "cafetcha-reviews";

const listeners = new Set();
let version = 0;

const emitChange = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

export const subscribeToReviews = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getReviewsVersion = () => version;

const readJSON = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — the app keeps working without persistence.
  }
  emitChange();
};

export const getAllReviews = () => readJSON(REVIEWS_KEY, []);

export const deleteReview = (reviewId) => {
  const reviews = getAllReviews();
  const next = reviews.filter((review) => review.id !== reviewId);
  if (next.length === reviews.length) {
    return { ok: false, error: "Review not found." };
  }
  writeJSON(REVIEWS_KEY, next);
  return { ok: true };
};

export const deleteCustomerReview = (reviewId) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  const reviews = getAllReviews();
  const review = reviews.find((entry) => entry.id === reviewId);
  if (!review) return { ok: false, error: "Review not found." };
  if (review.customerId !== customer.id) {
    return { ok: false, error: "You can only delete your own review." };
  }
  writeJSON(
    REVIEWS_KEY,
    reviews.filter((entry) => entry.id !== reviewId),
  );
  return { ok: true };
};

export const setReviewAdminRead = (reviewId, read) => {
  const reviews = getAllReviews();
  if (!reviews.some((entry) => entry.id === reviewId)) {
    return { ok: false, error: "Review not found." };
  }
  writeJSON(
    REVIEWS_KEY,
    reviews.map((entry) =>
      entry.id === reviewId ? { ...entry, adminRead: Boolean(read) } : entry,
    ),
  );
  return { ok: true };
};

export const markReviewAdminRead = (reviewId) =>
  setReviewAdminRead(reviewId, true);

export const markAllReviewsAdminRead = () => {
  const reviews = getAllReviews();
  writeJSON(
    REVIEWS_KEY,
    reviews.map((entry) => ({ ...entry, adminRead: true })),
  );
  return { ok: true };
};

export const replyToReview = (reviewId, reply) => {
  const reviews = getAllReviews();
  const review = reviews.find((entry) => entry.id === reviewId);
  if (!review) return { ok: false, error: "Review not found." };
  review.reply = reply.trim();
  review.repliedAt = new Date().toISOString();
  review.adminRead = true;
  writeJSON(
    REVIEWS_KEY,
    reviews.map((entry) => (entry.id === reviewId ? review : entry)),
  );
  addCustomerNotification(
    review.customerId,
    `Cafétcha replied to your ${review.targetKind === "product" ? "product" : "store"} review: “${review.reply}”`,
    "review",
    {
      reviewId: review.id,
      targetKind: review.targetKind,
      productId: review.productId || "",
    },
  );
  return { ok: true, review };
};

// Reviews for one product (or the store-wide reviews when productId is null).
export const getTargetReviews = (productId) =>
  getAllReviews().filter(
    (review) =>
      review.targetKind === "product"
        ? review.productId === productId
        : review.targetKind === "store" && productId === null,
  );

// Average rating for a target — defaults to 5.0 when nobody has reviewed it
// yet (products show a 5.0 rating until customers start rating).
export const getAverageRating = (productId) => {
  const reviews = getTargetReviews(productId);
  if (!reviews.length) return 5;
  return (
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
  );
};

// Adds a review. Customers may write as many reviews as they like — there is
// deliberately no per-target limit.
export const addReview = ({
  customer,
  rating,
  text,
  targetKind,
  productId,
  targetKey,
}) => {
  const reviews = getAllReviews();
  const review = {
    id: `review-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    targetKind,
    productId: productId || null,
    customerId: customer.id,
    customerName: `${customer.firstName} ${customer.lastName}`,
    rating,
    text,
    adminRead: false,
    createdAt: new Date().toISOString(),
  };
  writeJSON(REVIEWS_KEY, [...reviews, review]);
  return { ok: true, review };
};

// ---------- React hook ----------

export const useReviews = () => {
  useSyncExternalStore(subscribeToReviews, getReviewsVersion);
  return getAllReviews();
};

// Interactive star row used by the review forms: hovering fills diamonds up
// to the hovered star; clicking sets the rating.
export function StarRatingInput({ rating, onChange, size = 30 }) {
  const [hover, setHover] = useState(0);
  const current = hover || rating;
  return (
    <div
      className="star-input"
      onMouseLeave={() => setHover(0)}
      role="radiogroup"
      aria-label="Star rating"
    >
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={rating === value}
          aria-label={`${value} star${value === 1 ? "" : "s"}`}
          className={value <= current ? "active" : ""}
          onMouseEnter={() => setHover(value)}
          onFocus={() => setHover(value)}
          onBlur={() => setHover(0)}
          onClick={() => {
            onChange?.(value);
            setHover(0);
          }}
        >
          <Star
            size={size}
            strokeWidth={1.6}
            fill={value <= current ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

// Read-only star row used to display a rating.
export function StarsDisplay({ rating, size = 14 }) {
  const rounded = Math.round(rating * 2) / 2;
  const filled = Math.floor(rounded);
  return (
    <span className="stars-display">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          size={size}
          strokeWidth={1.5}
          fill={value <= filled ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}
