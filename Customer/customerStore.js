import { useSyncExternalStore } from "react";
import { isMenuItemAvailable, getAllManagedMenuItems } from "../MenuGuest/menuAvailabilityStore";
import { notify } from "./toastStore";

// ---------------------------------------------------------------------------
// Customer store — a tiny localStorage "database" for the customer side.
//
// Three collections:
// - cafetcha-customers : every registered account
//     [{ id, firstName, lastName, email, password, createdAt }]
// - cafetcha-session   : id of the currently logged in customer (or null)
// - cafetcha-carts     : one saved cart per customer id
//     { [customerId]: [cartLine, ...] }
//
// A cart line looks like:
//     { uid, kind: "product" | "customize", productId, name, image,
//       price, quantity, summary: [{ group, choice }], config, addedAt }
// "product" lines come from the product modal; "customize" lines come from
// the 3D customizers and keep the chosen options in `config` plus the name
// the customer typed for their build (the cart shows the customize card's
// image, never a 3D render).
//
// Every write bumps a version counter and notifies subscribers, so React
// components re-render through useCustomerStore().
// ---------------------------------------------------------------------------

const CUSTOMERS_KEY = "cafetcha-customers";
const SESSION_KEY = "cafetcha-session";
const CARTS_KEY = "cafetcha-carts";
const RESET_CODES_KEY = "cafetcha-reset-codes";

const listeners = new Set();
let version = 0;

const emitChange = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

export const subscribeToCustomerStore = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getCustomerStoreVersion = () => version;

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

const makeId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

// ---------- Accounts ----------

// Read-only look at every registered account. The admin dashboard uses this
// for its "Total Customers" stat — nothing here changes the list.
export const getAllCustomers = () => readJSON(CUSTOMERS_KEY, []);

export const registerCustomer = ({ firstName, lastName, email, password }) => {
  const customers = readJSON(CUSTOMERS_KEY, []);
  const normalizedEmail = email.trim().toLowerCase();
  if (customers.some((entry) => entry.email === normalizedEmail)) {
    return {
      ok: false,
      error: "That email address already has an account — try logging in.",
    };
  }
  const customer = {
    id: makeId("cust"),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    password,
    createdAt: new Date().toISOString(),
  };
  writeJSON(CUSTOMERS_KEY, [...customers, customer]);
  // The customer must log in with their new account — signing up never
  // logs them in automatically.
  return { ok: true, customer };
};

export const loginCustomer = ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const customer = readJSON(CUSTOMERS_KEY, []).find(
    (entry) => entry.email === normalizedEmail,
  );
  if (!customer || customer.password !== password) {
    return { ok: false, error: "Incorrect email or password." };
  }
  if (customer.accountEnabled === false) {
    return { ok: false, error: "This customer account is disabled." };
  }
  writeJSON(SESSION_KEY, customer.id);
  return { ok: true, customer };
};

export const logoutCustomer = () => {
  writeJSON(SESSION_KEY, null);
};

export const getCurrentCustomer = () => {
  const sessionId = readJSON(SESSION_KEY, null);
  if (!sessionId) return null;
  const customer =
    readJSON(CUSTOMERS_KEY, []).find((entry) => entry.id === sessionId) || null;
  if (customer?.accountEnabled === false) {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore unavailable storage.
    }
    return null;
  }
  return customer;
};

// ---------- Cart ----------

export const getCart = () => {
  const customer = getCurrentCustomer();
  if (!customer) return [];
  return readJSON(CARTS_KEY, {})[customer.id] || [];
};

export const getCartCount = (cart) =>
  // The badge counts distinct lines, not summed quantities — ordering 5x of
  // the same Spanish Latte is one line, so the count stays 1.
  cart.length;

export const getCartTotal = (cart) =>
  cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

export const addToCart = (item) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  if (!isMenuItemAvailable(item.productId)) {
    return {
      ok: false,
      error: `${item.name || "This menu item"} is currently unavailable.`,
    };
  }
  const carts = readJSON(CARTS_KEY, {});
  const cart = carts[customer.id] || [];
  if ((item.kind || "product") === "product") {
    // Identical product lines (same item, same choices, same unit price)
    // merge into one line instead of piling up duplicates.
    const signature = JSON.stringify([
      item.productId,
      item.summary,
      item.price,
    ]);
    const existing = cart.find(
      (line) =>
        line.kind === "product" &&
        JSON.stringify([line.productId, line.summary, line.price]) ===
          signature,
    );
    if (existing) {
      existing.quantity = Math.min(
        20,
        existing.quantity + (item.quantity || 1),
      );
      carts[customer.id] = cart;
      writeJSON(CARTS_KEY, carts);
      return { ok: true };
    }
  }
  cart.push({
    uid: makeId("line"),
    kind: item.kind || "product",
    productId: item.productId,
    name: item.name,
    image: item.image,
    price: item.price,
    quantity: item.quantity || 1,
    summary: item.summary || [],
    config: item.config || null,
    addedAt: new Date().toISOString(),
  });
  carts[customer.id] = cart;
  writeJSON(CARTS_KEY, carts);
  return { ok: true };
};

export const setCartLineQuantity = (uid, quantity) => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const carts = readJSON(CARTS_KEY, {});
  const cart = carts[customer.id] || [];
  const line = cart.find((entry) => entry.uid === uid);
  if (line) {
    line.quantity = Math.min(20, Math.max(1, quantity));
    carts[customer.id] = cart;
    writeJSON(CARTS_KEY, carts);
  }
};

export const removeCartLine = (uid) => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const carts = readJSON(CARTS_KEY, {});
  carts[customer.id] = (carts[customer.id] || []).filter(
    (entry) => entry.uid !== uid,
  );
  writeJSON(CARTS_KEY, carts);
};

// Used by the cart's Edit function: merges new quantity / price / summary /
// config / name into one saved line.
export const updateCartLine = (uid, changes) => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const carts = readJSON(CARTS_KEY, {});
  const cart = carts[customer.id] || [];
  const line = cart.find((entry) => entry.uid === uid);
  if (line) {
    Object.assign(line, changes);
    carts[customer.id] = cart;
    writeJSON(CARTS_KEY, carts);
  }
};

// ---------- Password reset (demo — verification codes live in localStorage;
// a real backend would email them instead of surfacing them in the UI) ------

