import {
  Banknote,
  Bike,
  CheckCircle2,
  Gift,
  Smartphone,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  createOrder,
  createRedemptionOrder,
  removeCartLines,
  useCustomerStore,
} from "./customerStore";
import { BARANGAYS, getDeliveryFee } from "./deliveryConfig";
import { notify } from "./toastStore";
import "./CheckoutModal.css";

// Payment options per fulfillment mode — cash on pick up replaces cash on
// delivery; the wallet options stay the same.
const PAYMENT_METHODS = {
  delivery: [
    { label: "Cash on Delivery", icon: Banknote },
    { label: "GCash", icon: Smartphone },
    { label: "PayPal", icon: Wallet },
  ],
  pickup: [
    { label: "Cash on Pick Up", icon: Banknote },
    { label: "GCash", icon: Smartphone },
    { label: "PayPal", icon: Wallet },
  ],
};

// The checkout modal: pick Delivery or Pick Up, fill the delivery address (or
// reuse a saved one from the profile), choose a payment method, add optional
// notes and place the order. Placing removes the checked lines from the cart
// and stores the order with a "Pending" status for the staff side.
function CheckoutModal({ lines, onClose, redeemItem = null }) {
  // Redeem mode: a free coffee claimed through the loyalty card. The modal is
  // reused, but nothing touches the cart and the whole order totals ₱0 —
  // delivery is free to every barangay.
  const isRedeem = Boolean(redeemItem);
  const { customer } = useCustomerStore();
  const addresses = customer?.addresses || [];
  const defaultAddress = addresses.find((entry) => entry.isDefault) || null;

  const [mode, setMode] = useState("delivery");
  const [savedId, setSavedId] = useState(
    defaultAddress ? defaultAddress.id : "none",
  );
  const [address, setAddress] = useState(() =>
    defaultAddress
      ? {
          fullName: defaultAddress.fullName,
          phone: defaultAddress.phone,
          barangay: defaultAddress.barangay,
          street: defaultAddress.street,
        }
      : { fullName: "", phone: "", barangay: "", street: "" },
  );
  const [pickupName, setPickupName] = useState({
    firstName: customer?.firstName || "",
    lastName: customer?.lastName || "",
  });
  const [payment, setPayment] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);

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

  const redeemValue = isRedeem ? redeemItem.price || 0 : 0;
  const subtotal = isRedeem
    ? 0
    : lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const deliveryFee =
    isRedeem
      ? 0
      : mode === "delivery"
        ? getDeliveryFee(address.barangay)
        : 0;
  const total = subtotal + deliveryFee;

  // Choosing a saved address auto-fills the delivery inputs (still editable).
  const chooseSaved = (id) => {
    setSavedId(id);
    if (id === "none") {
      setAddress({ fullName: "", phone: "", barangay: "", street: "" });
      return;
    }
    const saved = addresses.find((entry) => entry.id === id);
    if (saved) {
      setAddress({
        fullName: saved.fullName,
        phone: saved.phone,
        barangay: saved.barangay,
        street: saved.street,
      });
    }
  };

  const handlePlaceOrder = (event) => {
    event.preventDefault();
    setError("");
    if (mode === "delivery") {
      if (!address.fullName.trim()) {
        return setError("Please enter the full name.");
      }
      if (!address.phone.trim()) {
        return setError("Please enter a phone number.");
      }
      if (address.phone.replace(/\D/g, "").length !== 11) {
        return setError("Phone number must be exactly 11 digits.");
      }
      if (!address.barangay) {
        return setError("Please choose a barangay.");
      }
      if (!address.street.trim()) {
        return setError("Please enter the street name, building, and house no.");
      }
    } else if (!pickupName.firstName.trim() || !pickupName.lastName.trim()) {
      return setError("Please enter your first and last name.");
    }
    if (!isRedeem && !payment) {
      return setError("Please choose a payment method.");
    }
    if (isRedeem) {
      const result = createRedemptionOrder({
        mode,
        address: mode === "delivery" ? address : null,
        pickupName: mode === "pickup" ? pickupName : null,
        paymentMethod: isRedeem ? "Loyalty Reward" : payment,
        notes,
        item: redeemItem,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      notify(`Free coffee claimed — order ${result.order.code}!`);
      setPlaced(result.order);
      return;
    }
    const result = createOrder({
      mode,
      items: lines,
      address: mode === "delivery" ? address : null,
      pickupName: mode === "pickup" ? pickupName : null,
      paymentMethod: payment,
      notes,
      subtotal,
      deliveryFee,
      total,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    removeCartLines(lines.map((line) => line.uid));
    notify(`Order ${result.order.code} placed — thank you!`);
    setPlaced(result.order);
  };

  // Success screen — replaces the form once the order is stored.
  if (placed) {
    return createPortal(
      <div className="checkout-backdrop" role="presentation" onClick={onClose}>
        <section
          className="checkout-modal checkout-success"
          role="dialog"
          aria-modal="true"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="checkout-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <CheckCircle2 size={54} strokeWidth={1.5} className="checkout-success-icon" />
          <h2>{isRedeem ? "Reward claimed!" : "Order placed!"}</h2>
          <p className="checkout-success-code">{placed.code}</p>
          <p className="checkout-success-text">
            {isRedeem ? (
              <>
                Your free coffee order is now <strong>Pending</strong>. Track it
                anytime in <strong>My Profile → Loyalty Card</strong>.
              </>
            ) : (
              <>
                Your {placed.mode === "delivery" ? "delivery" : "pick-up"} order
                is now <strong>Pending</strong>. Track its status anytime in{" "}
                <strong>My Profile → Orders</strong>.
              </>
            )}
          </p>
          <div className="checkout-success-total">
            <span>{isRedeem ? "Covered by loyalty card" : `Paying via ${placed.paymentMethod}`}</span>
            <strong>
              {isRedeem ? "FREE" : `₱${placed.total.toLocaleString()}`}
            </strong>
          </div>
          <button type="button" className="checkout-place" onClick={onClose}>
            {isRedeem ? "Done" : "Back to cart"}
          </button>
        </section>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="checkout-backdrop" role="presentation" onClick={onClose}>
      <section
        className="checkout-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="checkout-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h2 id="checkout-title">
          {isRedeem ? "Redeem Free Coffee" : "Checkout"}
        </h2>
        <p className="checkout-subtitle">
          {isRedeem
            ? `${redeemItem.name} — 1 free coffee, covered by your loyalty card.`
            : `${lines.length} ${lines.length === 1 ? "item" : "items"} selected for checkout.`}
        </p>
        {isRedeem && (
          <p className="checkout-loyalty-note">
            <Gift size={15} /> Loyalty reward — delivery is FREE to every
            barangay, or claim it in-store via pick up.
          </p>
        )}

        <form onSubmit={handlePlaceOrder} noValidate>
          {/* Delivery / Pick Up */}
          <div className="checkout-modes">
            <button
              type="button"
              className={`checkout-mode${mode === "delivery" ? " selected" : ""}`}
              onClick={() => {
                setMode("delivery");
                setPayment("");
              }}
            >
              <Bike size={20} strokeWidth={1.8} />
              <span>Delivery</span>
              <small>Delivered to your address</small>
            </button>
            <button
              type="button"
              className={`checkout-mode${mode === "pickup" ? " selected" : ""}`}
              onClick={() => {
                setMode("pickup");
                setPayment("");
              }}
            >
              <Store size={20} strokeWidth={1.8} />
              <span>Pick Up</span>
              <small>Collect at the café</small>
            </button>
          </div>

          {mode === "delivery" ? (
            <div className="checkout-section">
              <h3>Delivery address</h3>
              {addresses.length > 0 && (
                <label className="checkout-field">
                  Saved addresses
                  <select value={savedId} onChange={(e) => chooseSaved(e.target.value)}>
                    <option value="none">None — enter a new address</option>
                    {addresses.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.fullName} — {entry.street}, {entry.barangay}
                        {entry.isDefault ? " (Default)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="checkout-grid-2">
                <label className="checkout-field">
                  Full Name
                  <input
                    type="text"
                    value={address.fullName}
                    onChange={(e) =>
                      setAddress({ ...address, fullName: e.target.value })
                    }
                    placeholder="Recipient's full name"
                  />
                </label>
                <label className="checkout-field">
                  Phone Number
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={address.phone}
                    onChange={(e) =>
                      setAddress({
                        ...address,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 11),
                      })
                    }
                    placeholder="09XXXXXXXXX"
                  />
                </label>
              </div>
              <label className="checkout-field">
                Baranggay
                <select
                  value={address.barangay}
                  onChange={(e) =>
                    setAddress({ ...address, barangay: e.target.value })
                  }
                >
                  <option value="">Select a barangay…</option>
                  {BARANGAYS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkout-field">
                Street Name, Building, House No.
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) =>
                    setAddress({ ...address, street: e.target.value })
                  }
                  placeholder="e.g. Rizal St., Blue Gate Bldg., Lot 12"
                />
              </label>
            </div>
          ) : (
            <div className="checkout-section">
              <h3>Pick up details</h3>
              <p className="checkout-section-note">
                Collect your order at Cafétcha, Hagonoy, Bulacan — we'll let you
                know once it's ready.
              </p>
              <div className="checkout-grid-2">
                <label className="checkout-field">
                  First Name
                  <input
                    type="text"
                    value={pickupName.firstName}
                    onChange={(e) =>
                      setPickupName({ ...pickupName, firstName: e.target.value })
                    }
                  />
                </label>
                <label className="checkout-field">
                  Last Name
                  <input
                    type="text"
                    value={pickupName.lastName}
                    onChange={(e) =>
                      setPickupName({ ...pickupName, lastName: e.target.value })
                    }
                  />
                </label>
              </div>
            </div>
          )}

          {/* Free loyalty rewards do not need a payment method. */}
          {!isRedeem && (
            <div className="checkout-section">
              <h3>Payment method</h3>
              <div className="checkout-payments">
                {PAYMENT_METHODS[mode].map(({ label, icon: Icon }) => (
                  <button
                    type="button"
                    key={label}
                    className={`checkout-payment${payment === label ? " selected" : ""}`}
                    onClick={() => setPayment(label)}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="checkout-field">
            Order Notes <small>(optional)</small>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Less ice, extra napkins, call on arrival…"
            />
          </label>

          {/* Totals */}
          <div className="checkout-totals">
            <div>
              <span>Subtotal</span>
              <strong>
                {isRedeem ? (
                  <>
                    <s>₱{redeemValue.toLocaleString()}</s> FREE
                  </>
                ) : (
                  `₱${subtotal.toLocaleString()}`
                )}
              </strong>
            </div>
            {mode === "delivery" && (
              <div>
                <span>Delivery fee</span>
                <strong>
                  {isRedeem
                    ? "FREE"
                    : address.barangay
                      ? deliveryFee === 0
                        ? "FREE"
                        : `₱${deliveryFee}`
                      : "—"}
                </strong>
              </div>
            )}
            <div className="checkout-grand">
              <span>Total</span>
              <strong>
                {isRedeem ? "FREE" : `₱${total.toLocaleString()}`}
              </strong>
            </div>
          </div>

          {error && <p className="checkout-error">{error}</p>}
          <button type="submit" className="checkout-place">
            {isRedeem
              ? "Claim Free Coffee"
              : `Place Order • ₱${total.toLocaleString()}`}
          </button>
        </form>
      </section>
    </div>,
    document.body,
  );
}

export default CheckoutModal;
