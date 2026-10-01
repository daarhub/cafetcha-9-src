import { Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { addReview, StarRatingInput } from "./ReviewsStore";
import { useCustomerStore } from "../../Customer/customerStore";
import { notify } from "../../Customer/toastStore";
import "./reviews.css";

// Write-a-Review modal — interactively pick 1-5 stars (they fill with color
// as you hover/click) and type a review. Only logged-in customers can post.
function WriteReviewModal({ onClose, onRequireLogin }) {
  const { customer } = useCustomerStore();
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
    if (!customer) {
      onRequireLogin?.();
      return;
    }
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
      targetKind: "store",
      productId: null,
      targetKey: "store",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    notify("Thank you! Your review was posted.");
    onClose();
  };

  return createPortal(
    <div className="review-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="write-review-title"
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
          <h2 id="write-review-title">Write a Review</h2>
          <p>Tell everyone about your Cafétcha experience.</p>
        </div>

        <form className="review-form" onSubmit={handleSubmit}>
          <label className="review-form-label">
            Your Rating
            <StarRatingInput rating={rating} onChange={setRating} />
          </label>
          <label className="review-form-label">
            Your Review
            <textarea
              placeholder="Share your experience…"
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
      </section>
    </div>,
    document.body,
  );
}

export default WriteReviewModal;