export const requestPasswordReset = (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const customer = readJSON(CUSTOMERS_KEY, []).find(
    (entry) => entry.email === normalizedEmail,
  );
  if (!customer) {
    return { ok: false, error: "No account uses that email address." };
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codes = readJSON(RESET_CODES_KEY, {});
  codes[normalizedEmail] = { code, requestedAt: new Date().toISOString() };
  writeJSON(RESET_CODES_KEY, codes);
  return { ok: true, code };
};

export const verifyResetCode = (email, code) => {
  const normalizedEmail = email.trim().toLowerCase();
  const saved = readJSON(RESET_CODES_KEY, {})[normalizedEmail];
  return Boolean(saved && saved.code === String(code).trim());
};

export const resetPassword = (email, newPassword) => {
  const normalizedEmail = email.trim().toLowerCase();
  const customers = readJSON(CUSTOMERS_KEY, []);
  const customer = customers.find(
    (entry) => entry.email === normalizedEmail,
  );
  if (!customer) {
    return { ok: false, error: "No account uses that email address." };
  }
  customer.password = newPassword;
  writeJSON(CUSTOMERS_KEY, customers);
  const codes = readJSON(RESET_CODES_KEY, {});
  delete codes[normalizedEmail];
  writeJSON(RESET_CODES_KEY, codes);
  return { ok: true };
};

// Turns customizer wizard selections into readable cart lines, e.g.
// [{ group: "Sugar Levels", choice: "50% - Half Sweet" }, ...]. The 3D
// customizers call this with their own steps data before handing their
// payload up to the menu page.
export const summarizeSelections = (steps, selections, getOption) =>
  steps.flatMap((step) => {
    const chosenIds =
      step.type === "multi"
        ? selections[step.key] || []
        : [selections[step.key] || step.options[0].id];
    return chosenIds
      .map((id) => getOption(step.key, id))
      .filter(Boolean)
      .map((option) => ({ group: step.title, choice: option.name }));
  });

// ---------- Customized item auto-naming ----------
// When a customer leaves the customizer's name field blank, the item is
// auto-named "Customized <Kind> N". The number continues from the highest
// number already used for that kind — in the current cart AND in the order
// history — so "Customized Cheesecake 1" is followed by 2, 3, 4... even
// across separate orders and sessions.

const CUSTOMIZE_KINDS = {
  "custom-frappe": "Frappe",
  "custom-tea": "Tea",
  "custom-sandwich": "Sandwich",
  "custom-burger": "Burger",
  "custom-cheesecake": "Cheesecake",
  "custom-icecream": "Ice Cream",
};

export const resolveCustomizedName = (customizeId, providedName) => {
  const kind = CUSTOMIZE_KINDS[customizeId];
  if (!kind) return (providedName || "").trim() || "Custom order";
  const pattern = new RegExp(`^Customized ${kind} (\\d+)$`, "i");
  // A name the customer actually typed is kept exactly as they wrote it —
  // only the auto-generated "Customized <Kind> N" names are renumbered.
  if (providedName && !pattern.test(providedName.trim())) {
    return providedName.trim();
  }
  const customer = getCurrentCustomer();
  const used = [];
  const scan = (lines) =>
    (lines || []).forEach((line) => {
      if (line.kind === "customize" && line.productId === customizeId) {
        const match = pattern.exec((line.name || "").trim());
        // match[1] is the captured number — without the capture group it
        // would be undefined and every following name would become "NaN".
        if (match && match[1]) used.push(Number(match[1]));
      }
    });
  if (customer) {
    scan(getCart());
    scan(readJSON(ORDERS_KEY, {})[customer.id] || []);
  }
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `Customized ${kind} ${next}`;
};

// ---------- Profile ----------
// Updates the logged-in customer's name and email. The session is stored by
// id, so changing the email never logs the customer out.

export const updateCustomerProfile = ({ firstName, lastName, email, password }) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  const normalizedEmail = email.trim().toLowerCase();
  if (!firstName.trim() || !lastName.trim()) {
    return { ok: false, error: "Please enter your first and last name." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (customer.password !== password) {
    return { ok: false, error: "Your password is incorrect — changes were not saved." };
  }
  const customers = readJSON(CUSTOMERS_KEY, []);
  if (
    customers.some(
      (entry) => entry.email === normalizedEmail && entry.id !== customer.id,
    )
  ) {
    return { ok: false, error: "That email address is already in use." };
  }
  const record = customers.find((entry) => entry.id === customer.id);
  record.firstName = firstName.trim();
  record.lastName = lastName.trim();
  record.email = normalizedEmail;
  writeJSON(CUSTOMERS_KEY, customers);
  return { ok: true };
};

export const changeCustomerPassword = (currentPassword, newPassword) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  if (customer.password !== currentPassword) {
    return { ok: false, error: "Your current password is incorrect." };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: "New password must be at least 6 characters." };
  }
  const customers = readJSON(CUSTOMERS_KEY, []);
  const record = customers.find((entry) => entry.id === customer.id);
  record.password = newPassword;
  writeJSON(CUSTOMERS_KEY, customers);
  return { ok: true };
};

// Deletes the logged-in account after a password confirmation, wiping the
// account record, its saved cart and its order history. The session is
// cleared, so the customer is logged out of the deleted account.
export const deleteCustomerAccount = (password) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  if (customer.password !== password) {
    return {
      ok: false,
      error: "Your password is incorrect — the account was not deleted.",
    };
  }
  writeJSON(
    CUSTOMERS_KEY,
    readJSON(CUSTOMERS_KEY, []).filter((entry) => entry.id !== customer.id),
  );
  writeJSON(SESSION_KEY, null);
  const carts = readJSON(CARTS_KEY, {});
  delete carts[customer.id];
  writeJSON(CARTS_KEY, carts);
  const orders = readJSON(ORDERS_KEY, {});
  delete orders[customer.id];
  writeJSON(ORDERS_KEY, orders);
  return { ok: true };
};

// ---------- Address book ----------
// Addresses live on the customer record so checkout can pre-fill them. The
// shape matches the checkout delivery form exactly: one combined
// street/building/house-no field plus a barangay from the shared 26 list.

