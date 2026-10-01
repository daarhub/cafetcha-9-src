import { useMemo, useState } from "react";
import { Eye, EyeOff, Search, Utensils } from "lucide-react";
import StaffSidebar from "./StaffSidebar";
import { notify } from "../Customer/toastStore";
import {
  getAllManagedMenuItems,
  isMenuItemAvailable,
  setMenuItemAvailability,
  useMenuAvailability,
} from "../MenuGuest/menuAvailabilityStore";
import "./StaffOrders.css";
import "./StaffMenuItems.css";

const SPECIAL_CATEGORY_FILTERS = {
  Promo: "Promo",
  "New Arrival": "New arrival",
  Customize: "Customizer",
};

function StaffMenuItems() {
  const availability = useMenuAvailability();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const allItems = getAllManagedMenuItems();
  const categories = useMemo(
    () => [
      "All categories",
      ...Object.keys(SPECIAL_CATEGORY_FILTERS),
      ...Array.from(new Set(allItems.map((item) => item.category))).filter(
        (entry) =>
          entry &&
          entry !== "All categories" &&
          !Object.keys(SPECIAL_CATEGORY_FILTERS).includes(entry),
      ),
    ],
    [allItems],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = allItems.filter((item) => {
    const matchesCategory =
      category === "All categories" ||
      item.category === category ||
      SPECIAL_CATEGORY_FILTERS[category] === item.source;
    const searchable = [item.name, item.category, item.source, item.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      matchesCategory &&
      (!normalizedQuery || searchable.includes(normalizedQuery))
    );
  });
  const availableCount = allItems.filter((item) =>
    isMenuItemAvailable(item.id),
  ).length;

  const changeAvailability = (item, value) => {
    const available = value === "available";
    setMenuItemAvailability(item.id, available);
    notify(
      `${item.name} is now ${available ? "available" : "not available"}.`,
      available ? "success" : "info",
    );
  };

  return (
    <>
      <StaffSidebar />
      <main className="staff-page staff-menu-items-page">
        <header className="staff-page-header">
          <div>
            <span className="staff-page-eyebrow">STAFF PANEL / MENU ITEMS</span>
            <h1>Menu items</h1>
            <p>Choose which menu cards guests and customers can order.</p>
          </div>
          <a href="/staff/orders" className="staff-page-link">
            Back to active orders
          </a>
        </header>

        <section
          className="staff-orders-summary staff-menu-summary"
          aria-label="Menu availability summary"
        >
          <article className="staff-summary-card staff-summary-card-dark">
            <span>All menu items</span>
            <strong>{allItems.length}</strong>
            <small>Cards managed by staff</small>
          </article>
          <article className="staff-summary-card">
            <span>Available</span>
            <strong>{availableCount}</strong>
            <small>Visible to guests and customers</small>
          </article>
          <article className="staff-summary-card">
            <span>Not available</span>
            <strong>{allItems.length - availableCount}</strong>
            <small>Shown with a disabled Not available card</small>
          </article>
        </section>

        <section className="staff-surface staff-menu-items-card">
          <div className="staff-menu-items-toolbar">
            <div>
              <h2>Menu availability</h2>
              <p>Changes apply immediately to the guest and customer menu.</p>
            </div>
            <div className="staff-menu-filters">
              <label className="staff-search">
                <Search size={16} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search menu items"
                  aria-label="Search menu items"
                />
              </label>
              <select
                className="staff-menu-category-select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter menu items by category"
              >
                {categories.map((entry) => (
                  <option key={entry}>{entry}</option>
                ))}
              </select>
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="staff-empty-state">
              <Utensils size={28} />
              <strong>No menu items found</strong>
              <p>Try another search or category.</p>
            </div>
          ) : (
            <div className="staff-menu-items-list">
              {visibleItems.map((item) => {
                const available = availability[item.id] !== false;
                return (
                  <article
                    className={`staff-menu-item-row${available ? "" : " is-unavailable"}`}
                    key={`${item.source}-${item.id}`}
                  >
                    <div className="staff-menu-item-image">
                      <img src={item.image} alt="" />
                    </div>
                    <div className="staff-menu-item-copy">
                      <strong>{item.name}</strong>
                      <span>
                        {item.source} · {item.category}
                        {item.submenu ? ` · ${item.submenu}` : ""}
                      </span>
                      <small>{item.description}</small>
                    </div>
                    <div className="staff-menu-item-controls">
                      <span
                        className={`staff-menu-availability ${
                          available ? "available" : "unavailable"
                        }`}
                      >
                        {available ? <Eye size={14} /> : <EyeOff size={14} />}
                        {available ? "Available" : "Not available"}
                      </span>
                      <label className="staff-menu-status-select">
                        <span>Card status</span>
                        <select
                          value={available ? "available" : "unavailable"}
                          onChange={(event) =>
                            changeAvailability(item, event.target.value)
                          }
                          aria-label={`Set ${item.name} availability`}
                        >
                          <option value="available">Available</option>
                          <option value="unavailable">Not available</option>
                        </select>
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default StaffMenuItems;
