import {
  Search,
  Plus,
  ShoppingCart,
  SlidersHorizontal,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CATEGORIES,
  SUBMENUS,
  getItemOptions,
} from "./menuData";
import Header from "../HomepageGuest/Header";
import AuthModal from "../Customer/AuthModal";
import LoginModal from "../HomepageGuest/LoginModal";
import ProductReviewsModal from "../Admin/Reviews/ProductReviewsModal";
import { getAverageRating, useReviews } from "../Admin/Reviews/ReviewsStore";
import {
  addToCart,
  deleteReorderCard,
  getCartCount,
  getCartTotal,
  getYouMightLike,
  isLoyaltyRewardActive,
  resolveCustomizedName,
  useCustomerStore,
} from "../Customer/customerStore";
import { notify } from "../Customer/toastStore";
import {
  getCustomerCustomizeOptions,
  getCustomerMenuItems,
  getCustomerNewArrivals,
  getCustomerPromos,
  getManagedMenuItem,
  isMenuItemAvailable,
  useMenuAvailability,
} from "./menuAvailabilityStore";
import Footer from "../HomepageGuest/Footer";
import ProductModal from "./ProductModal";
import CheckoutModal from "../Customer/CheckoutModal";
import "./MenuPage.css";

// The 3D customizer is lazy-loaded so the heavy Three.js bundle stays in its
// own chunk and only loads when the guest opens a customize card.
const CustomizeFrappeModal = lazy(
  () => import("./customizeFrappe/CustomizeFrappeModal"),
);

// The tea customizer is lazy-loaded the same way - shared heavy Three.js
// chunk,so it only loads when a guest opens the "Build Your Tea" card.
const CustomizeTeaModal = lazy(
  () => import("./customizeTea/CustomizeTeaModal"),
);

// The sandwich customizer is lazy-loaded like the others - it shares the
// heavy Three.js chunk and only loads when a guest opens the
// "Build Your Sandwich" card.
const CustomizeSandwichModal = lazy(
  () => import("./customizeSandwich/CustomizeSandwichModal"),
);

// The burger customizer is lazy-loaded like the others - it shares the
// heavy Three.js chunk and only loads when a guest opens the
// "Build Your Burger" card.
const CustomizeBurgerModal = lazy(
  () => import("./customizeBurger/CustomizeBurgerModal"),
);

// The cheesecake customizer is lazy-loaded like the others - it shares
// the heavy Three.js chunk and only loads when a guest opens the
// "Customize Cheesecake" card.
const CustomizeCheesecakeModal = lazy(
  () => import("./customizeCheesecake/CustomizeCheesecakeModal"),
);

// The ice cream customizer is lazy-loaded like the others - it shares
// the heavy Three.js chunk and only loads when a guest opens the
// "Customize Ice Cream" card.
const CustomizeIceCreamModal = lazy(
  () => import("./customizeIceCream/CustomizeIceCreamModal"),
);

// Menu item data now lives in ./menuData.js and is imported above.
// Promos, new arrivals, customize options, categories, and submenus
// also live in ./menuData.js.
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// New arrival cards keep the "New" badge styling wherever they show up,
// including the additional arrival cards inside the Coffee, Frappe,
// Appetizer, and Pastries sections. Every customer-facing array below comes
// from the shared catalog, so admin additions, edits, and deletions appear
// here without changing the original menu source data.

const LoyaltyStamp = () => (
  <span
    className="menu-loyalty-stamp"
    title="Free coffee available"
    aria-label="Free coffee available"
  >
    <img src="/images/logo.png" alt="" />
  </span>
);

const UnavailableBadge = () => (
  <span className="menu-unavailable-badge">Not available</span>
);

// A menu category can be deep-linked via /menu?category=Coffee etc.
const initialCategory = (() => {
  const params = new URLSearchParams(window.location.search);
  return CATEGORIES.includes(params.get("category"))
    ? params.get("category")
    : "All Items";
})();