export const saveCustomerAddress = (address) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  if (!address.fullName.trim()) {
    return { ok: false, error: "Please enter the full name for this address." };
  }
  // Phone numbers are Philippine mobile numbers — exactly 11 digits.
  const phoneDigits = address.phone.replace(/\D/g, "");
  if (phoneDigits.length !== 11) {
    return {
      ok: false,
      error: "Phone number must be exactly 11 digits.",
    };
  }
  if (!address.barangay) {
    return { ok: false, error: "Please choose a barangay." };
  }
  if (!address.street.trim()) {
    return {
      ok: false,
      error: "Please enter the street name, building, and house no.",
    };
  }
  const customers = readJSON(CUSTOMERS_KEY, []);
  const record = customers.find((entry) => entry.id === customer.id);
  record.addresses = record.addresses || [];
  const saved = {
    id: address.id || makeId("addr"),
    fullName: address.fullName.trim(),
    phone: address.phone.trim(),
    barangay: address.barangay,
    street: address.street.trim(),
    isDefault: Boolean(address.isDefault),
  };
  if (address.id) {
    // Editing an existing address keeps its id and position.
    record.addresses = record.addresses.map((entry) =>
      entry.id === saved.id ? saved : entry,
    );
  } else {
    record.addresses.push(saved);
  }
  // Only one address can be the default.
  if (saved.isDefault) {
    record.addresses = record.addresses.map((entry) => ({
      ...entry,
      isDefault: entry.id === saved.id,
    }));
  }
  writeJSON(CUSTOMERS_KEY, customers);
  return { ok: true, address: saved };
};

export const deleteCustomerAddress = (id) => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const customers = readJSON(CUSTOMERS_KEY, []);
  const record = customers.find((entry) => entry.id === customer.id);
  record.addresses = (record.addresses || []).filter(
    (entry) => entry.id !== id,
  );
  writeJSON(CUSTOMERS_KEY, customers);
};

export const setDefaultCustomerAddress = (id) => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const customers = readJSON(CUSTOMERS_KEY, []);
  const record = customers.find((entry) => entry.id === customer.id);
  record.addresses = (record.addresses || []).map((entry) => ({
    ...entry,
    isDefault: entry.id === id,
  }));
  writeJSON(CUSTOMERS_KEY, customers);
};

// ---------- Orders ----------
// One order list per customer. Every order starts as "Pending"; the staff
// side (later) advances the status from there:
// - Delivery orders: Pending → Preparing → Out for Delivery → Completed
// - Walk-in orders:  Pending → Preparing → Ready to Claim  → Completed
// Either kind can be "Cancelled" instead of moving forward.

const ORDERS_KEY = "cafetcha-orders";

export const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Out for Delivery",
  "Ready to Claim",
  "Completed",
  "Cancelled",
];

// The staff selector follows the fulfillment mode so staff cannot put a
// delivery order into a pick-up-only state (or the reverse).
export const ORDER_STATUSES_BY_MODE = {
  delivery: [
    "Pending",
    "Preparing",
    "Out for Delivery",
    "Completed",
    "Cancelled",
  ],
  pickup: [
    "Pending",
    "Preparing",
    "Ready to Claim",
    "Completed",
    "Cancelled",
  ],
};

export const createOrder = ({
  mode,
  items,
  address,
  pickupName,
  paymentMethod,
  notes,
  subtotal,
  deliveryFee,
  total,
}) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  const unavailableLine = items.find(
    (line) => !isMenuItemAvailable(line.productId),
  );
  if (unavailableLine) {
    return {
      ok: false,
      error: `${unavailableLine.name} is currently unavailable. Remove it from your cart to continue.`,
    };
  }
  const orders = readJSON(ORDERS_KEY, {});
  const order = {
    id: makeId("ord"),
    code: `CAF-${Math.floor(100000 + Math.random() * 900000)}`,
    customerId: customer.id,
    mode,
    items: items.map((line) => ({
      uid: line.uid,
      kind: line.kind || "product",
      productId: line.productId,
      name: line.name,
      image: line.image,
      price: line.price,
      quantity: line.quantity,
      summary: line.summary || [],
      config: line.config || null,
    })),
    address: mode === "delivery" ? { ...address } : null,
    pickupName: mode === "pickup" ? { ...pickupName } : null,
    paymentMethod,
    notes: (notes || "").trim(),
    subtotal,
    deliveryFee,
    total,
    status: "Pending",
    createdAt: new Date().toISOString(),
  };
  orders[customer.id] = [order, ...(orders[customer.id] || [])];
  writeJSON(ORDERS_KEY, orders);
  pushCustomerNotification(
    customer.id,
    `Your order ${order.code} is now Pending.`,
    "order",
    {
      orderId: order.id,
      orderCode: order.code,
      status: "Pending",
      orderType: "customer",
    },
  );
  return { ok: true, order };
};

export const getLoyaltyCardForCustomer = (customerId) => {
  if (!customerId) return null;
  return normalizeLoyaltyCard(readLoyaltyAll()[customerId]);
};

// Staff/admin tools can award one real loyalty stamp without a monetary order.
// Full, activated, or in-progress reward cards are intentionally protected.
export const grantLoyaltyStamp = (customerId) => {
  const customer = getAllCustomers().find((entry) => entry.id === customerId);
  if (!customer) return { ok: false, error: "Customer not found." };
  const all = readLoyaltyAll();
  const card = normalizeLoyaltyCard(all[customerId]);
  if (card.claimedAt || hasActiveRedemption(card)) {
    return { ok: false, error: "This customer already has a free-coffee reward in progress." };
  }
  if (card.stamps >= 6) {
    return { ok: false, error: "This customer's loyalty card is already 6/6." };
  }
  card.stamps += 1;
  if (card.stamps >= 6) card.sixAt = Date.now();
  all[customerId] = card;
  writeJSON(LOYALTY_KEY, all);
  pushCustomerNotification(
    customerId,
    `A staff member added 1 loyalty stamp to your card. You now have ${card.stamps}/6 stamps.`,
    "loyalty",
  );
  return { ok: true, card };
};

export const getCustomerOrders = () => {
  const customer = getCurrentCustomer();
  if (!customer) return [];
  return readJSON(ORDERS_KEY, {})[customer.id] || [];
};

// Read-only look at every order from every customer. The staff dashboard
// uses this for its order statistics and live queue — nothing here changes
// the list.
export const getCustomerManagementData = () => {
  const customers = getAllCustomers();
  const orders = getAllOrders();
  return customers.map((customer) => {
    const customerOrders = orders.filter(
      (order) => order.customerId === customer.id,
    );
    const completed = customerOrders.filter(
      (order) => order.status === "Completed",
    );
    return {
      ...customer,
      orderCount: customerOrders.length,
      completedCount: completed.length,
      activeCount: customerOrders.filter(
        (order) => order.status !== "Completed" && order.status !== "Cancelled",
      ).length,
      totalSpent: completed.reduce((sum, order) => sum + (order.total || 0), 0),
      loyaltyStamps: getLoyaltyCardForCustomer(customer.id)?.stamps || 0,
      lastOrder: customerOrders
        .map((order) => order.createdAt)
        .sort()
        .at(-1) || null,
    };
  });
};

