import {
  ArrowRight,
  Calendar,
  Minus,
  Package,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import AdminSidebar from "./AdminSidebar";
import {
  getAllManagedMenuItems,
  useMenuAvailability,
} from "../MenuGuest/menuAvailabilityStore";
import { getAllCustomers, getAllOrders } from "../Customer/customerStore";
import { useAdminManagement } from "./adminManagementStore";
import "./AdminDashboard.css";

// ---------------------------------------------------------------------------
// Live numbers
// ---------------------------------------------------------------------------
// Every figure below is computed from the real order records, so the cards
// always agree with the Analytics page: sales and orders count completed
// orders only, and the "vs yesterday" delta is signed.
const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const isSameDay = (iso, start) => {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time >= start && time < start + 86400000;
};

// Signed percentage change from yesterday to today.
// - yesterday had sales: the normal signed percentage.
// - yesterday had none but today does: growth from a zero baseline is an
//   increase, not a flat 0.00%, so it is reported as +100.00%.
// - neither day had activity: genuinely flat.
const changePercent = (today, yesterday) => {
  if (!yesterday) return today > 0 ? "+100.00%" : "0.00%";
  const change = ((today - yesterday) / yesterday) * 100;
  const sign = change > 0 ? "+" : change < 0 ? "-" : "";
  return `${sign}${Math.abs(change).toFixed(2)}%`;
};

const TRENDING_ICONS = { up: TrendingUp, down: TrendingDown, flat: Minus };

const peso = (amount) =>
  `₱${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// /admin — the admin dashboard. Layouted after the design reference: the
// welcome header with today's date, the stat cards, the recently added
// products preview on the left, and the Top Selling / Manage Staff previews
// in the column on the right.
function AdminDashboard() {
  useMenuAvailability();
  const staffMembers = useAdminManagement();
  const menuItems = getAllManagedMenuItems();
  const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));

  // "Recently Added" lists whatever the admin created in Menu Management first
  // (newest first), then the built-in new arrivals to fill the row.
  const createdTime = (item) => {
    if (item.createdAt) {
      const parsed = new Date(item.createdAt).getTime();
      if (Number.isFinite(parsed)) return parsed;
    }
    // Fallback for older records: the generated id carries a Date.now().
    const match = /(\d{10,})/.exec(item.id || "");
    return match ? Number(match[1]) : 0;
  };
  const adminAddedItems = menuItems
    .filter((item) => item.isAdminItem)
    .sort((a, b) => createdTime(b) - createdTime(a));
  const builtInNewArrivals = menuItems.filter(
    (item) => item.source === "New arrival",
  );
  const recentProducts = [...adminAddedItems, ...builtInNewArrivals].slice(0, 4);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Live sales/orders: completed orders only, split into today and yesterday so
  // the delta is real and correctly signed.
  const now = new Date();
  const todayStart = startOfDay(now);
  const yesterdayStart = todayStart - 86400000;
  const completed = getAllOrders().filter(
    (order) => order.status === "Completed",
  );
  const totalSales = (start) =>
    completed
      .filter((order) => isSameDay(order.createdAt, start))
      .reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const countOrders = (start) =>
    completed.filter((order) => isSameDay(order.createdAt, start)).length;

  const salesToday = totalSales(todayStart);
  const salesYesterday = totalSales(yesterdayStart);
  const ordersToday = countOrders(todayStart);
  const ordersYesterday = countOrders(yesterdayStart);

  const salesDelta = changePercent(salesToday, salesYesterday);
  const ordersDelta = changePercent(ordersToday, ordersYesterday);
  const trendOf = (delta) =>
    String(delta).startsWith("-")
      ? "down"
      : String(delta).startsWith("+")
        ? "up"
        : "flat";
  const SalesTrendIcon = TRENDING_ICONS[trendOf(salesDelta)];
  const OrdersTrendIcon = TRENDING_ICONS[trendOf(ordersDelta)];

  // Top Selling mirrors the Analytics "Best-selling items" ranking: quantity
  // sold first, revenue as the tiebreak, from completed orders only.
  const productTotals = new Map();
  completed.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = item.productId || item.name;
      if (!key) return;
      const quantity = Math.max(0, Number(item.quantity || 1));
      const current = productTotals.get(key) || { quantity: 0, revenue: 0 };
      productTotals.set(key, {
        quantity: current.quantity + quantity,
        revenue: current.revenue + quantity * Number(item.price || 0),
      });
    });
  });
  const topSellers = [...productTotals.entries()]
    .sort((a, b) => b[1].quantity - a[1].quantity || b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([key, totals]) => {
      const catalogItem = menuItemsById.get(key);
      return {
        key,
        quantity: totals.quantity,
        revenue: totals.revenue,
        name: catalogItem?.name || key,
        category: catalogItem?.category || "Menu item",
        image: catalogItem?.image,
      };
    });

  return (
    <>
      <AdminSidebar />

      <main className="admin-dashboard">
        {/* ========================= WELCOME HEADER ========================= */}
        <header className="admin-welcome">
          <div>
            <h1>WELCOME, ADMIN!</h1>
            <p>Here&apos;s what&apos;s happening at Cafétcha today.</p>
          </div>

          <span className="admin-date-pill">
            <Calendar size={15} />
            {today}
          </span>
        </header>

        <div className="admin-grid">
          {/* ==================== LEFT: STATS + RECENT ==================== */}
          <section className="admin-main-col">
            <div className="admin-stats">
              {/* Total sales today (live: completed orders only) */}
              <article className="admin-stat admin-stat-dark">
                <span className="admin-stat-icon">
                  <Store size={24} strokeWidth={1.9} />
                </span>
                <div className="admin-stat-body">
                  <span className="admin-stat-label">Total Sales</span>
                  <strong className="admin-stat-value">
                    {peso(salesToday)}
                  </strong>
                  <span className="admin-stat-delta">
                    <SalesTrendIcon size={12} /> {salesDelta}
                    <em>vs yesterday</em>
                  </span>
                </div>
              </article>

              {/* Total orders today (live: completed orders only) */}
              <article className="admin-stat">
                <span className="admin-stat-icon">
                  <ShoppingBag size={24} strokeWidth={1.9} />
                </span>
                <div className="admin-stat-body">
                  <span className="admin-stat-label">Total Orders</span>
                  <strong className="admin-stat-value">{ordersToday}</strong>
                  <span className="admin-stat-delta">
                    <OrdersTrendIcon size={12} /> {ordersDelta}
                    <em>vs yesterday</em>
                  </span>
                </div>
              </article>

              {/* Registered customer accounts (live count) */}
              <article className="admin-stat">
                <span className="admin-stat-icon">
                  <UsersRound size={24} strokeWidth={1.9} />
                </span>
                <div className="admin-stat-body">
                  <span className="admin-stat-label">Total Customers</span>
                  <strong className="admin-stat-value">
                    {getAllCustomers().length}
                  </strong>
                  <span className="admin-stat-sub">
                    Registered customer accounts
                  </span>
                </div>
              </article>

              {/* Regular menu products (live count) */}
              <article className="admin-stat">
                <span className="admin-stat-icon">
                  <Package size={24} strokeWidth={1.9} />
                </span>
                <div className="admin-stat-body">
                  <span className="admin-stat-label">Total Products</span>
                  <strong className="admin-stat-value">
                    {
                      menuItems.filter((item) => item.source === "Menu item")
                        .length
                    }
                  </strong>
                  <span className="admin-stat-sub">Regular menu products</span>
                </div>
              </article>

              {/* Total employees — live count of the staff accounts */}
              <article className="admin-stat">
                <span className="admin-stat-icon">
                  <UsersRound size={24} strokeWidth={1.9} />
                </span>
                <div className="admin-stat-body">
                  <span className="admin-stat-label">Total Employees</span>
                  <strong className="admin-stat-value">
                    {staffMembers.length}
                  </strong>
                  <span className="admin-stat-sub">Active staff accounts</span>
                </div>
              </article>
            </div>

            {/* Recently added products — includes anything created in Menu
                Management, newest first, then the built-in new arrivals. */}
            <section className="admin-card admin-recent">
              <header className="admin-card-head">
                <h2>Recently Added Products</h2>
                <a href="/admin/menu-management" className="admin-view-all">
                  View All <ArrowRight size={12} />
                </a>
              </header>

              <div className="admin-recent-grid">
                {recentProducts.map((item) => (
                  <article className="admin-recent-tile" key={item.id}>
                    <img src={item.image} alt={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {item.category} · {peso(item.price)}
                      </p>
                    </div>
                  </article>
                ))}
                {!recentProducts.length && (
                  <p className="admin-card-empty">
                    No products yet. Add one in Menu Management.
                  </p>
                )}
              </div>
            </section>
          </section>

          {/* ================ RIGHT: TOP SELLING + STAFF ================ */}
          <aside className="admin-side-col">
            <section className="admin-card admin-top-selling">
              <header className="admin-card-head">
                <h2>Top Selling Items</h2>
                <a href="/admin/analytics" className="admin-view-all">
                  View All <ArrowRight size={12} />
                </a>
              </header>

              <div className="admin-top-list">
                {topSellers.map((item, index) => (
                  <article className="admin-top-row" key={item.key}>
                    <span
                      className={`admin-rank${index === 0 ? " first" : ""}`}
                    >
                      {index + 1}
                    </span>
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <span className="admin-top-fallback" aria-hidden="true">
                        {item.name.charAt(0)}
                      </span>
                    )}
                    <div className="admin-top-info">
                      <h3>{item.name}</h3>
                      <p>
                        {item.quantity} sold · {item.category}
                      </p>
                    </div>
                  </article>
                ))}
                {!topSellers.length && (
                  <p className="admin-card-empty">
                    No completed orders yet. Top sellers appear here.
                  </p>
                )}
              </div>
            </section>

            <section className="admin-card admin-staff">
              <header className="admin-card-head">
                <h2>Manage Staff</h2>
                <a href="/admin/staff" className="admin-view-all">
                  View All <ArrowRight size={12} />
                </a>
              </header>

              {/* Every staff account is listed (5 by default, plus anyone added
                  in Staff Management). View All opens Staff Management. */}
              <div className="admin-staff-list">
                {staffMembers.map((member) => (
                  <article className="admin-staff-row" key={member.id}>
                    <img src={member.image} alt={member.name} />
                    <div className="admin-staff-info">
                      <p>{member.role}</p>
                      <h3>{member.name}</h3>
                    </div>
                    <span className="admin-staff-badge">{member.status}</span>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}

export default AdminDashboard;
