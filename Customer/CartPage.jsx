import { Pencil, ShoppingCart, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Header from "../HomepageGuest/Header";
import Footer from "../HomepageGuest/Footer";
import AuthModal from "./AuthModal";
import CartEditModal from "./CartEditModal";
import CheckoutModal from "./CheckoutModal";
import {
  getCartTotal,
  removeCartLines,
  useCustomerStore,
} from "./customerStore";
import { notify } from "./toastStore";
import {
  isMenuItemAvailable,
  useMenuAvailability,
} from "../MenuGuest/menuAvailabilityStore";
import "./CartPage.css";

// Some older customizer step titles ended with a colon (e.g. "Add-ons:")
// which doubled up when the cart renders "group: choices" — strip trailing
// colons so summaries saved before the fix also display with one colon.
const cleanGroupLabel = (label) => String(label || "").replace(/:\s*$/, "");

// Collapse a flat summary ([{ group, choice }, ...]) into one row per
// option group — e.g. "Choose your burger fillings: Crispy Chicken,
// Beef Patty, Bacon". Groups keep the order they first appear in and
// choices keep their selection order; duplicate choices are dropped.
const groupSummary = (summary) => {
  const byGroup = new Map();
  (summary || []).forEach(({ group, choice }) => {
    const label = cleanGroupLabel(group);
    if (!byGroup.has(label)) byGroup.set(label, []);
    const choices = byGroup.get(label);
    if (!choices.includes(choice)) choices.push(choice);
  });
  return [...byGroup].map(([group, choices]) => ({ group, choices }));
};

// The cart as its own full page (/cart) — plenty of room for large product
// images, editing every chosen option (size, sugar level, custom builds...),
// removing lines and checking out the selected items. Every action pops a
// toast notification.
function CartPage() {
  const { customer, cart } = useCustomerStore();
  const menuAvailability = useMenuAvailability();
  const [authOpen, setAuthOpen] = useState(false);
  const [editingUid, setEditingUid] = useState(null);
  // Which lines are checked for checkout — everything starts selected.
  const [selected, setSelected] = useState(() => cart.map((line) => line.uid));
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // Snapshot of the checked lines taken when checkout opens. Placing the
  // order empties the cart, and without the snapshot the modal (including
  // its success screen) would be unmounted the moment the store updates.
  const [checkoutLines, setCheckoutLines] = useState([]);
  // Confirmation modal for deletes — holds the uids to remove and, for a
  // single line, its name (null = closed). Used by both the per-line
  // "Delete" buttons and the bulk "Delete selected" action.
  const [confirmDelete, setConfirmDelete] = useState(null);
  const selectAllRef = useRef(null);

  const editingLine = cart.find((line) => line.uid === editingUid) || null;
  const availableCartLines = cart.filter((line) =>
    isMenuItemAvailable(line.productId),
  );
  const selectedLines = availableCartLines.filter((line) =>
    selected.includes(line.uid),
  );
  const selectedTotal = getCartTotal(selectedLines);
  const allSelected =
    availableCartLines.length > 0 &&
    selectedLines.length === availableCartLines.length;
  const someSelected = selectedLines.length > 0 && !allSelected;
  const unavailableCount = cart.length - availableCartLines.length;

  // Keep the selection in sync when lines are deleted (or checked out).
  useEffect(() => {
    setSelected((prev) => {
      const valid = prev.filter((uid) =>
        availableCartLines.some((line) => line.uid === uid),
      );
      return valid.length === prev.length ? prev : valid;
    });
  }, [cart, menuAvailability]); // eslint-disable-line react-hooks/exhaustive-deps

  // The select-all box shows the indeterminate state on partial selection.
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleLine = (uid) =>
    setSelected((prev) =>
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid],
    );

  const toggleAll = () =>
    setSelected(allSelected ? [] : availableCartLines.map((line) => line.uid));

  return (
    <>
      <Header />
      <main className="cart-page">
        <section className="cart-hero">
          <p className="cart-crumb">Home / Cart</p>
          <h1>YOUR CART</h1>
          <p>
            {customer
              ? cart.length > 0
                ? "Review your order — edit or delete items anytime."
                : "Your cart is waiting to be filled."
              : "Log in to see the cart saved to your account."}
          </p>
        </section>

        <section className="cart-body">
          {!customer ? (
            <div className="cart-gate">
              <ShoppingCart size={42} strokeWidth={1.5} />
              <h2>Log in to view your cart</h2>
              <p>Your cart is saved per account on this device.</p>
              <button type="button" onClick={() => setAuthOpen(true)}>
                Login / Sign Up
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="cart-gate">
              <ShoppingCart size={42} strokeWidth={1.5} />
              <h2>Your cart is empty</h2>
              <p>Add something tasty from the menu.</p>
              <a className="cart-browse" href="/menu">
                Browse the menu
              </a>
            </div>
          ) : (
            <div className="cart-layout">
              <div className="cart-lines-col">
                <div className="cart-select-all">
                  <input
                    ref={selectAllRef}
                    id="cart-select-all"
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                  <label htmlFor="cart-select-all">Select all</label>
                  <span>
                    {selected.length} of {availableCartLines.length}{" "}
                    {cart.length === 1 ? "item" : "items"} selected
                  </span>
                  <button
                    type="button"
                    className="cart-delete-selected"
                    disabled={selected.length === 0}
                    onClick={() => setConfirmDelete({ uids: selected })}
                  >
                    <Trash2 size={13} /> Delete selected
                  </button>
                </div>

                <ul className="cart-lines">
                  {cart.map((line) => {
                    // One bullet row per option group — choices joined
                    // with commas so each extra group gets its own line.
                    const groupedSummary = groupSummary(line.summary);
                    const unavailable = !isMenuItemAvailable(line.productId);
                    return (
                    <li
                      className={`cart-line-card${unavailable ? " cart-line-unavailable" : ""}`}
                      key={line.uid}
                    >
                      <input
                        type="checkbox"
                        className="cart-line-check"
                        aria-label={`Select ${line.name}`}
                        checked={selected.includes(line.uid)}
                        disabled={unavailable}
                        onChange={() => toggleLine(line.uid)}
                      />
                      <span className="cart-line-thumb">
                        <img src={line.image} alt={line.name} />
                      </span>
                    <div className="cart-line-main">
                      <p className="cart-line-name">
                        {line.name}
                        {line.kind === "customize" && (
                          <span className="cart-line-tag">Custom</span>
                        )}
                         {unavailable && (
                           <span className="cart-line-unavailable-tag">
                             Not available
                           </span>
                         )}

                      </p>
                      {groupedSummary.length > 0 && (
                        <ul className="cart-line-summary">
                          {groupedSummary.map(({ group, choices }) => (
                            <li key={group}>
                              {group}: {choices.join(", ")}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="cart-line-price">
                        ₱{line.price.toLocaleString()} each
                      </p>
                      <div className="cart-line-actions">
                        <button
                          type="button"
                          className="cart-line-edit"
                          disabled={unavailable}
                          onClick={() => setEditingUid(line.uid)}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          className="cart-line-delete"
                          onClick={() =>
                            // Confirm before removing — no accidental deletes.
                            setConfirmDelete({ uids: [line.uid], name: line.name })
                          }
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                    {/* Quantity right beside the total price — e.g. ×6 — ₱654 */}
                    <strong className="cart-line-total">
                      {line.quantity > 1 && (
                        <span className="cart-line-total-qty">
                          ×{line.quantity}
                        </span>
                      )}
                      ₱{(line.price * line.quantity).toLocaleString()}
                    </strong>
                  </li>
                    );
                  })}
                </ul>
              </div>

              <aside className="cart-summary">
                <h3>Order Summary</h3>
                <div className="cart-summary-row">
                  <span>Selected</span>
                  <strong>
                    {selectedLines.length} of {availableCartLines.length}
                  </strong>
                </div>
                <div className="cart-summary-row">
                  <span>Subtotal</span>
                  <strong>₱{selectedTotal.toLocaleString()}</strong>
                </div>
                {unavailableCount > 0 && (
                  <p className="cart-unavailable-warning">
                    {unavailableCount} item{unavailableCount === 1 ? " is" : "s are"} currently unavailable. Please remove unavailable item{unavailableCount === 1 ? "" : "s"} before checkout.
                  </p>
                )}
                <div className="cart-summary-row cart-summary-total">
                  <span>Total</span>
                  <strong>₱{selectedTotal.toLocaleString()}</strong>
                </div>
                <button
                  type="button"
                  className="cart-checkout-btn"
                  disabled={selectedLines.length === 0 || unavailableCount > 0}
                  onClick={() => {
                    // Snapshot the checked lines — the cart empties while
                    // the order is being placed, and the modal must survive
                    // that update to show its success screen.
                    setCheckoutLines(selectedLines);
                    setCheckoutOpen(true);
                  }}
                >
                  Checkout Order
                </button>
                <a className="cart-summary-continue" href="/menu">
                  Continue shopping
                </a>
              </aside>
            </div>
          )}
        </section>
      </main>
      <Footer />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {editingLine && (
        <CartEditModal line={editingLine} onClose={() => setEditingUid(null)} />
      )}
      {confirmDelete && (
        <div
          className="cart-confirm-backdrop"
          role="presentation"
          onClick={() => setConfirmDelete(null)}
        >
          <section
            className="cart-confirm-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="cart-confirm-close"
              aria-label="Close"
              onClick={() => setConfirmDelete(null)}
            >
              <X size={18} />
            </button>
            <h3>
              {confirmDelete.name
                ? "Delete this item?"
                : "Delete selected items?"}
            </h3>
            <p>
              This will permanently remove{" "}
              <strong>
                {confirmDelete.name ||
                  `${confirmDelete.uids.length} ${
                    confirmDelete.uids.length === 1 ? "item" : "items"
                  }`}
              </strong>{" "}
              from your cart.
            </p>
            <div className="cart-confirm-actions">
              <button
                type="button"
                className="cart-confirm-cancel"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cart-confirm-delete"
                onClick={() => {
                  removeCartLines(confirmDelete.uids);
                  notify(
                    confirmDelete.name
                      ? `${confirmDelete.name} deleted from cart.`
                      : `${confirmDelete.uids.length} ${
                          confirmDelete.uids.length === 1 ? "item" : "items"
                        } deleted from cart.`,
                    "info",
                  );
                  setSelected((prev) =>
                    prev.filter((uid) => !confirmDelete.uids.includes(uid)),
                  );
                  setConfirmDelete(null);
                }}
              >
                Yes, delete
              </button>
            </div>
          </section>
        </div>
      )}
      {checkoutOpen && checkoutLines.length > 0 && (
        <CheckoutModal
          lines={checkoutLines}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </>
  );
}
export default CartPage;