export const setCustomerAccountEnabled = (customerId, enabled) => {
  const customers = readJSON(CUSTOMERS_KEY, []);
  const record = customers.find((customer) => customer.id === customerId);
  if (!record) return { ok: false, error: "Customer not found." };
  record.accountEnabled = enabled !== false;
  writeJSON(CUSTOMERS_KEY, customers);
  const sessionId = readJSON(SESSION_KEY, null);
  if (!record.accountEnabled && sessionId === record.id) {
    writeJSON(SESSION_KEY, null);
  }
  return { ok: true, customer: record };
};

export const getAllOrders = () => {
  const orders = readJSON(ORDERS_KEY, {});
  return Object.values(orders).flat();
};

// Read-only look at every loyalty redemption order (free-coffee claims),
// each tagged with the owner's id like the regular orders. The staff
// dashboard's "Loyalty Orders" stat and rewards queue read from here.
export const getAllRedemptionOrders = () =>
  Object.entries(readLoyaltyAll()).flatMap(([customerId, card]) =>
    (card?.redemptions || []).map((order) => ({ ...order, customerId })),
  );

// One read-only list for staff tools. Regular checkout orders and free-coffee
// redemptions share the same queue and history UI, while staffSource keeps the
// status update on the correct localStorage collection.
export const getAllStaffOrders = () => [
  ...getAllOrders().map((order) => ({ ...order, staffSource: "order" })),
  ...getAllRedemptionOrders().map((order) => ({
    ...order,
    staffSource: "redemption",
  })),
];

// Customer cancels their own order — allowed only while it is still
// "Pending" (once the kitchen starts Preparing it can no longer be cancelled;
// the staff side decides Preparing → Out for Delivery / Ready to Claim).
export const cancelCustomerOrder = (orderId) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  const orders = readJSON(ORDERS_KEY, {});
  const list = orders[customer.id] || [];
  const order = list.find((entry) => entry.id === orderId);
  if (!order) return { ok: false, error: "Order not found." };
  if (order.status !== "Pending") {
    return { ok: false, error: "Only Pending orders can be cancelled." };
  }
  order.status = "Cancelled";
  orders[customer.id] = list;
  writeJSON(ORDERS_KEY, orders);
  return { ok: true };
};

// Permanently remove one order from the customer's list (the Delete button
// on cancelled orders in My Orders and on completed orders in History).
export const deleteCustomerOrder = (orderId) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  const orders = readJSON(ORDERS_KEY, {});
  orders[customer.id] = (orders[customer.id] || []).filter(
    (entry) => entry.id !== orderId,
  );
  writeJSON(ORDERS_KEY, orders);
  return { ok: true };
};

// Sidebar tab changes on the profile page rewrite ?tab= in the URL so the
// header's active line follows the visible section; this asks every
// subscriber (the header included) to re-render and re-read the URL.
export const notifyUiRefresh = () => emitChange();

// ---------- Loyalty Card ----------
// One loyalty card per customer. Every ₱200 spent on an order that reaches
// "Completed" earns 1 stamp (₱1,000 in one checkout = 5 stamps). A full card
// of 6 stamps opens a 3-day window to claim the reward; claiming activates
// the card for 3 more days, during which one coffee (Coffee category) can be
// redeemed for free through the special redeem checkout. Placing the reward
// starts the next cycle; cancelling while Pending restores the original card.
//
// record = { stamps, carryStamps, sixAt, claimedAt, redemptions: [order, ...] }
// The redemption orders live here (never in My Orders / Order History).
const LOYALTY_KEY = "cafetcha-loyalty";
const NOTIFICATIONS_KEY = "cafetcha-notifications";
const STAMP_PER_PESOS = 200;
export const LOYALTY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const freshLoyaltyCard = () => ({
  stamps: 0,
  carryStamps: 0, // overflow from an order that completed the previous card
  sixAt: null, // when the 6th stamp landed (claim-window start)
  claimedAt: null, // when the reward was claimed (use-window start)
  redemptions: [],
});

const normalizeLoyaltyCard = (card = {}) => ({
  ...freshLoyaltyCard(),
  ...card,
  stamps: Math.max(0, Math.min(6, Number(card.stamps) || 0)),
  carryStamps: Math.max(0, Math.min(5, Number(card.carryStamps) || 0)),
  redemptions: Array.isArray(card.redemptions) ? card.redemptions : [],
});

// Starting a reward order begins the next card cycle. Overflow stamps start
// the next card immediately, so 5/6 + ₱1,000 becomes 6/6 and then 4/6.
const nextLoyaltyCard = (card) => {
  const normalized = normalizeLoyaltyCard(card);
  return {
    ...freshLoyaltyCard(),
    stamps: normalized.carryStamps,
    redemptions: normalized.redemptions,
  };
};

const isTerminalRedemption = (order) =>
  order.status === "Completed" || order.status === "Cancelled";

const hasActiveRedemption = (card) =>
  (card?.redemptions || []).some((order) => !isTerminalRedemption(order));

const snapshotLoyaltyCard = (card) => ({
  stamps: card.stamps,
  carryStamps: card.carryStamps,
  sixAt: card.sixAt ?? null,
  claimedAt: card.claimedAt ?? null,
});

const restoreLoyaltyCard = (card, snapshot) =>
  normalizeLoyaltyCard({
    ...card,
    ...snapshot,
    redemptions: card.redemptions,
  });

const readLoyaltyAll = () => readJSON(LOYALTY_KEY, {});

// Notification-bell items, stored per customer (newest first, capped at 30).
// kind: "loyalty" (stamp rewards) | "order" (staff status changes) | "system".
const pushCustomerNotification = (
  customerId,
  text,
  kind = "loyalty",
  details = {},
) => {
  const all = readJSON(NOTIFICATIONS_KEY, {});
  all[customerId] = [
    {
      id: makeId("ntf"),
      text,
      kind,
      ...details,
      read: false,
      createdAt: new Date().toISOString(),
    },
    ...(all[customerId] || []),
  ].slice(0, 30);
  writeJSON(NOTIFICATIONS_KEY, all);
};

export const addCustomerNotification = pushCustomerNotification;

export const getCustomerNotifications = () => {
  const customer = getCurrentCustomer();
  if (!customer) return [];
  return readJSON(NOTIFICATIONS_KEY, {})[customer.id] || [];
};

export const getUnreadNotificationCount = () =>
  getCustomerNotifications().filter((entry) => !entry.read).length;

export const markCustomerNotificationsRead = () => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const all = readJSON(NOTIFICATIONS_KEY, {});
  all[customer.id] = (all[customer.id] || []).map((entry) => ({
    ...entry,
    read: true,
  }));
  writeJSON(NOTIFICATIONS_KEY, all);
};

