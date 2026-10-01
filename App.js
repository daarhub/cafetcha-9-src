import Header from "./HomepageGuest/Header";
import Hero from "./HomepageGuest/Hero";
import Highlights from "./HomepageGuest/Highlights";
import Menu from "./MenuGuest/Menu";
import AboutReviews from "./HomepageGuest/AboutReviews";
import MenuPage from "./MenuGuest/MenuPage";
import CartPage from "./Customer/CartPage";
import ProfilePage from "./Customer/ProfilePage";
import OurStoryPage from "./AboutUs/OurStoryPage";
import HelpPage from "./AboutUs/HelpPage";
import FAQPage from "./AboutUs/FAQPage";
import DeliveryPage from "./AboutUs/DeliveryPage";
import LoyaltyPage from "./AboutUs/LoyaltyPage";
import PrivacyPage from "./AboutUs/PrivacyPage";
import TermsPage from "./AboutUs/TermsPage";
import ContactPage from "./AboutUs/ContactPage";
import AdminDashboard from "./Admin/AdminDashboard";
import AdminMenuManagement from "./Admin/AdminMenuManagement";
import AdminAnalytics from "./Admin/AdminAnalyticsReport";
import AdminStaffManagement from "./Admin/AdminStaffManagement";
import AdminCustomerManagement from "./Admin/AdminCustomerManagement";
import AdminMessages from "./Admin/AdminMessages";
import AdminReviews from "./Admin/AdminReviews";
import AdminSettings from "./Admin/AdminSettings";
import StaffDashboard from "./Staff/StaffDashboard";
import StaffOrders from "./Staff/StaffOrders";
import StaffOrderHistory from "./Staff/StaffOrderHistory";
import StaffMenuItems from "./Staff/StaffMenuItems";
import StaffCustomerManagement from "./Staff/StaffCustomerManagement";
import { useEffect } from "react";

// When someone lands on the homepage with a #section hash (e.g. the footer
// Quick Links from any other page), scroll straight to that section — not
// just the hero. The components mount after the page renders, so the scroll
// is deferred briefly until the layout is ready.
function HomeHashScroll() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return undefined;
    const target = document.getElementById(hash.slice(1));
    if (target) {
      const timer = setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);
  return null;
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/menu") return <MenuPage />;
  if (path === "/cart") return <CartPage />;
  if (path === "/profile") return <ProfilePage />;
  if (path === "/our-story") return <OurStoryPage />;
  if (path === "/help") return <HelpPage />;
  if (path === "/faq") return <FAQPage />;
  if (path === "/delivery") return <DeliveryPage />;
  if (path === "/loyalty") return <LoyaltyPage />;
  if (path === "/contact") return <ContactPage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;
  if (path === "/admin") return <AdminDashboard />;
  if (path === "/admin/menu-management") return <AdminMenuManagement />;
  if (path === "/admin/analytics") return <AdminAnalytics />;
  if (path === "/admin/staff") return <AdminStaffManagement />;
  if (path === "/admin/customers") return <AdminCustomerManagement />;
  if (path === "/admin/messages") return <AdminMessages />;
  if (path === "/admin/reviews") return <AdminReviews />;
  if (path === "/admin/settings") return <AdminSettings />;
  if (path === "/staff") return <StaffDashboard />;
  if (path === "/staff/orders") return <StaffOrders />;
  if (path === "/staff/history") return <StaffOrderHistory />;
  if (path === "/staff/menu-items") return <StaffMenuItems />;
  if (path === "/staff/customers") return <StaffCustomerManagement />;

  return (
    <>
      <Header />
      <HomeHashScroll />

      <main>
        <Hero />
        <Highlights />
        <Menu />
        <AboutReviews />
      </main>
    </>
  );
}

export default App;
