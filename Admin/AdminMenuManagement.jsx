import {
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AdminSidebar from "./AdminSidebar";
import AdminConfirmDialog from "./AdminConfirmDialog";
import { getAverageRating, useReviews } from "./Reviews/ReviewsStore";
import { notify } from "../Customer/toastStore";
import { SUBMENUS, getItemOptions } from "../MenuGuest/menuData";
import {
  addManagedMenuItem,
  deleteManagedMenuItem,
  getAllManagedMenuItems,
  setMenuItemAvailability,
  updateManagedMenuItem,
  useMenuAvailability,
} from "../MenuGuest/menuAvailabilityStore";
import "./AdminMenuManagement.css";

const CATEGORY_OPTIONS = ["Coffee", "Non-Coffee", "Food", "Desserts"];
const menuTypeLabel = (value) => value;
const TYPE_OPTIONS = [
  "All Types",
  "Promos",
  "New Arrival",
  "Coffee",
  "Non-Coffee",
  "Food",
  "Desserts",
];
const SOURCE_FILTERS = {
  Promos: "Promo",
  "New Arrival": "New arrival",
};
const CATEGORY_ORDER = ["Coffee", "Non-Coffee", "Food", "Desserts"];
const SUBMENU_ORDER = {
  Coffee: ["Coffee"],
  "Non-Coffee": ["Frappe", "Tea-based", "Milk Drinks"],
  Food: ["Pasta", "Sandwiches", "Burger", "Appetizer", "Rice & Meals"],
  Desserts: ["Cheesecakes", "Ice Cream", "Pastries"],
};
const sectionLabel = (category, submenu) => {
  if (category === "Desserts" && submenu === "Cheesecake") return "Cheesecakes";
  return submenu || category;
};

const sectionForItem = (item) => {
  if (item.source === "Promo") {
    return {
      key: "promos",
      title: "Promos",
      subtitle: "Promo cards",
      order: 0,
      subOrder: 0,
      subKey: "all",
    };
  }
  if (item.source === "New arrival") {
    return {
      key: "new-arrival",
      title: "New Arrival",
      subtitle: "New arrivals",
      order: 1,
      subOrder: 0,
      subKey: "all",
    };
  }
  if (item.source === "Customizer") {
    return {
      key: "customize",
      title: "Customize Menus",
      subtitle: "Customizer cards",
      order: 2,
      subOrder: 0,
      subKey: "all",
    };
  }
  const categoryIndex = CATEGORY_ORDER.indexOf(item.category);
  const subtitle = sectionLabel(item.category, item.submenu);
  const subOrder = Math.max(
    0,
    (SUBMENU_ORDER[item.category] || []).indexOf(subtitle),
  );
  return {
    key: item.category || "Other",
    title: item.category || "Other",
    subtitle,
    order: categoryIndex >= 0 ? categoryIndex + 3 : 99,
    subOrder,
    subKey: subtitle,
  };
};
const SOURCE_OPTIONS = [
  { label: "Menu item", value: "Menu item" },
  { label: "Promo", value: "Promo" },
  { label: "New Arrival", value: "New arrival" },
];
const uniqueGroups = (groups) => {
  const result = [];
  groups.forEach((group) => {
    if (
      group?.id &&
      group?.label &&
      Array.isArray(group.choices) &&
      group.choices.length
    ) {
      result.push({
        id: String(group.id),
        label: String(group.label),
        type: group.type === "multi" ? "multi" : "single",
        defaultId: group.defaultId || group.choices[0]?.id || "",
        choices: group.choices.map((choice) =>
          typeof choice === "string"
            ? { id: choice, label: choice }
            : {
                id: String(choice.id || choice.label),
                label: String(choice.label || choice.id),
                price: Number(choice.price) || 0,
              },
        ),
      });
    }
  });
  return result;
};

const parseOptionText = (text) =>
  String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, groupIndex) => {
      const [rawLabel, ...rawChoices] = line.split(":");
      const label = (
        rawChoices.length ? rawLabel : `Options ${groupIndex + 1}`
      ).trim();
      const choices = (rawChoices.length ? rawChoices.join(":") : rawLabel)
        .split("|")
        .map((choice) => choice.trim())
        .filter(Boolean)
        .map((choice) => {
          const match = choice.match(/^(.*?)\s*\(\+?₱?(\d+(?:\.\d+)?)\)$/);
          return match
            ? {
                id: match[1].trim(),
                label: match[1].trim(),
                price: Number(match[2]),
              }
            : { id: choice, label: choice };
        });
      return {
        id: `admin-option-${groupIndex + 1}`,
        label,
        type: "single",
        defaultId: choices[0]?.id || "",
        choices,
      };
    });

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "0",
  category: "Coffee",
  submenu: "Coffee",
  image: "/images/logo.png",
  source: "Menu item",
  baseProductId: "",
  bundleProductIds: ["", "", ""],
  optionGroups: [],
  customOptionsText: "",
};