export const deleteCustomerNotification = (id) => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const all = readJSON(NOTIFICATIONS_KEY, {});
  all[customer.id] = (all[customer.id] || []).filter(
    (entry) => entry.id !== id,
  );
  writeJSON(NOTIFICATIONS_KEY, all);
};

export const clearCustomerNotifications = () => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const all = readJSON(NOTIFICATIONS_KEY, {});
  all[customer.id] = [];
  writeJSON(NOTIFICATIONS_KEY, all);
};

// ---------- Announcements (News & Updates) ----------
// Store-wide news entries ("what's new", promos, announcements) shown in the
// notification bell for every visitor. The admin side will manage this list
// later; a small seed keeps the bell useful from day one.
const ANNOUNCEMENTS_KEY = "cafetcha-announcements";

const ANNOUNCEMENT_SEED = [
  {
    id: "news-welcome-loyalty",
    title: "Loyalty cards are here!",
    text: "Every ₱200 you spend on a completed order earns a stamp — collect 6 and claim a free coffee from the Coffee category.",
    createdAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "news-3d-customize",
    title: "Build it your way in 3D",
    text: "Frappe, tea, sandwich, burger, cheesecake and ice cream can now be customized from scratch with our 3D builders.",
    createdAt: "2026-01-12T09:00:00.000Z",
  },
  {
    id: "news-delivery-26",
    title: "We deliver to all 26 barangays",
    text: "Hagonoy-wide delivery for ₱0–₱30 per barangay, open daily 3 PM – 11 PM.",
    createdAt: "2026-01-20T09:00:00.000Z",
  },
];

export const getAnnouncements = () => {
  let list = readJSON(ANNOUNCEMENTS_KEY, null);
  if (!list) {
    // First read seeds the store-wide news; the admin side edits it later.
    list = ANNOUNCEMENT_SEED;
    writeJSON(ANNOUNCEMENTS_KEY, list);
  }
  return list;
};

// Admin-side hook for later: publish a new announcement.
export const addAnnouncement = ({ title, text }) => {
  const list = getAnnouncements();
  const entry = {
    id: makeId("news"),
    title: (title || "").trim(),
    text: (text || "").trim(),
    createdAt: new Date().toISOString(),
  };
  writeJSON(ANNOUNCEMENTS_KEY, [entry, ...list]);
  return entry;
};

// ---------- Contact Us ----------
// Messages sent from the /contact page queue here for the admin side.
const CONTACT_KEY = "cafetcha-contact-messages";

export const saveContactMessage = ({
  firstName,
  lastName,
  email,
  phone,
  subject,
  message,
}) => {
  const all = readJSON(CONTACT_KEY, []);
  const entry = {
    id: makeId("msg"),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    subject,
    message: message.trim(),
    status: "unread",
    read: false,
    createdAt: new Date().toISOString(),
  };
  writeJSON(CONTACT_KEY, [entry, ...all]);
  return entry;
};

// Admin-side hook for the Contact Us inbox. Legacy records that used
// "replied" are normalized to the current Read/Unread labels.
export const getContactMessages = () => {
  const messages = readJSON(CONTACT_KEY, []);
  return messages.map((message) => {
    const read = Boolean(message.read || message.status === "replied");
    return {
      ...message,
      read,
      status: read ? "read" : "unread",
    };
  });
};

export const markContactMessageRead = (messageId, read = true) => {
  const messages = readJSON(CONTACT_KEY, []);
  const message = messages.find((entry) => entry.id === messageId);
  if (!message) return { ok: false, error: "Message not found." };
  message.read = read;
  message.status = read ? "read" : "unread";
  writeJSON(CONTACT_KEY, messages);
  return { ok: true, message };
};

export const deleteContactMessage = (messageId) => {
  const messages = readJSON(CONTACT_KEY, []);
  const next = messages.filter((entry) => entry.id !== messageId);
  if (next.length === messages.length) {
    return { ok: false, error: "Message not found." };
  }
  writeJSON(CONTACT_KEY, next);
  return { ok: true };
};

// Lazily enforces the two 3-day windows: an unclaimed full card and an
// activated-but-unused card both expire back to an empty card.
export const getLoyaltyCard = () => {
  const customer = getCurrentCustomer();
  if (!customer) return null;

  const all = readLoyaltyAll();
  let card = normalizeLoyaltyCard(all[customer.id]);
  const now = Date.now();

  // Older redemptions were stored while the claimed card still showed 6/6.
  // Move those records into the new cycle as soon as they are read so the
  // old implementation cannot unlock a second free coffee.
  const activeRedemption = card.redemptions.find(
    (order) => !isTerminalRedemption(order),
  );
  if (activeRedemption && card.claimedAt && card.stamps >= 6) {
    if (!activeRedemption.cardSnapshot) {
      activeRedemption.cardSnapshot = snapshotLoyaltyCard(card);
    }
    card = nextLoyaltyCard(card);
    all[customer.id] = card;
    writeJSON(LOYALTY_KEY, all);
    return card;
  }

  let expired = null;
  if (card.claimedAt && now - card.claimedAt > LOYALTY_WINDOW_MS) {
    expired =
      "Your activated loyalty card expired — the free coffee reward was not used within 3 days.";
  } else if (
    card.sixAt &&
    !card.claimedAt &&
    now - card.sixAt > LOYALTY_WINDOW_MS
  ) {
    expired =
      "Your full loyalty card expired — the reward was not claimed within 3 days, so the stamps were reset.";
  }

  if (expired) {
    all[customer.id] = nextLoyaltyCard(card);
    writeJSON(LOYALTY_KEY, all);
    pushCustomerNotification(customer.id, expired);
    if (getCurrentCustomer()?.id === customer.id) notify(expired);
    return all[customer.id];
  }

  return card;
};

// True while the claimed reward can still be redeemed (3-day use window).
export const isLoyaltyRewardActive = () => {
  const card = getLoyaltyCard();
  return Boolean(
    card &&
      card.claimedAt &&
      card.stamps >= 6 &&
      !hasActiveRedemption(card),
  );
};

