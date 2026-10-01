import {
  Gift,
  Minus,
  PenLine,
  Plus,
  ShoppingCart,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getItemLongDescription,
  getItemOptions,
  getItemSold,
} from "./menuData";
import { useCustomerStore } from "../Customer/customerStore";
import { notify } from "../Customer/toastStore";
import { getAverageRating, useReviews } from "../Admin/Reviews/ReviewsStore";
import "./ProductModal.css";

// The Frappe Duo Deal bundles three drinks, so its option list is long.
// These items keep the modal at the same fixed height as the 3D frappe
// customizer (min(660px, 92vh)) — the info pane scrolls inside instead of
// the modal stretching nearly full screen.
const COMPACT_HEIGHT_IDS = new Set(["promo-1"]);

// Live ratings: the star rating above the description is driven by the
// customers' reviews — products without any review yet default to 5.0.
const liveRating = (item) => getAverageRating(item.id);

// Product details modal for regular menu items. Its Add to Cart button
// hands the built cart line up to the menu page — guests are asked to log
// in first, customers go straight to their cart. When opened from a "You
// Might Like" reorder card, `initialSelections` re-selects the exact
// options the customer ordered before.
function ProductModal({
  item,
  onClose,
  onAddToCart,
  onShowReviews,
  initialSelections = null,
  redeemable = false,
  onRedeemFree,
}) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState(() => initialSelections || {});
  const { customer } = useCustomerStore();
  const reviews = useReviews().filter(
    (review) => review.targetKind === "product" && review.productId === item.id,
  );
  const options = getItemOptions(item);
  const reviewCount = reviews.length;

  // Close on Escape and lock page scrolling while the modal is open.
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

  // Single-choice groups act like radios (default = defaultId or first
  // choice); multi-choice groups act like checkboxes.
  const isChosen = (group, choice) =>
    group.type === "multi"
      ? (selections[group.id] || []).includes(choice.id)
      : (selections[group.id] || group.defaultId || group.choices[0].id) ===
        choice.id;

  const toggleChoice = (group, choiceId) => {
    setSelections((current) => {
      if (group.type === "multi") {
        const chosen = current[group.id] || [];
        return {
          ...current,
          [group.id]: chosen.includes(choiceId)
            ? chosen.filter((id) => id !== choiceId)
            : [...chosen, choiceId],
        };
      }
      return { ...current, [group.id]: choiceId };
    });
  };

  // Unit price = base price + the price of every chosen extra.
  let unitPrice = item.price;
  options.forEach((group) => {
    if (group.type === "multi") {
      (selections[group.id] || []).forEach((choiceId) => {
        const choice = group.choices.find((entry) => entry.id === choiceId);
        if (choice) unitPrice += choice.price || 0;
      });
    } else {
      const choice = group.choices.find(
        (entry) =>
          entry.id ===
          (selections[group.id] || group.defaultId || group.choices[0].id),
      );
      if (choice) unitPrice += choice.price || 0;
    }
  });

  // The chosen options as readable cart lines (group + choice), e.g.
  // [{ group: "Sugar Level", choice: "50% - Half Sweet" }, ...].
  const chosenSummary = options.flatMap((group) => {
    if (group.type === "multi") {
      return (selections[group.id] || [])
        .map((choiceId) =>
          group.choices.find((choice) => choice.id === choiceId),
        )
        .filter(Boolean)
        .map((choice) => ({ group: group.label, choice: choice.label }));
    }
    const chosenId =
      selections[group.id] || group.defaultId || group.choices[0].id;
    const choice = group.choices.find((entry) => entry.id === chosenId);
    return choice ? [{ group: group.label, choice: choice.label }] : [];
  });

  const handleRedeemFree = () => {
    if (quantity > 1) {
      notify(
        "A free coffee from one digital loyalty card can only be 1 item, not 2 or more.",
        "error",
      );
      return;
    }

    onRedeemFree({
      productId: item.id,
      name: item.name,
      image: item.image,
      price: unitPrice,
      summary: chosenSummary,
    });
  };

  return (
    <div
      className="product-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        className={`product-modal${
          COMPACT_HEIGHT_IDS.has(item.id) ? " product-modal-compact" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="product-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="product-modal-media">
          <img src={item.image} alt={item.name} />
        </div>
        <div className="product-modal-info">
          <h2 id="product-modal-title">{item.name}</h2>
          <p className="product-modal-meta">
            <span
              className="product-modal-rating"
              role="button"
              tabIndex={0}
              onClick={onShowReviews}
              onKeyDown={(event) => {
                if (event.key === "Enter") onShowReviews?.();
              }}
              title="View product reviews"
            >
              <Star size={14} fill="currentColor" strokeWidth={1.5} />
              {liveRating(item).toFixed(1)}
              <span className="product-modal-rating-count">
                {reviewCount > 0 ? `(${reviewCount})` : "(0)"}
              </span>
            </span>
            <span className="product-modal-sold">
              {getItemSold(item).toLocaleString()} sold
            </span>
          </p>
          <div className="product-modal-description">
            <h3>Product Description</h3>
            <p>{getItemLongDescription(item)}</p>
          </div>
          {options.length > 0 && (
            <div className="product-modal-options">
              {options.map((group) => (
                <div className="product-modal-option-group" key={group.id}>
                  <h3>{group.label}</h3>
                  <div className="product-modal-choices">
                    {group.choices.map((choice) => {
                      const chosen = isChosen(group, choice);
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          className={`product-modal-choice${chosen ? " selected" : ""}`}
                          onClick={() => toggleChoice(group, choice.id)}
                          aria-pressed={chosen}
                        >
                          {group.type === "multi" && chosen ? "✓ " : ""}
                          {choice.label}
                          {choice.price ? <span>+₱{choice.price}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {redeemable && customer && onRedeemFree && (
            /* Sits right above the quantity stepper — one free coffee, no
               cart detour: it opens the redeem checkout directly. */
            <button
              type="button"
              className="product-modal-redeem"
              onClick={handleRedeemFree}
            >
              <Gift size={16} /> Redeem Free Coffee
            </button>
          )}
          <div className="product-modal-order">
            <p className="product-modal-price">
              <span className="product-modal-price-main">
                ₱{unitPrice * quantity}
                {item.saveLabel && (
                  <span className="product-modal-save">{item.saveLabel}</span>
                )}
                {item.originalPrice && (
                  <s className="product-modal-original">
                    ₱{item.originalPrice}
                  </s>
                )}
              </span>
              {quantity > 1 && (
                <span className="product-modal-each">₱{unitPrice} each</span>
              )}
            </p>
            <div className="product-modal-quantity" aria-label="Quantity">
              <button
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity === 1}
                aria-label="Decrease quantity"
              >
                <Minus size={15} />
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                disabled={quantity === 20}
                aria-label="Increase quantity"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
          <div className="product-modal-actions">
            <button
              className="product-modal-cart"
              onClick={() =>
                onAddToCart({
                  kind: "product",
                  productId: item.id,
                  name: item.name,
                  image: item.image,
                  price: unitPrice,
                  quantity,
                  summary: chosenSummary,
                })
              }
            >
              <ShoppingCart size={16} /> Add to Cart
            </button>
            <button
              className="product-modal-review"
              type="button"
              onClick={onShowReviews}
            >
              <PenLine size={16} /> Product Ratings
            </button>
          </div>
          <p className="product-modal-note">
            {customer
              ? "Your cart is saved on this device."
              : "Log in to add items to your cart."}
          </p>
        </div>
      </section>
    </div>
  );
}

export default ProductModal;
