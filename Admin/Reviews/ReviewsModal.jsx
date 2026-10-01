import { Quote, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import ReviewOwnerActions from "./ReviewOwnerActions";
import {
  StarsDisplay,
  useReviews,
} from "./ReviewsStore";
import { useCustomerStore } from "../../Customer/customerStore";
import "./reviews.css";

// "See All Reviews" modal — shows every store-wide review. Both guests and
// customers can view it (view-only; writing happens from the Write a Review
// button on the homepage section).
function ReviewsModal({ onClose }) {
  const { customer } = useCustomerStore();
  const reviews = useReviews().filter(
    (review) => review.targetKind === "store",
  );
  const sorted = [...reviews].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

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

  const initials = (name) =>
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return createPortal(
    <div className="review-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reviews-modal-title"
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
          <h2 id="reviews-modal-title">All Reviews</h2>
          <p>What our customers are saying about Cafétcha.</p>
        </div>

        <div className="review-modal-list">
          {sorted.length === 0 ? (
            <div className="review-modal-empty">
              <Quote size={26} strokeWidth={1.5} />
              <p>No reviews yet — be the first to share your experience!</p>
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
      </section>
    </div>,
    document.body,
  );
}

export default ReviewsModal;