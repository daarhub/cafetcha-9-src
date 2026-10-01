import { useSyncExternalStore } from "react";

// Tiny notification store. Every customer transaction — adding to cart,
// logging in or out, cart edits, password changes — pops a toast instead of
// navigating somewhere else, so the customer always stays where they were.
const PENDING_KEY = "cafetcha-pending-toast";
const listeners = new Set();
let toasts = [];
let version = 0;

const emitChange = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

export const subscribeToToasts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getToastsVersion = () => version;

let counter = 0;

const pushToast = (message, type) => {
  const id = `toast-${Date.now()}-${counter++}`;
  toasts = [...toasts, { id, message, type }];
  emitChange();
  setTimeout(() => {
    toasts = toasts.filter((toast) => toast.id !== id);
    emitChange();
  }, 3200);
};

export const notify = (message, type = "success") => pushToast(message, type);

// Queue a toast for the NEXT app load. Logging out navigates to the homepage
// with a full reload, which would otherwise destroy the toast before it is
// ever seen — this replays it once the fresh page mounts.
export const notifyAfterReload = (message, type = "info") => {
  try {
    window.sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ message, type }),
    );
  } catch {
    // Storage unavailable — the toast simply won't survive the navigation.
  }
};

// On boot, replay exactly one queued toast (if any) so it is not lost.
try {
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (raw) {
    window.sessionStorage.removeItem(PENDING_KEY);
    const pending = JSON.parse(raw);
    if (pending && pending.message) {
      pushToast(pending.message, pending.type || "info");
    }
  }
} catch {
  // Ignore malformed queued data.
}

export const useToasts = () => {
  useSyncExternalStore(subscribeToToasts, getToastsVersion);
  return toasts;
};