const awardStampsForOrder = (order, options = {}) => {
  const all = readLoyaltyAll();
  const card = normalizeLoyaltyCard(all[order.customerId]);
  // A full or activated card waits for the reward to be claimed / used — no
  // extra stamps are added until it resets.
  if (card.stamps >= 6 || card.claimedAt) return;

  const earnedUnits = Math.floor(order.total / STAMP_PER_PESOS);
  const availableSlots = 6 - card.stamps;
  const earned = Math.min(availableSlots, earnedUnits);
  if (earned <= 0) return;

  const overflow = Math.max(0, earnedUnits - earned);
  card.stamps += earned;
  card.carryStamps = Math.min(5, card.carryStamps + overflow);
  if (card.stamps >= 6) card.sixAt = Date.now();
  all[order.customerId] = card;
  writeJSON(LOYALTY_KEY, all);

  const overflowMessage = overflow
    ? ` ${overflow} stamp${overflow === 1 ? "" : "s"} carried to your next card.`
    : "";
  pushCustomerNotification(
    order.customerId,
    `You received ${earnedUnits} stamp${earnedUnits === 1 ? "" : "s"} — your ₱${order.total.toLocaleString()} order is completed! (${card.stamps}/6).${overflowMessage}`,
  );
  if (!options.suppressCustomerToast && getCurrentCustomer()?.id === order.customerId) {
    notify(
      `You received ${earnedUnits} stamp${earnedUnits === 1 ? "" : "s"} for your ₱${order.total.toLocaleString()} order!${overflowMessage}`,
    );
  }

  if (card.stamps >= 6) {
    pushCustomerNotification(
      order.customerId,
      "Your loyalty card is full! Claim your free coffee reward within 3 days.",
    );
    if (!options.suppressCustomerToast && getCurrentCustomer()?.id === order.customerId) {
      notify("Your loyalty card is full — claim your reward!");
    }
  }
};

// Staff-side hook: move any regular order to a new status. Every change
// notifies the customer in the bell (+ toast while they are online); completing
// a regular order also awards its stamps. Repeating the same status is a no-op
// so a completed order cannot earn duplicate loyalty stamps.
export const updateOrderStatus = (orderId, status, options = {}) => {
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Choose a valid order status." };
  }

  const orders = readJSON(ORDERS_KEY, {});
  for (const list of Object.values(orders)) {
    const order = list.find((entry) => entry.id === orderId);
    if (!order) continue;
    const allowedStatuses = ORDER_STATUSES_BY_MODE[order.mode] || ORDER_STATUSES;
    if (!allowedStatuses.includes(status)) {
      return {
        ok: false,
        error: `${status} is not available for this order type.`,
      };
    }

    const previousStatus = order.status;
    if (previousStatus === status) return { ok: true, order };

    order.status = status;
    order.statusUpdatedAt = new Date().toISOString();
    if (status === "Completed") order.completedAt = order.statusUpdatedAt;
    if (status === "Cancelled") order.cancelledAt = order.statusUpdatedAt;
    writeJSON(ORDERS_KEY, orders);
    pushCustomerNotification(
      order.customerId,
      `Your order ${order.code} is now ${status}.`,
      "order",
      {
        orderId: order.id,
        orderCode: order.code,
        status,
        orderType: "customer",
      },
    );
    if (!options.suppressCustomerToast && getCurrentCustomer()?.id === order.customerId) {
      notify(`Your order ${order.code} is now ${status}.`);
    }
    if (status === "Completed" && previousStatus !== "Completed") {
      awardStampsForOrder(order, options);
    }
    return { ok: true, order };
  }
  return { ok: false, error: "Order not found." };
};

// Staff can update reward orders without being logged in as the customer who
// claimed them. The next cycle is started when the reward order is placed;
// completing it therefore preserves that cycle instead of resetting it again.
export const updateStaffRedemptionStatus = (orderId, status, options = {}) => {
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Choose a valid order status." };
  }

  const all = readLoyaltyAll();
  for (const [customerId, card] of Object.entries(all)) {
    const order = (card?.redemptions || []).find((entry) => entry.id === orderId);
    if (!order) continue;

    const allowedStatuses = ORDER_STATUSES_BY_MODE[order.mode] || ORDER_STATUSES;
    if (!allowedStatuses.includes(status)) {
      return {
        ok: false,
        error: `${status} is not available for this order type.`,
      };
    }
    if (order.status === status) return { ok: true, order };

    const previousStatus = order.status;
    order.status = status;
    order.statusUpdatedAt = new Date().toISOString();
    if (status === "Completed") order.completedAt = order.statusUpdatedAt;
    if (status === "Cancelled") order.cancelledAt = order.statusUpdatedAt;

    // A customer/staff cancellation is refundable only while the reward is
    // still Pending. Restore the exact 6/6 card and its original timer.
    if (status === "Cancelled" && previousStatus === "Pending") {
      if (!order.cardSnapshot) {
        order.cardSnapshot = snapshotLoyaltyCard(card);
      }
      all[customerId] = restoreLoyaltyCard(card, order.cardSnapshot);
    } else if (
      status === "Completed" &&
      previousStatus !== "Completed" &&
      !order.cardSnapshot
    ) {
      // Backward compatibility for records created before card snapshots were
      // introduced. New records already live in the next cycle.
      all[customerId] = nextLoyaltyCard(card);
    }

    writeJSON(LOYALTY_KEY, all);
    pushCustomerNotification(
      customerId,
      `Your reward order ${order.code} is now ${status}.`,
      "order",
      {
        orderId: order.id,
        orderCode: order.code,
        status,
        orderType: "redemption",
      },
    );
    if (getCurrentCustomer()?.id === customerId && !options.suppressCustomerToast) {
      notify(`Your reward order ${order.code} is now ${status}.`);
    }
    if (status === "Completed") {
      pushCustomerNotification(
        customerId,
        "Your free coffee was completed. Your new loyalty cycle is now active.",
      );
    }
    return { ok: true, order };
  }
  return { ok: false, error: "Redemption not found." };
};

// The staff pages use one action for both kinds of order. Order ids are
// generated with different prefixes, so regular orders are checked first and
// the redemption fallback is unambiguous.
export const updateStaffOrderStatus = (orderId, status) => {
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Choose a valid order status." };
  }
  const regularResult = updateOrderStatus(orderId, status, {
    suppressCustomerToast: true,
  });
  if (regularResult.ok) return regularResult;
  if (regularResult.error !== "Order not found.") return regularResult;
  return updateStaffRedemptionStatus(orderId, status, {
    suppressCustomerToast: true,
  });
};

// Staff history deletion works for both regular orders and loyalty rewards.
// It is intentionally separate from the customer-owned delete functions so
// staff can remove a historical record without changing customer sessions.
export const deleteStaffOrder = (orderId) => {
  const orders = readJSON(ORDERS_KEY, {});
  for (const [customerId, list] of Object.entries(orders)) {
    if (!list.some((order) => order.id === orderId)) continue;
    orders[customerId] = list.filter((order) => order.id !== orderId);
    writeJSON(ORDERS_KEY, orders);
    return { ok: true, source: "order" };
  }

  const all = readLoyaltyAll();
  for (const [customerId, card] of Object.entries(all)) {
    if (!(card?.redemptions || []).some((order) => order.id === orderId)) continue;
    card.redemptions = card.redemptions.filter((order) => order.id !== orderId);
    all[customerId] = card;
    writeJSON(LOYALTY_KEY, all);
    return { ok: true, source: "redemption" };
  }

  return { ok: false, error: "Order not found." };
};

