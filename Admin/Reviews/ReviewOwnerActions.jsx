import { Trash2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { deleteCustomerReview } from "./ReviewsStore";
import { notify } from "../../Customer/toastStore";

export default function ReviewOwnerActions({
  review,
  customerId,
  compact = false,
  showReply = true,
  showButton = true,
  inline = false,
}) {
  const [confirm, setConfirm] = useState(false);
  if (!customerId || review.customerId !== customerId) {
    return !compact && showReply && review.reply ? (
      <div className="review-admin-reply"><strong>Cafétcha reply</strong><p>{review.reply}</p></div>
    ) : null;
  }

  const remove = () => {
    const result = deleteCustomerReview(review.id);
    notify(
      result.ok ? "Your review was deleted." : result.error,
      result.ok ? "success" : "error",
    );
    setConfirm(false);
  };

  return (
    <>
      {!compact && showReply && review.reply && (
        <div className="review-admin-reply"><strong>Cafétcha reply</strong><p>{review.reply}</p></div>
      )}
      {showButton !== false && (
        <button
          type="button"
          className={`review-owner-delete${compact ? " compact" : ""}${inline ? " inline" : ""}`}
          onClick={() => setConfirm(true)}
          aria-label="Delete your review"
          title="Delete your review"
        >
          <Trash2 size={14} />
        </button>
      )}
      {confirm && createPortal(
        <div className="review-modal-backdrop" role="presentation" onClick={() => setConfirm(false)}>
          <div className="review-delete-confirm" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <Trash2 size={28} />
            <h3>Delete your review?</h3>
            <p>This review will be permanently removed. This cannot be undone.</p>
            <div>
              <button type="button" onClick={() => setConfirm(false)}>Keep Review</button>
              <button type="button" className="danger" onClick={remove}>Yes, Delete</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}