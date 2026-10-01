import { useSyncExternalStore } from "react";
import {
  CUSTOMIZE_OPTIONS,
  MENU_ITEMS,
  NEW_ARRIVALS,
  PROMOS,
} from "./menuData";

const AVAILABILITY_KEY = "cafetcha-menu-availability";
const CATALOG_KEY = "cafetcha-admin-menu-catalog";
const BASE_ITEMS = [
  ...MENU_ITEMS.map((item) => ({ ...item, source: "Menu item" })),
  ...NEW_ARRIVALS.map((item) => ({ ...item, source: "New arrival" })),
  ...PROMOS.map((item) => ({ ...item, source: "Promo" })),
  ...CUSTOMIZE_OPTIONS.map((item) => ({ ...item, source: "Customizer" })),
];

const read = (key, fallback) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The catalog remains usable in memory when storage is unavailable.
  }
};

let availability = read(AVAILABILITY_KEY, {});
let changes = read(CATALOG_KEY, { overrides: {}, added: [], deleted: [] });
const listeners = new Set();
let version = 0;
const emit = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const deleted = (id) => changes.deleted.includes(id);
const normalize = (item, override = {}) => {
  const value = { ...item, ...override, id: item.id };
  return {
    ...value,
    name: String(value.name || "Untitled menu item").trim(),
    description: String(value.description || "").trim(),
    price: Math.max(0, Number(value.price) || 0),
    category: String(value.category || "Coffee"),
    submenu: String(value.submenu || value.category || "").trim(),
    image: value.image || "/images/logo.png",
    popularity: Math.max(0, Number(value.popularity) || 0),
    source: value.source || item.source || "Menu item",
    isAdminItem: Boolean(item.isAdminItem),
    available: !deleted(item.id) && availability[item.id] !== false,
  };
};
const decorate = (item) =>
  deleted(item.id) ? null : normalize(item, changes.overrides[item.id]);

export const getAllManagedMenuItems = () => [
  ...changes.added.map((item) => normalize(item)),
  ...BASE_ITEMS.map(decorate).filter(Boolean),
];
const sourceItems = (source) =>
  getAllManagedMenuItems()
    .filter((item) => item.source === source)
    .map(({ available, isAdminItem, ...item }) => item);
export const getCustomerMenuItems = () => sourceItems("Menu item");
export const getCustomerNewArrivals = () => sourceItems("New arrival");
export const getCustomerPromos = () => sourceItems("Promo");
export const getCustomerCustomizeOptions = () => sourceItems("Customizer");
export const getManagedMenuItem = (id) =>
  getAllManagedMenuItems().find((item) => item.id === id) || null;

export const subscribeToMenuAvailability = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const getMenuAvailabilityVersion = () => version;
export const getMenuAvailability = () => availability;
export const isMenuItemAvailable = (id) => {
  if (deleted(id)) return false;
  const known = changes.added.some((item) => item.id === id) ||
    BASE_ITEMS.some((item) => item.id === id);
  return known && availability[id] !== false;
};
export const setMenuItemAvailability = (id, available) => {
  const next = { ...availability };
  if (available) delete next[id];
  else next[id] = false;
  availability = next;
  save(AVAILABILITY_KEY, availability);
  emit();
  return { ok: true, available: Boolean(available) };
};

const fields = (item) => ({
  name: String(item.name || "").trim(),
  description: String(item.description || "").trim(),
  price: Math.max(0, Number(item.price) || 0),
  category: String(item.category || "Coffee"),
  submenu: String(item.submenu || item.category || "").trim(),
  image: item.image || "/images/logo.png",
  source: item.source || "Menu item",
  optionGroups: Array.isArray(item.optionGroups) ? item.optionGroups : [],
  baseProductId: item.baseProductId || "",
  bundleProductIds: Array.isArray(item.bundleProductIds) ? item.bundleProductIds : [],
});
const commit = (next) => {
  changes = next;
  save(CATALOG_KEY, changes);
  emit();
};

export const addManagedMenuItem = (item) => {
  const entry = normalize({
    ...fields(item),
    id: `admin-menu-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    source: fields(item).source,
    popularity: 1,
    isAdminItem: true,
    // Used by the Admin dashboard "Recently Added Products" list.
    createdAt: new Date().toISOString(),
  });
  commit({ ...changes, added: [entry, ...changes.added] });
  return { ok: true, item: entry };
};

export const updateManagedMenuItem = (id, item) => {
  if (deleted(id)) return { ok: false, error: "This menu item was deleted." };
  const values = fields(item);
  const index = changes.added.findIndex((entry) => entry.id === id);
  if (index >= 0) {
    const added = [...changes.added];
    added[index] = normalize({ ...added[index], ...values });
    commit({ ...changes, added });
  } else {
    commit({
      ...changes,
      overrides: {
        ...changes.overrides,
        [id]: { ...changes.overrides[id], ...values },
      },
    });
  }
  return { ok: true, item: getManagedMenuItem(id) };
};

export const deleteManagedMenuItem = (id) => {
  if (deleted(id)) return { ok: false, error: "Item already deleted." };
  const overrides = { ...changes.overrides };
  delete overrides[id];
  commit({
    ...changes,
    added: changes.added.filter((item) => item.id !== id),
    deleted: Array.from(new Set([...changes.deleted, id])),
    overrides,
  });
  availability = { ...availability, [id]: false };
  save(AVAILABILITY_KEY, availability);
  emit();
  return { ok: true };
};

export const useMenuAvailability = () => {
  useSyncExternalStore(
    subscribeToMenuAvailability,
    getMenuAvailabilityVersion,
    getMenuAvailabilityVersion,
  );
  return availability;
};