export const claimLoyaltyReward = () => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  const all = readLoyaltyAll();
  const card = normalizeLoyaltyCard(all[customer.id]);

  if (hasActiveRedemption(card)) {
    return {
      ok: false,
      error: "You already have a free coffee order in progress.",
    };
  }

  if (card.stamps < 6) {
    return { ok: false, error: "Collect all 6 stamps first." };
  }
  if (card.claimedAt) {
    return { ok: false, error: "Your reward is already activated." };
  }
  card.claimedAt = Date.now();
  all[customer.id] = card;
  writeJSON(LOYALTY_KEY, all);
  pushCustomerNotification(
    customer.id,
    "Your loyalty card is activated! Claim one free coffee from the Coffee category within 3 days.",
  );
  notify("Your loyalty card is activated — claim your free coffee!");
  return { ok: true, card };
};

export const getRedemptionOrders = () => {
  const customer = getCurrentCustomer();
  if (!customer) return [];
  return readLoyaltyAll()[customer.id]?.redemptions || [];
};

// The free-coffee order lives in the loyalty record. Placing it immediately
// starts the next card cycle, while the original card state is saved on the
// order so a Pending cancellation can restore the exact 6/6 state and timer.
export const createRedemptionOrder = ({
  mode,
  address,
  pickupName,
  paymentMethod,
  notes,
  item,
}) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };

  const all = readLoyaltyAll();
  const card = normalizeLoyaltyCard(all[customer.id]);

  if (hasActiveRedemption(card)) {
    return {
      ok: false,
      error: "Only one free coffee can be redeemed per 6/6 loyalty card.",
    };
  }
  if (!isMenuItemAvailable(item.productId)) {
    return {
      ok: false,
      error: "This coffee is currently unavailable. Please choose another menu item.",
    };
  }
  if (!card.claimedAt || card.stamps < 6) {
    return { ok: false, error: "Your loyalty card is not activated." };
  }
  if (Date.now() - card.claimedAt > LOYALTY_WINDOW_MS) {
    return { ok: false, error: "Your activated card has expired." };
  }

  const order = {
    id: makeId("rdo"),
    code: `CAF-${Math.floor(100000 + Math.random() * 900000)}`,
    kind: "redemption",
    mode,
    items: [
      {
        uid: makeId("line"),
        kind: "product",
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price || 0,
        quantity: 1,
        summary: item.summary || [],
      },
    ],
    address: mode === "delivery" ? { ...address } : null,
    pickupName: mode === "pickup" ? { ...pickupName } : null,
    paymentMethod,
    notes: (notes || "").trim(),
    subtotal: 0,
    deliveryFee: 0,
    total: 0,
    status: "Pending",
    createdAt: new Date().toISOString(),
    cardSnapshot: snapshotLoyaltyCard(card),
  };

  const nextCard = nextLoyaltyCard(card);
  nextCard.redemptions = [order, ...(card.redemptions || [])];
  all[customer.id] = nextCard;
  writeJSON(LOYALTY_KEY, all);
  pushCustomerNotification(
    customer.id,
    `Your reward order ${order.code} is now Pending.`,
    "order",
    {
      orderId: order.id,
      orderCode: order.code,
      status: "Pending",
      orderType: "redemption",
    },
  );

  return { ok: true, order, card: nextCard };
};

export const cancelRedemptionOrder = (orderId) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  const all = readLoyaltyAll();
  const card = all[customer.id];
  const order = (card?.redemptions || []).find(
    (entry) => entry.id === orderId,
  );
  if (!order) return { ok: false, error: "Redemption not found." };
  if (order.status !== "Pending") {
    return { ok: false, error: "Only Pending redemptions can be cancelled." };
  }
  if (!order.cardSnapshot) {
    order.cardSnapshot = snapshotLoyaltyCard(card);
  }
  order.status = "Cancelled";
  const restoredCard = restoreLoyaltyCard(card, order.cardSnapshot);
  restoredCard.redemptions = card.redemptions;
  all[customer.id] = restoredCard;
  writeJSON(LOYALTY_KEY, all);
  return { ok: true, card: restoredCard };
};

export const deleteRedemptionOrder = (orderId) => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const all = readLoyaltyAll();
  const card = all[customer.id];
  if (card?.redemptions) {
    card.redemptions = card.redemptions.filter(
      (entry) => entry.id !== orderId,
    );
    writeJSON(LOYALTY_KEY, all);
  }
};

// Customer-side status hook. It follows the same snapshot lifecycle as the
// staff hook so a local status change cannot accidentally reset a new cycle.
export const updateRedemptionStatus = (orderId, status) => {
  const customer = getCurrentCustomer();
  if (!customer) return { ok: false, error: "Please log in first." };
  const all = readLoyaltyAll();
  const card = all[customer.id];
  const order = (card?.redemptions || []).find(
    (entry) => entry.id === orderId,
  );
  if (!order) return { ok: false, error: "Redemption not found." };

  const previousStatus = order.status;
  if (previousStatus === status) return { ok: true, order };
  order.status = status;
  order.statusUpdatedAt = new Date().toISOString();
  if (status === "Completed") order.completedAt = order.statusUpdatedAt;
  if (status === "Cancelled") order.cancelledAt = order.statusUpdatedAt;

  if (status === "Cancelled" && previousStatus === "Pending") {
    if (!order.cardSnapshot) order.cardSnapshot = snapshotLoyaltyCard(card);
    all[customer.id] = restoreLoyaltyCard(card, order.cardSnapshot);
  } else if (status === "Completed" && !order.cardSnapshot) {
    all[customer.id] = nextLoyaltyCard(card);
  }

  writeJSON(LOYALTY_KEY, all);
  pushCustomerNotification(
    customer.id,
    `Your reward order ${order.code} is now ${status}.`,
    "order",
    {
      orderId: order.id,
      orderCode: order.code,
      status,
      orderType: "redemption",
    },
  );
  if (getCurrentCustomer()?.id === customer.id) {
    notify(`Your reward order ${order.code} is now ${status}.`);
  }
  if (status === "Completed") {
    pushCustomerNotification(
      customer.id,
      "Your free coffee was completed. Your new loyalty cycle is now active.",
    );
  }
  return { ok: true, order };
};