const submenuOptions = (category, currentSubmenu, catalogItems = []) => {
  const configured =
    category === "Desserts"
      ? ["Cheesecakes", "Ice Cream", "Pastries"]
      : SUBMENUS[category] || [category];
  const catalogSubmenus = catalogItems
    .filter((item) => item.category === category)
    .map((item) => sectionLabel(item.category, item.submenu))
    .filter(Boolean);
  const current = sectionLabel(category, currentSubmenu);
  return Array.from(
    new Set([...configured, ...catalogSubmenus, current].filter(Boolean)),
  );
};
const defaultCategoryForSource = (source) => {
  if (source === "Promo") return "Non-Coffee";
  if (source === "Customizer") return "Non-Coffee";
  return "Coffee";
};

function AdminMenuManagement() {
  useMenuAvailability();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All Types");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pendingSave, setPendingSave] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmAvailability, setConfirmAvailability] = useState(null);
  const items = getAllManagedMenuItems();
  const reviews = useReviews();
  const productRating = (item) => {
    const count = reviews.filter(
      (review) =>
        review.targetKind === "product" && review.productId === item.id,
    ).length;
    return count
      ? `${getAverageRating(item.id).toFixed(1)} (${count})`
      : "No reviews";
  };

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return items
      .filter((item) => {
        const sourceMatches = SOURCE_FILTERS[type];
        const matchesType =
          type === "All Types" ||
          item.category === type ||
          item.source === sourceMatches;
        const text = [
          item.name,
          item.description,
          item.category,
          item.submenu,
          item.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return matchesType && (!normalized || text.includes(normalized));
      })
      .sort(
        (a, b) =>
          a.category.localeCompare(b.category) ||
          (a.submenu || "").localeCompare(b.submenu || "") ||
          a.name.localeCompare(b.name),
      );
  }, [items, query, type]);

  const groups = useMemo(() => {
    const result = [];
    visible.forEach((item) => {
      const section = sectionForItem(item);
      const key = `${section.key}::${section.subKey}`;
      let group = result.find((entry) => entry.key === key);
      if (!group) {
        group = { ...section, key, items: [] };
        result.push(group);
      }
      group.items.push(item);
    });
    return result
      .sort(
        (a, b) =>
          a.order - b.order ||
          a.subOrder - b.subOrder ||
          a.title.localeCompare(b.title),
      )
      .map((group) => ({
        ...group,
        items: [...group.items].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [visible]);

  const openAdd = () => {
    setEditing("new");
    setForm({
      ...EMPTY_FORM,
      bundleProductIds: ["", "", ""],
      customOptionsText: "",
    });
    setError("");
  };
  const openEdit = (item) => {
    setEditing(item.id);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category || "Coffee",
      submenu: sectionLabel(
        item.category || "Coffee",
        item.submenu || item.category || "Coffee",
      ),
      image: item.image,
      source: item.source || "Menu item",
      baseProductId: item.baseProductId || "",
      bundleProductIds: item.bundleProductIds?.length
        ? item.bundleProductIds
        : ["", "", ""],
      optionGroups: Array.isArray(item.optionGroups) ? item.optionGroups : [],
      customOptionsText: (item.optionGroups || [])
        .map(
          (group) =>
            `${group.label}: ${group.choices.map((choice) => `${choice.label}${choice.price ? ` (+₱${choice.price})` : ""}`).join(" | ")}`,
        )
        .join("\n"),
    });
    setError("");
  };
  const closeForm = () => {
    setEditing(null);
    setError("");
  };
  const bundleCandidates = useMemo(
    () =>
      items
        .filter((item) => item.source !== "Promo" && item.source !== "Customizer")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );
  const setBundleProduct = (index, id) => {
    setForm((current) => {
      const next = [...(current.bundleProductIds || ["", "", ""])];
      while (next.length < 3) next.push("");
      next[index] = id;
      return { ...current, bundleProductIds: next };
    });
  };
  const changeSource = (source) => {
    const category = defaultCategoryForSource(source);
    setForm((current) => ({
      ...current,
      source,
      category,
      submenu: submenuOptions(category, null, items)[0],
    }));
  };
  const changeCategory = (category) => {
    setForm((current) => ({
      ...current,
      category,
      submenu: submenuOptions(category, null, items)[0],
    }));
  };
  const requestSave = (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.description.trim()) {
      setError("Name and description are required.");
      return;
    }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      setError("Enter a valid price of zero or more.");
      return;
    }
    if (form.source === "Promo" && !form.bundleProductIds?.[0]) {
      setError("Choose the first product included in this promo.");
      return;
    }
    if (
      form.source === "Promo" &&
      new Set(form.bundleProductIds.filter(Boolean)).size !==
        form.bundleProductIds.filter(Boolean).length
    ) {
      setError("A promo cannot include the same product more than once.");
      return;
    }
    setError("");
    setPendingSave({ ...form });
  };
  const confirmSave = () => {
    if (!pendingSave) return;
    const values = { ...pendingSave };
    const catalog = getAllManagedMenuItems();
    const bundleItems = (values.bundleProductIds || [])
      .filter(Boolean)
      .map((id) => catalog.find((item) => item.id === id))
      .filter(Boolean);
    const inherited = bundleItems.length
      ? bundleItems.flatMap((item) =>
          getItemOptions(item).map((group) => ({
            ...group,
            id: `${item.id}-${group.id}`,
            label: `${item.name} — ${group.label}`,
            defaultId: `${item.id}-${group.defaultId || group.choices[0]?.id || ""}`,
            choices: group.choices.map((choice) => ({
              ...choice,
              id: `${item.id}-${choice.id}`,
            })),
          })),
        )
      : values.baseProductId
        ? getItemOptions(
            catalog.find((item) => item.id === values.baseProductId) || {},
          )
        : [];
    const optionGroups = uniqueGroups(
      values.customOptionsText?.trim()
        ? parseOptionText(values.customOptionsText)
        : inherited,
    );
    const result =
      editing === "new"
        ? addManagedMenuItem({ ...values, optionGroups })
        : updateManagedMenuItem(editing, { ...values, optionGroups });
    if (!result.ok) {
      setError(result.error || "Unable to save the menu item.");
      setPendingSave(null);
      return;
    }
    notify(`${values.name} was ${editing === "new" ? "added" : "updated"}.`);
    setPendingSave(null);
    closeForm();
  };
  const confirmAvailabilityChange = () => {
    if (!confirmAvailability) return;
    const { item, available } = confirmAvailability;
    const result = setMenuItemAvailability(item.id, available);
    notify(
      result.ok
        ? `${item.name} is now ${available ? "available" : "not available"}.`
        : result.error,
      result.ok ? "success" : "error",
    );
    setConfirmAvailability(null);
  };
  const remove = () => {
    if (!confirmDelete) return;
    const result = deleteManagedMenuItem(confirmDelete.id);
    notify(
      result.ok
        ? `${confirmDelete.name} was deleted from the menu.`
        : result.error,
      result.ok ? "info" : "error",
    );
    setConfirmDelete(null);
  };
  const readImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Please choose an image file.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notify("Please choose an image smaller than 2 MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, image: reader.result }));
      setError("");
      notify("Image selected. Save the item to publish it.", "info");
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <AdminSidebar />
      <main className="admin-management-page admin-menu-management-page">
        <header className="admin-management-header">
          <div>
            <span>ADMIN PANEL</span>
            <h1>Menu Management</h1>
            <p>
              Manage every guest-facing menu, promo, arrival, and customizer.
            </p>
          </div>
          <button
            className="admin-primary-button"
            type="button"
            onClick={openAdd}
          >
            <Plus size={16} /> Add menu item
          </button>
        </header>

        <section className="admin-management-summary">
          <article>
            <span>All cards</span>
            <strong>{items.length}</strong>
            <small>Every managed menu type</small>
          </article>
          <article>
            <span>Available</span>
            <strong>{items.filter((item) => item.available).length}</strong>
            <small>Visible to guests and customers</small>
          </article>
          <article>
            <span>Not available</span>
            <strong>{items.filter((item) => !item.available).length}</strong>
            <small>Shown as disabled cards</small>
          </article>
        </section>

        <section className="admin-management-panel">
          <div className="admin-management-toolbar">
            <label>
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, section, or description"
              />
            </label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              aria-label="Filter menu type"
            >
              {TYPE_OPTIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {menuTypeLabel(entry)}
                </option>
              ))}
            </select>
          </div>

          {groups.length ? (
            <div className="admin-menu-groups">
              {groups.map((group) => (
                <section className="admin-menu-group" key={group.key}>
                  <header className="admin-menu-group-heading">
                    <div>
                      <strong>{group.title}</strong>
                      <span>{group.subtitle}</span>
                    </div>
                    <small>
                      {group.items.length} item
                      {group.items.length === 1 ? "" : "s"}
                    </small>
                  </header>
                  <div className="admin-menu-list">
                    {group.items.map((item) => (
                      <article
                        className={`admin-menu-row${item.available ? "" : " is-disabled"}`}
                        key={item.id}
                      >
                        <div className="admin-menu-item-image">
                          <img src={item.image} alt={item.name} />
                        </div>
                        <div className="admin-menu-copy">
                          <span className="admin-menu-rating">
                            <Star size={12} fill="currentColor" />{" "}
                            {productRating(item)}
                          </span>
                          <strong>{item.name}</strong>
                          <span>
                            {item.source} · {item.category} ·{" "}
                            {sectionLabel(
                              item.category,
                              item.submenu || "General",
                            )}
                          </span>
                          <small>{item.description}</small>
                        </div>
                        <strong className="admin-menu-price">
                          &#8369;{item.price.toLocaleString()}
                        </strong>
                        <span
                          className={`admin-status-pill ${item.available ? "available" : "disabled"}`}
                        >
                          {item.available ? "Available" : "Not available"}
                        </span>
                        <div className="admin-menu-actions">
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAvailability({
                                item,
                                available: !item.available,
                              })
                            }
                            title={
                              item.available ? "Disable item" : "Enable item"
                            }
                          >
                            {item.available ? (
                              <Eye size={19} />
                            ) : (
                              <EyeOff size={19} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            title="Edit item"
                          >
                            <Pencil size={19} />
                          </button>
                          <button
                            className="danger"
                            type="button"
                            onClick={() => setConfirmDelete(item)}
                            title="Delete item"
                          >
                            <Trash2 size={19} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <Utensils size={30} />
              <p>No menu items matched the selected type.</p>
            </div>
          )}
        </section>
      </main>

      {editing &&
        createPortal(
          <div
            className="admin-modal-backdrop"
            role="presentation"
            onClick={closeForm}
          >
            <form
              className="admin-form-modal admin-menu-form"
              onSubmit={requestSave}
              onClick={(event) => event.stopPropagation()}
            >
              <header className="admin-menu-form-head">
                <h2>{editing === "new" ? "Add menu item" : "Edit menu item"}</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeForm}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </header>
              <div className="admin-menu-form-scroll">
                <div className="admin-form-grid">
                <label>
                  Name
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                  />
                </label>
                <label>
                  Price (&#8369;)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) =>
                      setForm({ ...form, price: event.target.value })
                    }
                  />
                </label>
                <label>
                  Card type
                  <select
                    value={form.source}
                    onChange={(event) => changeSource(event.target.value)}
                  >
                    {SOURCE_OPTIONS.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                {form.source !== "Promo" && (
                  <>
                    <label>
                      Category
                      <select
                        value={form.category}
                        onChange={(event) => changeCategory(event.target.value)}
                      >
                        {CATEGORY_OPTIONS.map((entry) => (
                          <option key={entry} value={entry}>
                            {menuTypeLabel(entry)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="wide">
                      Section / submenu
                      <select
                        value={form.submenu}
                        onChange={(event) =>
                          setForm({ ...form, submenu: event.target.value })
                        }
                      >
                        {submenuOptions(form.category, form.submenu, items).map(
                          (entry) => (
                            <option key={entry}>{entry}</option>
                          ),
                        )}
                      </select>
                    </label>
                  </>
                )}
                {form.source === "Promo" ? (
                  <div className="wide admin-menu-option-builder">
                    <div className="admin-menu-product-selectors">
                      {[
                        "Product 1 (required)",
                        "Product 2 (optional)",
                        "Product 3 (optional)",
                      ].map((label, index) => (
                        <label key={label}>
                          {label}
                          <select
                            value={form.bundleProductIds?.[index] || ""}
                            onChange={(event) =>
                              setBundleProduct(index, event.target.value)
                            }
                          >
                            <option value="">
                              {index === 0 ? "Select a product" : "None"}
                            </option>
                            {bundleCandidates.map((item) => (
                              <option
                                key={item.id}
                                value={item.id}
                                disabled={form.bundleProductIds.some(
                                  (selectedId, selectedIndex) =>
                                    selectedIndex !== index &&
                                    selectedId === item.id,
                                )}
                              >
                                {item.name} · {item.category}
                                {item.submenu ? ` / ${item.submenu}` : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <label className="wide">
                    Base product for inherited options (optional)
                    <select
                      value={form.baseProductId || ""}
                      onChange={(event) =>
                        setForm({ ...form, baseProductId: event.target.value })
                      }
                    >
                      <option value="">No inherited options</option>
                      {bundleCandidates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.category}
                          {item.submenu ? ` / ${item.submenu}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="wide">
                  Custom product options (optional)
                  <textarea
                    rows="4"
                    value={form.customOptionsText || ""}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        customOptionsText: event.target.value,
                      })
                    }
                    placeholder={
                      "Serving: Hot | Iced\nSugar Level: 0% | 30% | 50%\nAdd-ons: Extra Shot (+₱20) | Whipped Cream (+₱15)"
                    }
                  />
                </label>

                <label className="wide">
                  Description
                  <textarea
                    rows="3"
                    value={form.description}
                    onChange={(event) =>
                      setForm({ ...form, description: event.target.value })
                    }
                  />
                </label>
                <label className="wide">
                  Image URL
                  <input
                    value={form.image}
                    onChange={(event) =>
                      setForm({ ...form, image: event.target.value })
                    }
                  />
                </label>
                <label className="admin-file-upload wide">
                  <ImagePlus size={18} />
                  <span>
                    Upload or change image
                    <input type="file" accept="image/*" onChange={readImage} />
                  </span>
                </label>
              </div>
              {error && <p className="admin-form-error">{error}</p>}
              <div className="admin-form-actions">
                <button type="button" onClick={closeForm}>
                  Cancel
                </button>
                <button className="admin-primary-button">
                  <Save size={15} />{" "}
                  {editing === "new" ? "Review & add" : "Review changes"}
                </button>
              </div>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {pendingSave && (
        <AdminConfirmDialog
          title={
            editing === "new" ? "Add this menu item?" : "Save these changes?"
          }
          message={`${pendingSave.name} will be saved as a ${pendingSave.source} card at ${Number(pendingSave.price).toLocaleString()} pesos.`}
          confirmLabel={
            editing === "new" ? "Yes, add item" : "Yes, save changes"
          }
          variant="success"
          onCancel={() => setPendingSave(null)}
          onConfirm={confirmSave}
        />
      )}
      {confirmAvailability && (
        <AdminConfirmDialog
          title={
            confirmAvailability.available
              ? "Enable this menu item?"
              : "Make this item unavailable?"
          }
          message={`${confirmAvailability.item.name} will be ${confirmAvailability.available ? "available for ordering again" : "shown as a disabled Not available card"}.`}
          confirmLabel={
            confirmAvailability.available ? "Yes, enable" : "Yes, disable"
          }
          variant={confirmAvailability.available ? "success" : "danger"}
          icon={confirmAvailability.available ? Eye : EyeOff}
          onCancel={() => setConfirmAvailability(null)}
          onConfirm={confirmAvailabilityChange}
        />
      )}
      {confirmDelete && (
        <AdminConfirmDialog
          title="Delete this menu item?"
          message={`${confirmDelete.name} will be removed from the customer and guest menus. Existing order records will remain unchanged.`}
          confirmLabel="Yes, delete"
          icon={Trash2}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={remove}
        />
      )}
    </>
  );
}

export default AdminMenuManagement;
