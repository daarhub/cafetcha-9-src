import { Search, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminConfirmDialog from "./AdminConfirmDialog";
import { notify } from "../Customer/toastStore";
import {
  deleteReview,
  markAllReviewsAdminRead,
  markReviewAdminRead,
  replyToReview,
  setReviewAdminRead,
  useReviews,
} from "./Reviews/ReviewsStore";
import { getAllManagedMenuItems } from "../MenuGuest/menuAvailabilityStore";
import "./AdminReviews.css";

function AdminReviewCard({
  review,
  image,
  isReplying,
  unread,
  onReply,
  onDelete,
  onToggleRead,
  children,
}) {
  return (
    <article className={`admin-review-card${unread ? " is-new" : ""}`}>
      <header>
        <div className="admin-review-card-title">
          <strong>{review.customerName}</strong>
          <span>{image ? "Product review" : "What Our Customers Say"}</span>
        </div>
        <div className="admin-review-head-actions">
          <span
            className={`admin-review-read-label ${unread ? "unread" : "read"}`}
          >
            {unread ? "Unread" : "Read"}
          </span>
          <span className="admin-review-rating">{review.rating}/5</span>
        </div>
      </header>
      <div className="admin-review-stars">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={15}
            fill={i < review.rating ? "currentColor" : "none"}
          />
        ))}
      </div>
      <p>{review.text}</p>
      {review.reply && !isReplying && (
        <div className="admin-review-reply">
          <strong>Cafétcha reply</strong>
          <p>{review.reply}</p>
        </div>
      )}
      {children}
      <footer>
        <time>{new Date(review.createdAt).toLocaleString()}</time>
        <div>
          <button type="button" onClick={onToggleRead}>
            {unread ? "Mark as read" : "Mark as unread"}
          </button>
          <button type="button" onClick={onReply}>
            {review.reply ? "Edit reply" : "Reply"}
          </button>
          <button type="button" className="danger" onClick={onDelete}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </footer>
    </article>
  );
}

