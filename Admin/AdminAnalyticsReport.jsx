import {
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  PackageCheck,
  ShoppingBag,
  Star,
  TrendingUp,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import { getAllCustomers, getAllStaffOrders } from "../Customer/customerStore";
import {
  getAllManagedMenuItems,
  useMenuAvailability,
} from "../MenuGuest/menuAvailabilityStore";
import { notify } from "../Customer/toastStore";
import { useReviews } from "./Reviews/ReviewsStore";
import "./AdminAnalyticsReport.css";

const DAY = 86400000;
const PESO = "\u20B1";
const CATEGORIES = ["Coffee", "Non-Coffee", "Food", "Desserts"];
const PERIODS = [
  { value: "7d", label: "This week", days: 7 },
  { value: "30d", label: "Last 1 month", days: 30 },
  { value: "60d", label: "Last 2 months", days: 60 },
  { value: "90d", label: "Last 3 months", days: 90 },
  { value: "180d", label: "Last 6 months", days: 180 },
  { value: "365d", label: "Last 1 year", days: 365 },
  { value: "730d", label: "Last 2 years", days: 730 },
  { value: "1095d", label: "Last 3 years", days: 1095 },
  { value: "all", label: "All time", days: null },
];
const money = (amount) =>
  `${PESO}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const monthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};
const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const download = (name, content, type) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
const inRange = (value, start, end) => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= start.getTime() && time < end.getTime();
};
const isRewardOrder = (order) =>
  order.kind === "redemption" ||
  order.staffSource === "redemption" ||
  order.paymentMethod === "Loyalty Reward";

const completedAt = (order) => order.completedAt || order.createdAt;
function buildRatingReport(reviews, menuItems, start, end) {
  const menuById = new Map(menuItems.map((item) => [item.id, item]));
  const grouped = new Map();
  reviews
    .filter(
      (review) =>
        review.targetKind === "product" &&
        inRange(review.createdAt, start, end),
    )
    .forEach((review) => {
      const id = review.productId;
      if (!id) return;
      const entry = grouped.get(id) || {
        id,
        name: menuById.get(id)?.name || "Deleted product",
        total: 0,
        count: 0,
      };
      entry.total += Number(review.rating) || 0;
      entry.count += 1;
      grouped.set(id, entry);
    });
  const rated = [...grouped.values()]
    .filter((entry) => entry.count > 0)
    .map((entry) => ({ ...entry, average: entry.total / entry.count }))
    .sort((a, b) => b.average - a.average || b.count - a.count);
  return {
    mostRated: rated.slice(0, 10),
    lowestRated: [...rated]
      .sort((a, b) => a.average - b.average || b.count - a.count)
      .slice(0, 10),
  };
}

function buildReport(orders, customers, menuItems, start, end) {
  const completed = orders.filter(
    (order) => order.status === "Completed" && inRange(completedAt(order), start, end),
  );
  const menuById = new Map(menuItems.map((item) => [item.id, item]));
  const products = new Map(
    menuItems.map((item) => [
      item.id,
      { id: item.id, name: item.name, category: item.category, quantity: 0, revenue: 0 },
    ]),
  );
  const categories = new Map(
    CATEGORIES.map((category) => [category, { quantity: 0, revenue: 0 }]),
  );
  const payments = new Map();

  completed.forEach((order) => {
    const reward = isRewardOrder(order);
    const payment = order.paymentMethod || "Unspecified";
    const paymentEntry = payments.get(payment) || { count: 0, revenue: 0 };
    paymentEntry.count += 1;
    paymentEntry.revenue += Number(order.total || 0);
    payments.set(payment, paymentEntry);

    (order.items || []).forEach((item) => {
      const key = item.productId || item.name;
      const catalogItem = menuById.get(item.productId);
      const name = item.name || catalogItem?.name || "Unnamed item";
      const quantity = Math.max(0, Number(item.quantity || 1));
      const revenue = reward ? 0 : quantity * Number(item.price || 0);
      const product = products.get(key) || {
        id: key,
        name,
        category: catalogItem?.category || item.category || "Other",
        quantity: 0,
        revenue: 0,
      };
      product.quantity += quantity;
      product.revenue += revenue;
      products.set(key, product);

      const category = CATEGORIES.includes(product.category) ? product.category : "Other";
      const categoryEntry = categories.get(category);
      if (categoryEntry) {
        categoryEntry.quantity += quantity;
        categoryEntry.revenue += revenue;
      }
    });
  });

  const productList = [...products.values()].sort(
    (a, b) => b.quantity - a.quantity || b.revenue - a.revenue,
  );
  return {
    completed,
    products,
    bestSellers: productList.filter((item) => item.quantity > 0).slice(0, 10),
    leastOrdered: [...productList]
      .sort((a, b) => a.quantity - b.quantity || a.revenue - b.revenue)
      .slice(0, 10),
    categories,
    payments: [...payments.entries()]
      .map(([method, values]) => ({ method, ...values }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue),
    revenue: completed.reduce((sum, order) => sum + Number(order.total || 0), 0),
    orderCount: completed.length,
    newCustomers: customers.filter((customer) => inRange(customer.createdAt, start, end)).length,
    totalCustomers: customers.length,
  };
}

function AdminAnalyticsReport() {
  useMenuAvailability();
  const reviews = useReviews();
  const [period, setPeriod] = useState("7d");
  const [monthA, setMonthA] = useState(monthKey(new Date()));
  const [monthB, setMonthB] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 2);
    return monthKey(date);
  });
  const now = useMemo(() => new Date(), []);
  const end = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    [now],
  );
  const selected = PERIODS.find((entry) => entry.value === period) || PERIODS[0];
  const orders = getAllStaffOrders();
  const customers = getAllCustomers();
  const menuItems = getAllManagedMenuItems();
  const earliest = useMemo(() => {
    const dates = [
      ...orders.map((order) => new Date(completedAt(order)).getTime()),
      ...customers.map((customer) => new Date(customer.createdAt).getTime()),
    ].filter(Number.isFinite);
    return dates.length ? new Date(Math.min(...dates)) : new Date(end - 365 * DAY);
  }, [customers, end, orders]);
  const start = useMemo(
    () => (selected.days ? new Date(end - selected.days * DAY) : earliest),
    [earliest, end, selected.days],
  );
  const report = useMemo(
    () => buildReport(orders, customers, menuItems, start, end),
    [customers, end, menuItems, orders, start],
  );
  const ratingReport = useMemo(
    () => buildRatingReport(reviews, menuItems, start, end),
    [end, menuItems, reviews, start],
  );
  const weekStart = useMemo(() => new Date(end - 7 * DAY), [end]);
  const weekly = useMemo(() => {
    const completed = orders.filter(
      (order) => order.status === "Completed" && inRange(completedAt(order), weekStart, end),
    );
    return Array.from({ length: 7 }, (_, index) => {
      const dayStart = new Date(weekStart.getTime() + index * DAY);
      const dayEnd = new Date(dayStart.getTime() + DAY);
      return {
        label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
        value: completed
          .filter((order) => inRange(completedAt(order), dayStart, dayEnd))
          .reduce((sum, order) => sum + Number(order.total || 0), 0),
      };
    });
  }, [end, orders, weekStart]);
  const weekRevenue = weekly.reduce((sum, entry) => sum + entry.value, 0);
  const weekOrders = orders.filter(
    (order) => order.status === "Completed" && inRange(completedAt(order), weekStart, end),
  ).length;
  const maxWeek = Math.max(...weekly.map((entry) => entry.value), 1);
  const monthOptions = useMemo(() => {
    const options = [];
    for (let offset = -35; offset <= 2; offset += 1) {
      options.push(monthKey(new Date(now.getFullYear(), now.getMonth() + offset, 1)));
    }
    return options;
  }, [now]);
  const reportForMonth = (key) => {
    const [year, month] = key.split("-").map(Number);
    return buildReport(
      orders,
      customers,
      menuItems,
      new Date(year, month - 1, 1),
      new Date(year, month, 1),
    );
  };
  const firstMonth = reportForMonth(monthA);
  const secondMonth = reportForMonth(monthB);
  const changeLabel = (current, previous) => {
    if (!previous) return current ? "+100.0%" : "0.0%";
    return `${current >= previous ? "+" : ""}${(((current - previous) / previous) * 100).toFixed(1)}%`;
  };

  const exportCsv = () => {
    const rows = [
      ["Cafétcha Analytics Report"],
      ["Period", selected.label],
      ["Completed sales", report.revenue],
      ["Completed orders", report.orderCount],
      [],
      ["Product Performance", "Quantity sold", "Revenue"],
      ...[...report.products.values()].map((item) => [item.name, item.quantity, item.revenue]),
      [],
      ["Product Ratings", "Average rating", "Reviews"],
      ...ratingReport.mostRated.map((item) => [item.name, item.average.toFixed(2), item.count]),
      [],
      ["Lowest-rated products", "Average rating", "Reviews"],
      ...ratingReport.lowestRated.map((item) => [item.name, item.average.toFixed(2), item.count]),
      [],
      ["Category Performance", "Quantity sold", "Revenue"],
      ...CATEGORIES.map((category) => {
        const item = report.categories.get(category);
        return [category, item?.quantity || 0, item?.revenue || 0];
      }),
      [],
      ["Customer Analytics"],
      ["Total customers", report.totalCustomers],
      ["New customers", report.newCustomers],
      [],
      ["Payment / Transactions used", "Completed transactions", "Revenue"],
      ...report.payments.map((item) => [item.method, item.count, item.revenue]),
    ];
    download(
      "cafetcha-analytics.csv",
      rows.map((row) => row.map(csvCell).join(",")).join("\n"),
      "text/csv;charset=utf-8",
    );
    notify("Analytics CSV exported.");
  };
  const exportPdf = () => {
    document.body.classList.add("admin-printing");
    notify("Opening the print dialog for PDF export.");
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => document.body.classList.remove("admin-printing"), 250);
    }, 120);
  };



  return (
    <>
      <AdminSidebar />
      <main className="admin-management-page admin-analytics-report-page">
        <header className="admin-management-header">
          <div>
            <span>ADMIN PANEL / ANALYTICS</span>
            <h1>Analytics</h1>
            <p>Real completed-order reporting for sales, products, customers, and payments.</p>
          </div>
          <div className="admin-analytics-header-actions">
            <button className="admin-secondary-button" type="button" onClick={exportPdf}>
              <FileText size={16} /> Export PDF
            </button>
            <button className="admin-secondary-button" type="button" onClick={exportCsv}>
              <FileSpreadsheet size={16} /> Export CSV
            </button>
          </div>
        </header>

        <section className="admin-analytics-toolbar admin-management-panel">
          <p>
            <CalendarDays size={15} /> Sales and product figures use completed orders only.
            Loyalty rewards count as quantity with zero cash revenue.
          </p>
          <label className="admin-period-select">
            Reporting period
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              {PERIODS.map((entry) => (
                <option key={entry.value} value={entry.value}>{entry.label}</option>
              ))}
            </select>
          </label>
        </section>


        <section className="admin-analytics-cards admin-analytics-summary-cards">
          <article><TrendingUp size={21} /><span>Completed sales this week</span><strong>{money(weekRevenue)}</strong><small>{weekOrders} completed orders</small></article>
          <article><BarChart3 size={21} /><span>Completed sales</span><strong>{money(report.revenue)}</strong><small>{selected.label}</small></article>
          <article><PackageCheck size={21} /><span>Completed orders</span><strong>{report.orderCount}</strong><small>{selected.label}</small></article>
          <article><UsersRound size={21} /><span>Total customers</span><strong>{report.totalCustomers}</strong><small>{report.newCustomers} new in period</small></article>
          <article><ShoppingBag size={21} /><span>Products tracked</span><strong>{menuItems.length}</strong><small>Current menu catalog</small></article>
        </section>

        <section className="admin-analytics-report-stack">
          <article className="admin-analytics-panel admin-week-sales-panel">
            <header>
              <div><h2>Completed sales this week</h2><span>Last 7 days · completed orders only</span></div>
              <strong>{money(weekRevenue)}</strong>
            </header>
            <div className="admin-week-chart">
              {weekly.map((entry) => (
                <div key={entry.label}>
                  <span style={{ height: `${Math.max(4, (entry.value / maxWeek) * 100)}%` }} title={money(entry.value)} />
                  <small>{entry.label}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="admin-analytics-panel">
            <header><div><h2>Product Performance</h2><span>Completed item quantities and item revenue</span></div></header>
            <div className="admin-product-performance-grid">
              <div>
                <h3>Best-selling items</h3>
                <div className="admin-performance-list">
                  {report.bestSellers.length ? report.bestSellers.map((item, index) => (
                    <div key={item.id}><b>{index + 1}</b><span>{item.name}</span><strong>{item.quantity} sold · {money(item.revenue)}</strong></div>
                  )) : <p>No completed item sales in this period.</p>}
                </div>
              </div>
              <div>
                <h3>Least-ordered items</h3>
                <div className="admin-performance-list">
                  {report.leastOrdered.length ? report.leastOrdered.map((item) => (
                    <div key={item.id}><span>{item.name}</span><strong>{item.quantity} sold · {money(item.revenue)}</strong></div>
                  )) : <p>No menu products to compare.</p>}
                </div>
              </div>
            </div>
          </article>

          <article className="admin-analytics-panel">
            <header><div><h2>Product Ratings</h2><span>Customer review averages for the selected reporting period</span></div></header>
            <div className="admin-product-performance-grid">
              <div>
                <h3>Most-rated products</h3>
                <div className="admin-performance-list">
                  {ratingReport.mostRated.length ? ratingReport.mostRated.map((item) => (
                    <div key={item.id}><span>{item.name}</span><strong><Star size={12} fill="currentColor" /> {item.average.toFixed(1)} · {item.count} review{item.count === 1 ? "" : "s"}</strong></div>
                  )) : <p>No product reviews in this period.</p>}
                </div>
              </div>
              <div>
                <h3>Lowest-rated products</h3>
                <div className="admin-performance-list">
                  {ratingReport.lowestRated.length ? ratingReport.lowestRated.map((item) => (
                    <div key={item.id}><span>{item.name}</span><strong><Star size={12} fill="currentColor" /> {item.average.toFixed(1)} · {item.count} review{item.count === 1 ? "" : "s"}</strong></div>
                  )) : <p>No product reviews in this period.</p>}
                </div>
              </div>
            </div>
          </article>

          <article className="admin-analytics-panel">
            <header><div><h2>Category Performance</h2><span>Revenue and quantity from completed items</span></div></header>
            <div className="admin-category-performance-grid">
              {CATEGORIES.map((category) => {
                const item = report.categories.get(category) || { quantity: 0, revenue: 0 };
                return <div key={category}><span>{category} sales</span><strong>{money(item.revenue)}</strong><small>{item.quantity} items sold</small></div>;
              })}
            </div>
          </article>

          <article className="admin-analytics-panel">
            <header><div><h2>Customer Analytics</h2><span>Registered accounts and completed-order activity</span></div></header>
            <div className="admin-customer-performance-grid">
              <div><UsersRound size={19} /><span>Total customers</span><strong>{report.totalCustomers}</strong></div>
              <div><UserPlus size={19} /><span>New customers</span><strong>{report.newCustomers}</strong></div>
            </div>
          </article>

          <article className="admin-analytics-panel">
            <header><div><h2>Payment / Transactions used</h2><span>Completed orders grouped by payment method</span></div></header>
            <div className="admin-payment-list">
              {report.payments.length ? report.payments.map((item) => (
                <div key={item.method}><span>{item.method}</span><strong>{item.count} transaction{item.count === 1 ? "" : "s"}</strong><b>{money(item.revenue)}</b></div>
              )) : <p>No completed transactions in this period.</p>}
            </div>
          </article>
        </section>

        <section className="admin-analytics-panel admin-month-comparison">
          <header><div><h2>Compare months</h2><span>For example, September vs November</span></div></header>
          <div className="admin-month-pickers">
            <label>Month A<select value={monthA} onChange={(event) => setMonthA(event.target.value)}>{monthOptions.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}</select></label>
            <label>Month B<select value={monthB} onChange={(event) => setMonthB(event.target.value)}>{monthOptions.map((key) => <option key={key} value={key}>{monthLabel(key)}</option>)}</select></label>
          </div>
          <div className="admin-month-results">
            {[{ label: monthLabel(monthA), report: firstMonth }, { label: monthLabel(monthB), report: secondMonth }].map((entry) => (
              <article key={entry.label}>
                <span>{entry.label}</span>
                <strong>{money(entry.report.revenue)}</strong>
                <small>{entry.report.orderCount} completed orders · {entry.report.newCustomers} new customers</small>
                <b>{changeLabel(entry.report.revenue, entry.report === firstMonth ? secondMonth.revenue : firstMonth.revenue)} vs other month</b>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

export default AdminAnalyticsReport;