// ---------- "You Might Like" (personalized reorders + suggestions) ----------

const REORDERS_KEY = "cafetcha-reorders";

// Deterministic hash so each reorder card keeps a stable id (used by the
// trash button to remove that card from the section).
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
};

// Small seeded PRNG — the suggestion pool is stable within one "order
// count" but reshuffles after a new checkout.
const mulberry32 = (seed) => () => {
  let value = seed | 0;
  value = (value + 0x6d2b79f5) | 0;
  let t = Math.imul(value ^ (value >>> 15), 1 | value);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Regular menu items + new arrivals can be suggested; the shared catalog keeps
// admin-created and edited items eligible for personalized suggestions too.
const getSuggestibleItems = () =>
  getAllManagedMenuItems().filter(
    (item) => item.source === "Menu item" || item.source === "New arrival",
  );

// Reorder cards come straight from the customer's past checkouts — exactly
// the version (options included) they ordered. Suggestions are up to 2
// randomly picked related products, reseeded whenever a new order lands.
export const getYouMightLike = () => {
  const customer = getCurrentCustomer();
  if (!customer) return { reorders: [], suggestions: [] };
  const orders = readJSON(ORDERS_KEY, {})[customer.id] || [];
  if (!orders.length) return { reorders: [], suggestions: [] };

  // Cards the customer removed via the trash icon stay hidden.
  const saved = readJSON(REORDERS_KEY, {})[customer.id] || {};
  const removed = saved.removed || {};

  const reorders = [];
  const seen = new Set();
  const purchased = [];
  orders.forEach((order) =>
    (order.items || []).forEach((item) => {
      purchased.push(item);
      const signature = JSON.stringify([
        item.kind,
        item.productId,
        item.summary || [],
        item.config || null,
      ]);
      if (seen.has(signature)) return;
      seen.add(signature);
      const id = `reorder-${hashString(signature)}`;
      if (removed[id]) return;
      reorders.push({
        id,
        kind: item.kind,
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        summary: item.summary || [],
        config: item.config || null,
        quantity: item.quantity,
      });
    }),
  );

  // Keyword + category matching drives the suggestions — e.g. ordering
  // "Chocolate Chip Cookies" can surface "Signature Chocolate Milk" because
  // both share the keyword "chocolate".
  const suggestible = getSuggestibleItems();
  const keywords = new Set();
  const purchasedCategories = new Set();
  const purchasedIds = new Set();
  purchased.forEach((item) => {
    purchasedIds.add(item.productId);
    const menuItem = suggestible.find(
      (entry) => entry.id === item.productId,
    );
    if (menuItem) purchasedCategories.add(menuItem.category);
    String(item.name || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3)
      .forEach((word) => keywords.add(word));
    (item.summary || []).forEach((entry) =>
      String(entry.choice || "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 3)
        .forEach((word) => keywords.add(word)),
    );
  });

  const scored = suggestible.filter(
    (item) => !purchasedIds.has(item.id),
  )
    .map((item) => {
      let score = 0;
      if (purchasedCategories.has(item.category)) score += 2;
      const nameLower = String(item.name || "").toLowerCase();
      keywords.forEach((word) => {
        if (nameLower.includes(word)) score += 1;
      });
      return { item, score };
    })
    .filter((entry) => entry.score > 0);

  // Seeded by customer id + order count, so the picks refresh whenever the
  // customer checks out a new order.
  const seed = hashString(`${customer.id}:${orders.length}`)
    .split("")
    .reduce((acc, char) => (acc * 36 + parseInt(char, 36)) | 0, 1);
  const random = mulberry32(seed);
  const suggestions = [...scored]
    .sort(() => random() - 0.5)
    .slice(0, 2)
    .map((entry) => entry.item);

  return { reorders, suggestions };
};

// Trash icon on a reorder card: hides that card from You Might Like while
// keeping the order history untouched.
export const deleteReorderCard = (reorderId) => {
  const customer = getCurrentCustomer();
  if (!customer || !reorderId) return;
  const all = readJSON(REORDERS_KEY, {});
  const record = all[customer.id] || {};
  record.removed = { ...(record.removed || {}), [reorderId]: true };
  all[customer.id] = record;
  writeJSON(REORDERS_KEY, all);
};

// Used after checkout: removes every ordered line from the cart in one go.
export const removeCartLines = (uids) => {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const carts = readJSON(CARTS_KEY, {});
  carts[customer.id] = (carts[customer.id] || []).filter(
    (entry) => !uids.includes(entry.uid),
  );
  writeJSON(CARTS_KEY, carts);
};

// ---------- Legacy data migration ----------
// PayMaya was renamed to PayPal. Older local records still carry the old
// label, so every stored order/reward payment method is rewritten once on
// load. This keeps order history, admin analytics, and the customer receipt
// consistent with the checkout options the app now offers.
const LEGACY_PAYMENT_METHODS = { paymaya: "PayPal", "pay maya": "PayPal" };

const migratePaymentMethods = () => {
  const rename = (value) => {
    if (typeof value !== "string") return value;
    return LEGACY_PAYMENT_METHODS[value.trim().toLowerCase()] || value;
  };

  try {
    // Regular customer orders.
    const orders = readJSON(ORDERS_KEY, {});
    let ordersChanged = false;
    Object.keys(orders).forEach((customerId) => {
      (orders[customerId] || []).forEach((order) => {
        const next = rename(order.paymentMethod);
        if (next !== order.paymentMethod) {
          order.paymentMethod = next;
          ordersChanged = true;
        }
      });
    });
    if (ordersChanged) writeJSON(ORDERS_KEY, orders);

    // Loyalty reward orders live in the loyalty records.
    const loyalty = readJSON(LOYALTY_KEY, {});
    let loyaltyChanged = false;
    Object.keys(loyalty).forEach((customerId) => {
      ((loyalty[customerId] || {}).redemptions || []).forEach((order) => {
        const next = rename(order.paymentMethod);
        if (next !== order.paymentMethod) {
          order.paymentMethod = next;
          loyaltyChanged = true;
        }
      });
    });
    if (loyaltyChanged) writeJSON(LOYALTY_KEY, loyalty);
  } catch {
    // Migration is best-effort; the app still works with the old label.
  }
};

migratePaymentMethods();

// ---------- React hook ----------

export const useCustomerStore = () => {
  useSyncExternalStore(subscribeToCustomerStore, getCustomerStoreVersion);
  return { customer: getCurrentCustomer(), cart: getCart() };
};