function AdminReviews() {
  const reviews = useReviews();
  const menuById = new Map(
    getAllManagedMenuItems().map((item) => [item.id, item]),
  );
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState("All reviews");
  const [starSort, setStarSort] = useState("Newest");
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Local mirror of each review's read flag. The store is the source of truth,
  // but mirroring it here guarantees the label and button flip on the very
  // click even while the persisted record refreshes.
  const [readState, setReadState] = useState({});
  const isUnread = (review) =>
    Object.prototype.hasOwnProperty.call(readState, review.id)
      ? readState[review.id] === false
      : review.adminRead === false;
  const normalized = query.trim().toLowerCase();
  const visible = reviews.filter((review) => {
    const product = menuById.get(review.productId);
    const text = [
      review.customerName,
      review.text,
      product?.name,
      review.targetKind,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const typeMatches =
      target === "All reviews" ||
      (target === "Store reviews" && review.targetKind === "store") ||
      (target === "Product reviews" && review.targetKind === "product");
    return (
      typeMatches &&
      (starSort === "Newest" || review.rating === Number(starSort)) &&
      (!normalized || text.includes(normalized))
    );
  });
  const sorted = (list) =>
    [...list].sort((a, b) =>
      starSort === "Newest"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt),
    );
  const storeReviews = sorted(
    visible.filter((review) => review.targetKind === "store"),
  );
  const productGroups = Array.from(
    visible
      .filter((review) => review.targetKind === "product")
      .reduce((map, review) => {
        const id = review.productId || "deleted-product";
        if (!map.has(id)) map.set(id, []);
        map.get(id).push(review);
        return map;
      }, new Map()),
  ).map(([id, list]) => ({
    id,
    product: menuById.get(id),
    reviews: sorted(list),
  }));
  const openReply = (review) => {
    markReviewAdminRead(review.id);
    setReplying(review.id);
    setReplyText(review.reply || "");
  };
  const saveReply = () => {
    if (!replyText.trim())
      return notify("Please write a reply first.", "error");
    const result = replyToReview(replying, replyText);
    notify(
      result.ok ? "Reply saved and sent to the customer." : result.error,
      result.ok ? "success" : "error",
    );
    if (result.ok) {
      setReplying(null);
      setReplyText("");
    }
  };
  const unreadCount = reviews.filter((review) => isUnread(review)).length;
  const toggleRead = (review) => {
    // Currently unread -> becomes read, and vice versa. The label and the
    // button label both follow this new value.
    const nextRead = isUnread(review);
    setReadState((current) => ({ ...current, [review.id]: nextRead }));
    const result = setReviewAdminRead(review.id, nextRead);
    if (!result.ok) {
      setReadState((current) => ({ ...current, [review.id]: !nextRead }));
      notify(result.error, "error");
      return;
    }
    notify(nextRead ? "Review marked as read." : "Review marked as unread.");
  };
  const markAllRead = () => {
    const result = markAllReviewsAdminRead();
    if (!result.ok) return;
    setReadState({});
    notify("All reviews were marked as read.");
  };
  const remove = () => {
    const result = deleteReview(confirmDelete.id);
    notify(
      result.ok ? "Review deleted." : result.error,
      result.ok ? "success" : "error",
    );
    setConfirmDelete(null);
  };
  const card = (review, image = false) => (
    <AdminReviewCard
      key={review.id}
      review={review}
      image={image}
      isReplying={replying === review.id}
      unread={isUnread(review)}
      onReply={() => openReply(review)}
      onDelete={() => setConfirmDelete(review)}
      onToggleRead={() => toggleRead(review)}
    >
      {replying === review.id && (
        <div className="admin-review-reply-editor">
          <textarea
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            rows={4}
            placeholder="Reply to this review..."
            autoFocus
          />
          <div>
            <button type="button" onClick={() => setReplying(null)}>
              <X size={14} /> Cancel
            </button>
            <button type="button" onClick={saveReply}>
              Save reply
            </button>
          </div>
        </div>
      )}
    </AdminReviewCard>
  );

  return (
    <>
      <AdminSidebar />
      <main className="admin-management-page admin-reviews-page">
        <header className="admin-management-header">
          <div>
            <span>ADMIN PANEL / REVIEWS</span>
            <h1>Reviews</h1>
            <p>Manage store and product reviews from What Our Customers Say.</p>
          </div>
          <div className="admin-review-header-actions">
            <span className="admin-review-unread-count">
              {unreadCount} unread
            </span>
            <button
              className="admin-primary-button"
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
            >
              Mark all as read
            </button>
          </div>
        </header>
        <section className="admin-management-summary">
          <article>
            <span>Total reviews</span>
            <strong>{reviews.length}</strong>
            <small>Store and product feedback</small>
          </article>
          <article>
            <span>Store reviews</span>
            <strong>
              {reviews.filter((review) => review.targetKind === "store").length}
            </strong>
            <small>What Our Customers Say</small>
          </article>
          <article>
            <span>Product reviews</span>
            <strong>
              {
                reviews.filter((review) => review.targetKind === "product")
                  .length
              }
            </strong>
            <small>Individual menu items</small>
          </article>
        </section>
        <section className="admin-management-panel">
          <div className="admin-management-toolbar admin-review-filters">
            <label>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search customer, product, or review"
              />
            </label>
            <select
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              <option>All reviews</option>
              <option>Store reviews</option>
              <option>Product reviews</option>
            </select>
            <select
              value={starSort}
              onChange={(event) => setStarSort(event.target.value)}
            >
              <option>Newest</option>
              {[5, 4, 3, 2, 1].map((star) => (
                <option key={star} value={star}>
                  {star} star{star === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>
          {(target === "All reviews" || target === "Store reviews") && (
            <section className="admin-review-section">
              <h2>Store Reviews</h2>
              <p>Reviews shown in What Our Customers Say.</p>
              <div className="admin-review-list">
                {storeReviews.map((review) => card(review))}
              </div>
            </section>
          )}
          {(target === "All reviews" || target === "Product reviews") &&
            productGroups.map((group) => (
              <section
                className="admin-review-section admin-product-review-section"
                key={group.id}
              >
                <header>
                  <div className="admin-product-review-image">
                    <img
                      src={group.product?.image || "/images/logo.png"}
                      alt=""
                    />
                  </div>
                  <div>
                    <h2>{group.product?.name || "Deleted product"}</h2>
                    <p>
                      {group.reviews.length} review
                      {group.reviews.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </header>
                <div className="admin-review-list">
                  {group.reviews.map((review) => card(review, true))}
                </div>
              </section>
            ))}
          {!visible.length && (
            <p className="admin-empty">No reviews matched your filters.</p>
          )}
        </section>
      </main>
      {confirmDelete && (
        <AdminConfirmDialog
          title="Delete this review?"
          message="This review will be permanently removed from customer and product displays."
          confirmLabel="Yes, delete"
          icon={Trash2}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}

export default AdminReviews;
