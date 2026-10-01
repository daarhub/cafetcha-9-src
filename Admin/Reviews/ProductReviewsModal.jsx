import { Send, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ReviewOwnerActions from "./ReviewOwnerActions";
import {
  addReview,
  StarRatingInput,
  StarsDisplay,
  useReviews,
} from "./ReviewsStore";
import { useCustomerStore } from "../../Customer/customerStore";
import { notify } from "../../Customer/toastStore";
import "./reviews.css";

const initials = (name) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

// Product reviews modal — shows every review for one product (guests and
// customers can view). Customers can write a review with the star input.
function ProductReviewsModal({ product, onClose }) {
  const { customer } = useCustomerStore();
  const reviews = useReviews().filter(
    (review) =>
      review.targetKind === "product" && review.productId === product.id,
  );
  const sorted = [...reviews].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    if (!rating) {
      setError("Please select a star rating.");
      return;
    }
    if (!text.trim()) {
      setError("Please write your review.");
      return;
    }
    const result = addReview({
      customer,
      rating,
      text: text.trim(),
      targetKind: "product",
      productId: product.id,
      targetKey: `product-${product.id}`,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    notify(`Review posted for ${product.name}.`);
    // The review is posted — close the product reviews modal.
    onClose();
  };

  return createPortal(
    <div className="review-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-reviews-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="review-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="review-modal-head">
          <h2 id="product-reviews-title">{product.name} — Reviews</h2>
          <p>
            {reviews.length
              ? `${reviews.length} review${reviews.length === 1 ? "" : "s"} for this item.`
              : "No reviews yet for this item."}
          </p>
        </div>

        <div className="review-modal-list">
          {sorted.length === 0 ? (
            <div className="review-modal-empty">
              <Star size={26} strokeWidth={1.5} />
              <p>Be the first to review this item!</p>
            </div>
          ) : (
            sorted.map((review) => (
              <article className="review-modal-item" key={review.id}>
                <div className="review-modal-item-top">
                  <div className="review-modal-item-user">
                    <span className="review-modal-avatar">
                      {initials(review.customerName)}
                    </span>
                    <div>
                      <p className="review-modal-item-name">
                        {review.customerName}
                      </p>
                      <p className="review-modal-item-meta">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="review-modal-stars-actions">
                    <span className="review-modal-stars">
                      <StarsDisplay rating={review.rating} size={13} />
                    </span>
                    <ReviewOwnerActions
                      review={review}
                      customerId={customer?.id}
                      inline
                      showReply={false}
                    />
                  </div>
                </div>
                <p className="review-modal-text">{review.text}</p>
                <ReviewOwnerActions
                  review={review}
                  customerId={customer?.id}
                  showButton={false}
                />
              </article>
            ))
          )}
        </div>

        {customer && (
          <form className="review-form" onSubmit={handleSubmit}>
            <label className="review-form-label">
              Your Rating
              <StarRatingInput rating={rating} onChange={setRating} />
            </label>
            <label className="review-form-label">
              Your Review
              <textarea
                placeholder="How was it?"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            {error && <p className="review-form-error">{error}</p>}
            <div className="review-form-row">
              <button type="button" className="review-form-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="review-form-submit">
                <Send size={15} /> Submit Review
              </button>
            </div>
          </form>
        )}
      </section>
    </div>,
    document.body,
  );
}

export default ProductReviewsModal;