function MenuPage() {
  const [category, setCategory] = useState(initialCategory);
  const [expandedCategory, setExpandedCategory] = useState(
    SUBMENUS[initialCategory] ? initialCategory : null,
  );
  const [sort, setSort] = useState("All Items");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewsItem, setReviewsItem] = useState(null);
  const [showFrappe, setShowFrappe] = useState(false);
  const [showTea, setShowTea] = useState(false);
  const [showSandwich, setShowSandwich] = useState(false);
  const [showBurger, setShowBurger] = useState(false);
  const [showCheesecake, setShowCheesecake] = useState(false);
  const [showIceCream, setShowIceCream] = useState(false);
  // Customer account + cart (localStorage-backed for now). The header,
  // the sidebar cart box and the modals all read from this store.
  const { customer, cart } = useCustomerStore();
  const menuAvailability = useMenuAvailability();
  const menuItems = getCustomerMenuItems();
  const promos = getCustomerPromos();
  const newArrivals = getCustomerNewArrivals();
  const customizeOptions = getCustomerCustomizeOptions();
  const newArrivalIds = new Set(newArrivals.map((item) => item.id));
  const promoIds = new Set(promos.map((item) => item.id));
  const allProducts = [...menuItems, ...newArrivals, ...promos];
  const youMightLikeVariant = (productId) =>
    promoIds.has(productId)
      ? "promo-card"
      : newArrivalIds.has(productId)
        ? "arrival-card"
        : "";
  const isCoffeeProduct = (productId) =>
    allProducts.some(
      (entry) => entry.id === productId && entry.category === "Coffee",
    );

  // The free-coffee loyalty stamp only applies to real coffee drinks, never to
  // promo bundles (which may mix drinks, frappe, food, or desserts).
  const isPromoItem = (itemId) =>
    allProducts.some(
      (entry) => entry.id === itemId && entry.source === "Promo",
    );
  const arrivalsFor = (title) =>
    newArrivals.filter(
      (item) => item.category === title || item.submenu === title,
    );
  // Subscribe to the reviews store so the rating-based "Popularity" sort
  // re-renders the moment a customer posts a new review.
  useReviews();
  const cartCount = getCartCount(cart);
  const cartTotal = getCartTotal(cart);
  // The activated loyalty card unlocks "Redeem Free Coffee" on coffee items.
  const loyaltyRedeemable = isLoyaltyRewardActive();
  const [authOpen, setAuthOpen] = useState(false);
  // Reorder card queued for removal from "You Might Like" (null = closed).
  const [deleteCard, setDeleteCard] = useState(null);
  // Product modal prefill (the customer's previous options) when a reorder
  // card's + is clicked - null opens the modal normally.
  const [selectedPrefill, setSelectedPrefill] = useState(null);
  // Customizer prefill (customize id + saved summary + name) when a custom
  // reorder card's "Customize +" is clicked.
  const [customizerPrefill, setCustomizerPrefill] = useState(null);
  // Free-coffee redemption: the coffee picked via "Redeem Free Coffee" in the
  // product modal, passed straight to the redeem checkout (never the cart).
  const [redeemItem, setRedeemItem] = useState(null);
  // A review-reply notification can deep-link directly to a product's review
  // modal by product id. The modal itself still shows the full review list.
  const requestedReviewProductId = new URLSearchParams(
    window.location.search,
  ).get("reviews");
  const requestedReviewItem = requestedReviewProductId
    ? getManagedMenuItem(requestedReviewProductId)
    : null;
  const [deepLinkedReviewOpened, setDeepLinkedReviewOpened] = useState(false);
  useEffect(() => {
    if (!requestedReviewItem || deepLinkedReviewOpened) return;
    setDeepLinkedReviewOpened(true);
    setSelectedItem(null);
    setReviewsItem(requestedReviewItem);
  }, [requestedReviewItem, deepLinkedReviewOpened]);
  const matchesSearch = (item) =>
    item.name.toLowerCase().includes(search.toLowerCase());
  const isAvailable = (item) => isMenuItemAvailable(item.id);
  const isAvailableById = (itemId) => isMenuItemAvailable(itemId);
  const categorySubmenus = (name) => {
    const configured = SUBMENUS[name] || [name];
    const catalogSubmenus = menuItems
      .filter((item) => item.category === name)
      .map((item) => item.submenu)
      .filter(Boolean);
    return Array.from(new Set([...configured, ...catalogSubmenus]));
  };
  const sortItems = (items) =>
    items
      .filter(matchesSearch)
      .sort((a, b) =>
        sort === "Price: Low to High"
          ? a.price - b.price
          : sort === "Price: High to Low"
            ? b.price - a.price
            : sort === "Popularity"
              ? // "Popularity" ranks by each product's real star rating - the
                // same live average shown in the product modal (unrated items
                // default to 5.0) - falling back to the static popularity
                // score only to break ties.
                getAverageRating(b.id) - getAverageRating(a.id) ||
                b.popularity - a.popularity
              : 0,
      );
  const normal = (title, items, anchor = title) => ({
    title,
    anchor,
    kind: "products",
    // New arrival products are also featured at the top of their own section
    // (Coffee, Frappe, Appetizer, Pastries) as arrival-styled cards.
    items: sortItems([...arrivalsFor(title), ...items]),
  });
  const customize = (items, anchor) => ({
    title: "Customize",
    anchor,
    kind: "customize",
    items: items.filter(matchesSearch),
  });
  const heading = (title, anchor, visible = true) => ({
    title,
    anchor,
    kind: "heading",
    items: [],
    visible,
  });
  const allItemsSections = () => {
    const group = (name) => {
      const groupItems = [
        ...customizeOptions.filter((item) => item.category === name),
        ...menuItems.filter((item) => item.category === name),
        // Arrival cards in this group count toward the heading's
        // search-visibility check too.
        ...arrivalsFor(name),
      ];
      return [
        heading(name, `${name}-heading`, groupItems.some(matchesSearch)),
        customize(
          customizeOptions.filter((item) => item.category === name),
          `${name}-customize`,
        ),
        ...(categorySubmenus(name).length > 1
          ? categorySubmenus(name).map((submenu) =>
              normal(
                submenu,
                menuItems.filter(
                  (item) => item.category === name && item.submenu === submenu,
                ),
                `${name}-${submenu}`,
              ),
            )
          : [
              normal(
                name,
                menuItems.filter((item) => item.category === name),
                name,
              ),
            ]),
      ];
    };
    return [
      normal("Promos", promos),
      normal("New Arrival", newArrivals),
      normal(
        "Coffee",
        menuItems.filter((item) => item.category === "Coffee"),
      ),
      ...group("Non-Coffee"),
      ...group("Food"),
      ...group("Desserts"),
    ];
  };
  const categorySections = (name) => {
    const customOptions = customizeOptions.filter(
      (item) => item.category === name,
    );
    const itemGroups = categorySubmenus(name).length > 1
      ? categorySubmenus(name).map((submenu) =>
          normal(
            submenu,
            menuItems.filter(
              (item) => item.category === name && item.submenu === submenu,
            ),
            `${name}-${submenu}`,
          ),
        )
      : [
          normal(
            name,
            menuItems.filter((item) => item.category === name),
            name,
          ),
        ];
    return [
      ...(customOptions.length
        ? [customize(customOptions, `${name}-customize`)]
        : []),
      ...itemGroups,
    ];
  };
  const sections = useMemo(() => {
    const youMightLike = getYouMightLike();
    const built =
      category === "All Items"
        ? allItemsSections()
        : category === "Promos"
          ? [normal("Promos", promos)]
          : category === "New Arrival"
            ? [normal("New Arrival", newArrivals)]
            : categorySections(category);
    // Logged-in customers who have checked out before get a personalized
    // "You Might Like" row above everything else - reorder cards built from
    // their exact past orders, plus up to 2 suggested products. It lives
    // only in the "All Items" view, never inside a category list.
    // The "You Might Like" cards participate in search too - reorder cards
    // match on their saved name, suggested cards on name/description.
    const query = search.trim().toLowerCase();
    const ymlReorders = youMightLike.reorders.filter((card) =>
      query ? card.name.toLowerCase().includes(query) : true,
    );
    const ymlSuggestions = youMightLike.suggestions.filter((item) =>
      query
        ? item.name.toLowerCase().includes(query) ||
          (item.description || "").toLowerCase().includes(query)
        : true,
    );
    // "You Might Like" honours the same Sort by choice as the rest of the menu,
    // so the personalized rows never stay in their original order. Reorder cards
    // only store a productId, so Popularity is resolved through the catalog.
    const idOf = (entry) => entry.productId || entry.id;
    const popularityOf = (entry) => {
      const found = menuItems.find((item) => item.id === idOf(entry));
      return found ? found.popularity : entry.popularity || 0;
    };
    const sortByOption = (a, b) =>
      sort === "Price: Low to High"
        ? a.price - b.price
        : sort === "Price: High to Low"
          ? b.price - a.price
          : sort === "Popularity"
            ? getAverageRating(idOf(b)) - getAverageRating(idOf(a)) ||
              popularityOf(b) - popularityOf(a)
            : 0;
    ymlSuggestions.sort(sortByOption);
    ymlReorders.sort(sortByOption);
    if (
      customer &&
      category === "All Items" &&
      (ymlReorders.length > 0 || ymlSuggestions.length > 0)
    ) {
      built.unshift({
        title: "You Might Like",
        anchor: "You Might Like",
        kind: "youmightlike",
        reorders: ymlReorders,
        suggestions: ymlSuggestions,
      });
    }
    // Hide category headings whose group has no search matches.
    return built.filter(
      (section) => section.kind !== "heading" || section.visible,
    );
  }, [category, sort, search, customer, menuAvailability, menuItems, promos, newArrivals, customizeOptions]); // eslint-disable-line react-hooks/exhaustive-deps
  // Changing Sort by re-renders every grid, which can shift the page height and
  // make the browser jump the scroll position. Remember where the visitor was
  // and restore it right after the layout so the scroll bar never moves.
  const sortScrollRef = useRef(0);
  useLayoutEffect(() => {
    const target = sortScrollRef.current;
    if (target && Math.abs(window.scrollY - target) > 1) {
      window.scrollTo({ top: target, behavior: "auto" });
    }
  }, [sort]);
  const handleSort = (option) => {
    sortScrollRef.current = window.scrollY;
    setSort(option);
  };
  const selectCategory = (name) => {
    if (name === category && SUBMENUS[name]) {
      setExpandedCategory((current) => (current === name ? null : name));
      return;
    }
    // Filter clicks keep the visitor where they are - the page scroll bar must
    // not jump while browsing the sidebar.
    sortScrollRef.current = window.scrollY;
    setCategory(name);
    setExpandedCategory(SUBMENUS[name] ? name : null);
  };
  const jumpToSubmenu = (name, submenu) =>
    document
      .getElementById(slug(`${name}-${submenu}`))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  // ---------- Customer account / cart (localStorage-backed for now) ----------

  // Product modal -> cart. Guests get the small Login Required modal (the
  // product modal stays open underneath); logged-in customers get an
  // "added to cart" notification and stay right where they are.
  const handleProductAdd = (cartItem) => {
    if (!customer) {
      setModal("login");
      return;
    }
    if (!isAvailableById(cartItem.productId)) {
      notify("This menu item is currently not available.", "error");
      return;
    }
    const result = addToCart(cartItem);
    if (!result.ok) {
      notify(result.error || "This menu item is currently unavailable.", "error");
      return;
    }
    notify(`Added to cart - ${cartItem.name}`);
    // The product modal closes right after adding; the toast confirms it.
    // Prefill is cleared too so the next normal open starts fresh.
    setSelectedItem(null);
    setSelectedPrefill(null);
  };

  // 3D customizer -> cart. The payload carries the chosen options, the
  // build name the customer typed, its price and a readable summary. The
  // cart line uses the customize card's image and that name - never a 3D
  // render. Guests get the Login Required gate; customers get a toast.
  const handleCustomizeAdd = (payload, customizeId, closeCustomizer) => {
    if (!customer) {
      setModal("login");
      return;
    }
    if (!isAvailableById(customizeId)) {
      notify("This customizer is currently not available.", "error");
      return;
    }
    const card = customizeOptions.find((entry) => entry.id === customizeId);
    // A reorder card re-opens the customizer with its exact saved name -
    // that name is kept as-is instead of triggering the auto-numbering.
    const isReorder =
      customizerPrefill && customizerPrefill.customizeId === customizeId;
    const result = addToCart({
      kind: "customize",
      productId: customizeId,
      // Auto-numbered names ("Customized Cheesecake 1") continue from the
      // highest number already used in the cart or order history; names the
      // customer typed are kept as-is.
      name: isReorder
        ? payload.name || card?.name || "Custom order"
        : resolveCustomizedName(customizeId, payload.name),
      image: card?.image,
      price: payload.price || 0,
      quantity: 1,
      summary: payload.summary || [],
      config: payload,
    });
    if (!result.ok) {
      notify(result.error || "This customizer is currently unavailable.", "error");
      return;
    }
    notify("Your custom build was added to cart.");
    setCustomizerPrefill(null);
    closeCustomizer();
  };

  // Rebuild a product modal's selection object from a saved order summary so
  // the customer's previous choices show up pre-selected on the reorder card.
  const buildProductPrefill = (item, summary) => {
    const options = getItemOptions(item);
    const result = {};
    (summary || []).forEach((entry) => {
      const group = options.find((g) => g.label === entry.group);
      if (!group) return;
      const choice = group.choices.find(
        (c) => c.label === entry.choice || c.id === entry.choice,
      );
      if (!choice) return;
      if (group.type === "multi") {
        result[group.id] = [...(result[group.id] || []), choice.id];
      } else {
        result[group.id] = choice.id;
      }
    });
    return result;
  };

  // "You Might Like" product reorder card -> same product modal as the menu,
  // with the customer's previous options already selected.
  const openReorderProduct = (card) => {
    if (!customer) {
      setModal("login");
      return;
    }
    if (!isAvailableById(card.productId)) {
      notify("This item is currently not available.", "error");
      return;
    }
    const item = allProducts.find((entry) => entry.id === card.productId);
    if (!item) return;
    setSelectedPrefill(buildProductPrefill(item, card.summary));
    setSelectedItem(item);
  };

  // "You Might Like" custom reorder card -> the same 3D customizer, with the
  // saved build (options + name) already filled in.
  const openCustomizerFromReorder = (card) => {
    if (!customer) {
      setModal("login");
      return;
    }
    if (!isAvailableById(card.productId)) {
      notify("This customizer is currently not available.", "error");
      return;
    }
    setCustomizerPrefill({
      customizeId: card.productId,
      name: card.name,
      summary: card.summary || [],
    });
    if (card.productId === "custom-frappe") setShowFrappe(true);
    else if (card.productId === "custom-tea") setShowTea(true);
    else if (card.productId === "custom-sandwich") setShowSandwich(true);
    else if (card.productId === "custom-burger") setShowBurger(true);
    else if (card.productId === "custom-cheesecake") setShowCheesecake(true);
    else if (card.productId === "custom-icecream") setShowIceCream(true);
  };

  // Shared close helpers clear their prefill so the next open starts fresh.
  const closeProductModal = () => {
    setSelectedItem(null);
    setSelectedPrefill(null);
  };
  const closeCustomizer = (setter) => {
    setter(false);
    setCustomizerPrefill(null);
  };
  // Reorder prefill props for one customizer id - empty for a normal open.
  const customizerPrefillFor = (customizeId) =>
    customizerPrefill && customizerPrefill.customizeId === customizeId
      ? {
          initialName: customizerPrefill.name,
          initialSummary: customizerPrefill.summary,
        }
      : {};

  return (
    <>
      <Header />
      <main className="guest-menu-page">
        <section className="guest-menu-hero">
          <p className="guest-menu-crumb">Home / Menu</p>
          <h1>CAF&#201;TCHA MENU</h1>
          <p>
            Browse, customize, and add your favorites to cart - freshly made,
            your way.
          </p>
          <label className="menu-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search drinks, appetizers..."
              aria-label="Search menu"
            />
          </label>
        </section>
        <section className="guest-menu-layout">
          <aside className="menu-sidebar" aria-label="Menu filters">
            <div className="sort-box">
              <p className="sidebar-label">
                <SlidersHorizontal size={14} /> Sort by
              </p>
              {[
                "All Items",
                "Popularity",
                "Price: Low to High",
                "Price: High to Low",
              ].map((option) => (
                <button
                  key={option}
                  className={sort === option ? "selected" : ""}
                  onClick={() => handleSort(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="category-box">
              <p className="sidebar-label">Categories</p>
              {CATEGORIES.map((item) => (
                <div className="category-group" key={item}>
                  <button
                    className={category === item ? "selected" : ""}
                    onClick={() => selectCategory(item)}
                  >
                    {item}
                  </button>
                  {expandedCategory === item && SUBMENUS[item] && (
                    <div className="category-children">
                      {SUBMENUS[item].map((child) => (
                        <button
                          key={child}
                          onClick={() => jumpToSubmenu(item, child)}
                        >
                          {child}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="guest-cart">
              <p className="sidebar-label">
                <ShoppingCart size={14} /> Cart ({cartCount})
              </p>
              {cart.length > 0 ? (
                <ul className="sidebar-cart-list">
                  {cart.map((line) => (
                    <li key={line.uid}>
                      <span className="sidebar-cart-thumb">
                        <img src={line.image} alt={line.name} />
                      </span>
                      <span className="sidebar-cart-name" title={line.name}>
                        {line.name}
                      </span>
                      <span className="sidebar-cart-qty">
                        &#215;{line.quantity}
                      </span>
                      <span className="sidebar-cart-price">
                        &#8369;{(line.price * line.quantity).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-cart">
                  {customer
                    ? "Your cart is empty."
                    : "Log in to build your cart."}
                </p>
              )}
              <div className="cart-total">
                <span>Total</span>
                <strong>&#8369;{cartTotal.toFixed(2)}</strong>
              </div>
              <button
                onClick={() =>
                  customer
                    ? (window.location.href = "/cart")
                    : setModal("login")
                }
              >
                View cart
              </button>
            </div>
          </aside>
          <div className="menu-content-area">
            {sections.map((section, index) =>
              section.kind === "heading" ? (
                <section
                  id={slug(section.anchor)}
                  className="product-section category-title-section"
                  key={`${section.anchor}-${index}`}
                >
                  <div className="section-heading">
                    <h2>{section.title}</h2>
                  </div>
                </section>
              ) : section.kind === "youmightlike" ? (
                // Personalized reorder + suggestion cards for returning
                // customers - shown only on the "All Items" view.
                <section
                  id={slug(section.anchor)}
                  className="product-section youmightlike-section"
                  key={`${section.anchor}-${index}`}
                >
                  <div className="section-heading">
                    <h2>You Might Like</h2>
                    <span>
                      {section.reorders.length + section.suggestions.length}{" "}
                      suggestions
                    </span>
                  </div>
                  <div className="product-grid">
                    {section.reorders.map((card) =>
                      // Custom reorders use the same customize card UI, with a
                      // "Customize +" button that re-opens their saved build.
                      card.kind === "customize" ? (
                        <article
                          className={`product-card customize-card youmightlike-card reorder-card${!isAvailableById(card.productId) ? " menu-item-unavailable" : ""}`}
                          key={card.id}
                        >
                          <span className="yml-badge reorder">Reorder</span>
                          <button
                            type="button"
                            className="yml-delete"
                            aria-label="Remove reorder card"
                            onClick={() => setDeleteCard(card)}
                          >
                            <Trash2 size={14} />
                          </button>
                          <img src={card.image} alt={card.name} />
                          <div>
                            {!isAvailableById(card.productId) && (
                              <UnavailableBadge />
                            )}
                            <h3>{card.name}</h3>
                            <p>
                              {customizeOptions.find(
                                (entry) => entry.id === card.productId,
                              )?.description || "Your saved custom build."}
                            </p>
                            <button
                              className="customize-button"
                              disabled={!isAvailableById(card.productId)}
                               onClick={() => openCustomizerFromReorder(card)}
                            >
                              Customize <Plus size={16} />
                            </button>
                          </div>
                        </article>
                      ) : (
                        // Product reorders look exactly like the normal menu
                        // card - only the "Reorder" label differs. The + opens
                        // the same product modal with their options saved.
                        <article
                          className={`product-card youmightlike-card reorder-card ${youMightLikeVariant(
                            card.productId,
                          )}${
                            loyaltyRedeemable && isAvailableById(card.productId) && isCoffeeProduct(card.productId) && !isPromoItem(card.productId)
                              ? " has-loyalty-stamp"
                              : ""
                          }${!isAvailableById(card.productId) ? " menu-item-unavailable" : ""}`}
                          key={card.id}
                        >
                          <span className="yml-badge reorder">Reorder</span>
                          <button
                            type="button"
                            className="yml-delete"
                            aria-label="Remove reorder card"
                            onClick={() => setDeleteCard(card)}
                          >
                            <Trash2 size={14} />
                          </button>
                          {loyaltyRedeemable &&
                            isAvailableById(card.productId) &&
                            isCoffeeProduct(card.productId) &&
                            !isPromoItem(card.productId) && <LoyaltyStamp />}
                          {!isAvailableById(card.productId) && <UnavailableBadge />}
                          <img src={card.image} alt={card.name} />
                          <div>
                            <h3>{card.name}</h3>
                            <p>
                              {allProducts.find(
                                (entry) => entry.id === card.productId,
                              )?.description || card.name}
                            </p>
                            <div className="price-row">
                              <strong>&#8369;{card.price}</strong>
                            </div>
                            <button
                              type="button"
                              className="add-button"
                              disabled={!isAvailableById(card.productId)}
                               onClick={() => openReorderProduct(card)}
                              aria-label={`Add ${card.name}`}
                            >
                              <Plus size={17} />
                            </button>
                          </div>
                        </article>
                      ),
                    )}
                    {section.suggestions.map((item) => (
                      <article
                        className={`product-card youmightlike-card suggested-card ${youMightLikeVariant(item.id)}${!isAvailable(item) ? " menu-item-unavailable" : ""}`}
                        key={item.id}
                      >
                        <span className="yml-badge suggested">
                          Suggested for you
                        </span>
                        {loyaltyRedeemable &&
                          isAvailable(item) &&
                          item.category === "Coffee" &&
                          !isPromoItem(item.id) && <LoyaltyStamp />}
                        {!isAvailable(item) && <UnavailableBadge />}
                        <img src={item.image} alt={item.name} />
                        <div>
                          <h3>{item.name}</h3>
                          <p>{item.description}</p>
                          <div className="price-row">
                            <strong>&#8369;{item.price}</strong>
                          </div>
                          <button
                            type="button"
                            className="add-button"
                             disabled={!isAvailable(item)}
                            onClick={() => {
                              setSelectedPrefill(null);
                              setSelectedItem(item);
                            }}
                            aria-label={`Add ${item.name}`}
                          >
                            <Plus size={17} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ) : (
                section.items.length > 0 && (
                  <section
                    id={slug(section.anchor)}
                    className={`product-section ${section.title === "Promos" ? "promos-section" : section.title === "New Arrival" ? "arrival-section" : ""}`}
                    key={`${section.anchor}-${index}`}
                  >
                    <div className="section-heading">
                      <h2>{section.title}</h2>
                      <span>
                        {section.kind === "products"
                          ? `${section.items.length} items`
                          : "Make it yours"}
                      </span>
                    </div>
                    <div className="product-grid">
                      {section.items.map((item) =>
                        section.kind === "customize" ? (
                          <article
                            className={`product-card customize-card${!isAvailable(item) ? " menu-item-unavailable" : ""}`}
                            key={item.id}
                          >
                            <img src={item.image} alt="" />
                            <div>
                               {!isAvailable(item) && <UnavailableBadge />}
                              <h3>{item.name}</h3>
                              <p>{item.description}</p>
                              <button
                                className="customize-button"
                                 disabled={!isAvailable(item)}
                                onClick={() =>
                                  item.id === "custom-frappe"
                                    ? setShowFrappe(true)
                                    : item.id === "custom-tea"
                                      ? setShowTea(true)
                                      : item.id === "custom-sandwich"
                                        ? setShowSandwich(true)
                                        : item.id === "custom-burger"
                                          ? setShowBurger(true)
                                          : item.id === "custom-cheesecake"
                                            ? setShowCheesecake(true)
                                            : item.id === "custom-icecream"
                                              ? setShowIceCream(true)
                                              : setModal("customize")
                                }
                              >
                                Customize <Plus size={16} />
                              </button>
                            </div>
                          </article>
                        ) : (
                          <article
                            className={`product-card ${newArrivalIds.has(item.id) ? "arrival-card" : ""}${!isAvailable(item) ? " menu-item-unavailable" : ""}`}
                            key={item.id}
                          >
                            {/* Static per-promo timer label - decorative
                               only. Nothing counts down and the card is
                               never removed automatically. */}
                            {section.title === "Promos" ? null : loyaltyRedeemable &&
                              isAvailable(item) &&
                              item.category === "Coffee" && <LoyaltyStamp />}
                            {section.title === "Promos" && (
                              <span className="promo-timer">
                                <Timer size={11} strokeWidth={2.4} />
                                Promo ends in {item.endsInDays} days
                              </span>
                            )}
                             {!isAvailable(item) && <UnavailableBadge />}
                            <img src={item.image} alt={item.name} />
                            <div>
                              <h3>{item.name}</h3>
                              <p>{item.description}</p>
                              <div className="price-row">
                                <strong>&#8369;{item.price}</strong>
                                {item.saveLabel && (
                                  <span className="price-save">
                                    {item.saveLabel}
                                  </span>
                                )}
                                {item.originalPrice && (
                                  <s className="price-original">
                                    &#8369;{item.originalPrice}
                                  </s>
                                )}
                              </div>
                              <button
                                 disabled={!isAvailable(item)}
                                className="add-button"
                                onClick={() => {
                                  if (!isAvailable(item)) return;
                                  /* Every product card - promos included -
                                     opens the full product modal. Guests are
                                     still asked to log in when they press
                                     Add to Cart inside the modal. Prefill is
                                     reset so normal opens never inherit a
                                     reorder's saved options. */
                                  setSelectedPrefill(null);
                                  setSelectedItem(item);
                                }}
                                aria-label={`Add ${item.name}`}
                              >
                                <Plus size={17} />
                              </button>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </section>
                )
              ),
            )}
            {!sections.some(
              (section) => (section.items || []).length > 0,
            ) && (
              <p className="no-results">No menu items matched your search.</p>
            )}
          </div>
        </section>
      </main>
      <Footer />
      {showFrappe && (
        <Suspense
          fallback={
            <div className="frappe-loading">
              <div className="frappe-loading-card">Loading 3D customizer...</div>
            </div>
          }
        >
          <CustomizeFrappeModal
            /* closeCustomizer also clears any reorder prefill so the next
               open starts from the wizard's defaults. */
            onClose={() => closeCustomizer(setShowFrappe)}
            /* Guests get the AuthModal on top while this customizer keeps
               its state; logged-in customers add the build straight to
               their cart. */
            onRequireLogin={(payload) =>
              handleCustomizeAdd(payload, "custom-frappe", () =>
                setShowFrappe(false),
              )
            }
            /* Prefills the saved build when opened from a "You Might Like"
               reorder card - empty for a normal open. */
            {...customizerPrefillFor("custom-frappe")}
            escapeLocked={modal === "login" || authOpen}
          />
        </Suspense>
      )}
      {showTea && (
        <Suspense
          fallback={
            <div className="frappe-loading">
              <div className="frappe-loading-card">Loading 3D customizer...</div>
            </div>
          }
        >
          <CustomizeTeaModal
            /* closeCustomizer also clears any reorder prefill so the next
               open starts from the wizard's defaults. */
            onClose={() => closeCustomizer(setShowTea)}
            /* Guests get the AuthModal on top while this customizer keeps
               its state; logged-in customers add the build straight to
               their cart. */
            onRequireLogin={(payload) =>
              handleCustomizeAdd(payload, "custom-tea", () => setShowTea(false))
            }
            /* Prefills the saved build when opened from a "You Might Like"
               reorder card - empty for a normal open. */
            {...customizerPrefillFor("custom-tea")}
            escapeLocked={modal === "login" || authOpen}
          />
        </Suspense>
      )}
      {showSandwich && (
        <Suspense
          fallback={
            <div className="frappe-loading">
              <div className="frappe-loading-card">Loading 3D customizer...</div>
            </div>
          }
        >
          <CustomizeSandwichModal
            /* closeCustomizer also clears any reorder prefill so the next
               open starts from the wizard's defaults. */
            onClose={() => closeCustomizer(setShowSandwich)}
            /* Guests get the AuthModal on top while this customizer keeps
               its state; logged-in customers add the build straight to
               their cart. */
            onRequireLogin={(payload) =>
              handleCustomizeAdd(payload, "custom-sandwich", () =>
                setShowSandwich(false),
              )
            }
            /* Prefills the saved build when opened from a "You Might Like"
               reorder card - empty for a normal open. */
            {...customizerPrefillFor("custom-sandwich")}
            escapeLocked={modal === "login" || authOpen}
          />
        </Suspense>
      )}
      {showBurger && (
        <Suspense
          fallback={
            <div className="frappe-loading">
              <div className="frappe-loading-card">Loading 3D customizer...</div>
            </div>
          }
        >
          <CustomizeBurgerModal
            /* closeCustomizer also clears any reorder prefill so the next
               open starts from the wizard's defaults. */
            onClose={() => closeCustomizer(setShowBurger)}
            /* Guests get the AuthModal on top while this customizer keeps
               its state; logged-in customers add the build straight to
               their cart. */
            onRequireLogin={(payload) =>
              handleCustomizeAdd(payload, "custom-burger", () =>
                setShowBurger(false),
              )
            }
            /* Prefills the saved build when opened from a "You Might Like"
               reorder card - empty for a normal open. */
            {...customizerPrefillFor("custom-burger")}
            escapeLocked={modal === "login" || authOpen}
          />
        </Suspense>
      )}
      {showCheesecake && (
        <Suspense
          fallback={
            <div className="frappe-loading">
              <div className="frappe-loading-card">Loading 3D customizer...</div>
            </div>
          }
        >
          <CustomizeCheesecakeModal
            /* closeCustomizer also clears any reorder prefill so the next
               open starts from the wizard's defaults. */
            onClose={() => closeCustomizer(setShowCheesecake)}
            /* Guests get the AuthModal on top while this customizer keeps
               its state; logged-in customers add the build straight to
               their cart. */
            onRequireLogin={(payload) =>
              handleCustomizeAdd(payload, "custom-cheesecake", () =>
                setShowCheesecake(false),
              )
            }
            /* Prefills the saved build when opened from a "You Might Like"
               reorder card - empty for a normal open. */
            {...customizerPrefillFor("custom-cheesecake")}
            escapeLocked={modal === "login" || authOpen}
          />
        </Suspense>
      )}
      {showIceCream && (
        <Suspense
          fallback={
            <div className="frappe-loading">
              <div className="frappe-loading-card">Loading 3D customizer...</div>
            </div>
          }
        >
          <CustomizeIceCreamModal
            /* closeCustomizer also clears any reorder prefill so the next
               open starts from the wizard's defaults. */
            onClose={() => closeCustomizer(setShowIceCream)}
            /* Guests get the AuthModal on top while this customizer keeps
               its state; logged-in customers add the build straight to
               their cart. */
            onRequireLogin={(payload) =>
              handleCustomizeAdd(payload, "custom-icecream", () =>
                setShowIceCream(false),
              )
            }
            /* Prefills the saved build when opened from a "You Might Like"
               reorder card - empty for a normal open. */
            {...customizerPrefillFor("custom-icecream")}
            escapeLocked={modal === "login" || authOpen}
          />
        </Suspense>
      )}
      {selectedItem && (
        <ProductModal
          key={selectedItem.id}
          item={selectedItem}
          initialSelections={selectedPrefill}
          onClose={closeProductModal}
          onAddToCart={handleProductAdd}
          onShowReviews={() => {
            setReviewsItem(selectedItem);
          }}
          redeemable={loyaltyRedeemable && selectedItem.category === "Coffee"}
          onRedeemFree={(payload) => {
            setSelectedItem(null);
            setSelectedPrefill(null);
            setRedeemItem(payload);
          }}
        />
      )}
      {redeemItem && (
        <CheckoutModal
          redeemItem={redeemItem}
          onClose={() => setRedeemItem(null)}
        />
      )}
      {reviewsItem && (
        <ProductReviewsModal
          product={reviewsItem}
          onClose={() => setReviewsItem(null)}
        />
      )}
      {/* "You Might Like" - confirm before removing a reorder card */}
      {deleteCard && (
        <div
          className="guest-modal-backdrop"
          role="presentation"
          onClick={() => setDeleteCard(null)}
        >
          <section
            className="guest-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setDeleteCard(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2>Remove this reorder?</h2>
            <p>
              <strong>"{deleteCard.name}"</strong> will no longer appear in
              You Might Like. Your order history stays untouched.
            </p>
            <div className="yml-confirm-actions">
              <button
                type="button"
                className="modal-action yml-cancel"
                onClick={() => setDeleteCard(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-action yml-remove"
                onClick={() => {
                  deleteReorderCard(deleteCard.id);
                  notify("Reorder card removed.", "info");
                  setDeleteCard(null);
                }}
              >
                Remove
              </button>
            </div>
          </section>
        </div>
      )}
      {modal === "login" && (
        <LoginModal
          onClose={() => setModal(null)}
          onLogin={() => {
            setModal(null);
            setAuthOpen(true);
          }}
        />
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {modal && modal !== "login" && (
        <div
          className="guest-modal-backdrop"
          role="presentation"
          onClick={() => setModal(null)}
        >
          <section
            className="guest-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setModal(null)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2 id="modal-title">
              {modal === "login" ? "Login required" : "Customize your order"}
            </h2>
            <p>
              {modal === "login"
                ? "Please log in or create an account to add items and view your cart."
                : "Customization options will be added here soon."}
            </p>
            <button className="modal-action" onClick={() => setModal(null)}>
              {modal === "login" ? "Login / Sign Up" : "Got it"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
export default MenuPage;
