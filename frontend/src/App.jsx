import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/theme.css";

/* ====
   USER SIDE (IMPORTS)
   ==== */

import UserLayout from "./user/components/UserLayout";
import Auth from "./user/pages/Auth/Auth";
import Home from "./user/pages/HomePages/Home";
import About from "./user/pages/HomePages/About";
import FAQ from "./user/pages/HomePages/FAQ";
import Contact from "./user/pages/HomePages/Contact";
import HowItWorks from "./user/pages/HomePages/HowItWorks";
import Privacy from "./user/pages/HomePages/Privacy";
import Terms from "./user/pages/HomePages/Terms";
import ReMakerDiscover from "./user/pages/HomePages/ReMakerDiscover";
import UserBeforeMarketplace from "./user/pages/HomePages/UserBeforeMarketplace";
import UserDashboard from "./user/pages/UserDashboard";
import UserArtistProfile from "./user/pages/BuyProducts/UserArtistProfile";
import UserMarketplace from "./user/pages/BuyProducts/UserMarketplace";
import UserProductDetails from "./user/pages/BuyProducts/UserProductDetails";
import UserSellerProfile from "./user/pages/BuyProducts/UserSellerProfile";
import UserOrderDetails from "./user/pages/BuyingOrders/UserOrderDetails";
import UserOrders from "./user/pages/BuyingOrders/UserOrders";
import UserBadges from "./user/pages/UserProfile/UserBadges";
import UserHelp from "./user/pages/UserProfile/UserHelp";
import UserOrbitPoints from "./user/pages/UserProfile/UserOrbitPoints";
import UserProfile from "./user/pages/UserProfile/UserProfile";
import UserSettings from "./user/pages/UserProfile/UserSettings";
import UserWishlist from "./user/pages/UserWishlists/UserWishlist";
import UserCheckout from "./user/pages/UserCheckout";
import UserDonations from "./user/pages/UserDonations";
import UserFollowing from "./user/pages/UserFollowing";

/* ====
   REMAKER SIDE (IMPORTS)
   ==== */

/* Layout + public pages */
import ReMakerLayout from "./remaker/components/ReMakerLayout";
import ReMakerAuth from "./remaker/pages/Auth/ReMakerAuth";
import ReMakersHome from "./remaker/pages/HomePages/ReMakersHome";
import ReMakerAbout from "./remaker/pages/HomePages/About";
import ReMakerFAQ from "./remaker/pages/HomePages/FAQ";
import ReMakerHowItWorks from "./remaker/pages/HomePages/HowItWorks";
import ReMakerContact from "./remaker/pages/HomePages/Contact";
import ReMakerBeforeMarketplace from "./remaker/pages/HomePages/ReMakerBeforeMarketplace";

/* Dashboard + profile */
import ReMakerDashboard from "./remaker/pages/ReMakerDashboard";
import ReMakerProfile from "./remaker/pages/ReMakerProfile";

/* Marketplace (buying) */
import ReMakerMarketplace from "./remaker/pages/Marketplace/ReMakerMarketplace";
import ReMakerProductDetails from "./remaker/pages/Marketplace/ReMakerProductDetails";
import ReMakerSellerProfile from "./remaker/pages/Marketplace/ReMakerSellerProfile";

/* Purchases (orders the ReMaker bought) */
import ReMakerOrders from "./remaker/pages/Orders/ReMakerOrders";
import ReMakerOrderDetails from "./remaker/pages/Orders/ReMakerOrderDetails";
import ReMakerOrderTrack from "./remaker/pages/Orders/ReMakerOrderTrack";
import ReMakerOrderReport from "./remaker/pages/Orders/ReMakerOrderReport";

/* Sales (orders customers placed with the ReMaker) */
import ReMakerSales from "./remaker/pages/Sales/ReMakerSales";
import ReMakerSaleDetails from "./remaker/pages/Sales/ReMakerSaleDetails";

/* Customers */
import ReMakerCustomers from "./remaker/pages/Customers/ReMakerCustomers";
import ReMakerCustomerProfile from "./remaker/pages/Customers/ReMakerCustomerProfile";

/* Earnings */
import ReMakerEarnings from "./remaker/pages/Earnings/ReMakerEarnings";
import ReMakerTransactions from "./remaker/pages/Earnings/ReMakerTransactions";
import ReMakerPayouts from "./remaker/pages/Earnings/ReMakerPayouts";

/* Portfolio (before / after work) */
import ReMakerPortfolio from "./remaker/pages/Portfolio/ReMakerPortfolio";
import ReMakerPortfolioAdd from "./remaker/pages/Portfolio/ReMakerPortfolioAdd";
import ReMakerPortfolioEdit from "./remaker/pages/Portfolio/ReMakerPortfolioEdit";
import ReMakerPortfolioView from "./remaker/pages/Portfolio/ReMakerPortfolioView";

/* Products (what the ReMaker sells) */
import ReMakerAddProduct from "./remaker/pages/Products/ReMakerAddProduct";
import ReMakerEditProduct from "./remaker/pages/Products/ReMakerEditProduct";
import ReMakerProducts from "./remaker/pages/Products/ReMakerProducts";
import ReMakerProductsMarketplace from "./remaker/pages/Products/ReMakerMarketplace";

/* ====
   ADMIN SIDE (IMPORTS)
   ==== */

import AdminLayout from "./admin/components/AdminLayout";
import AdminLogin from "./admin/pages/Auth/AdminLogin";
import AdminHome from "./admin/pages/HomePages/AdminHome";
import AdminAbout from "./admin/pages/HomePages/AdminAbout";
import AdminHowItWorks from "./admin/pages/HomePages/AdminHowItWorks";
import AdminDashboard from "./admin/pages/Dashboard";

export default function App() {
  return (
    <Routes>
      {/* 
          PUBLIC WEBSITE (no login needed)
           */}

      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* User sign in / sign up (both paths open the same page) */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/login" element={<Auth />} />

      {/* Marketplace and ReMaker previews shown before login */}
      <Route path="/discover-marketplace" element={<UserBeforeMarketplace />} />
      <Route path="/marketplace" element={<UserBeforeMarketplace />} />
      <Route path="/discover-remakers" element={<ReMakerDiscover />} />

      {/* 
          USER SIDE (inside the user layout: header + sidebar)
           */}

      <Route element={<UserLayout />}>
        <Route path="/user-dashboard" element={<UserDashboard />} />

        {/* Marketplace */}
        <Route path="/user-marketplace" element={<UserMarketplace />} />
        <Route
          path="/user-marketplace/product/:id"
          element={<UserProductDetails />}
        />
        <Route
          path="/user-marketplace/seller/:id"
          element={<UserSellerProfile />}
        />
        <Route
          path="/user-marketplace/remaker/:id"
          element={<UserArtistProfile />}
        />

        {/* Orders + checkout */}
        <Route path="/user-orders" element={<UserOrders />} />
        <Route path="/user-orders/:orderId" element={<UserOrderDetails />} />
        <Route path="/user-wishlist" element={<UserWishlist />} />
        <Route path="/user-checkout" element={<UserCheckout />} />

        {/* Community */}
        <Route path="/user-donations" element={<UserDonations />} />
        <Route path="/user-following" element={<UserFollowing />} />

        {/* Profile, rewards and help */}
        <Route path="/user-profile" element={<UserProfile />} />
        <Route path="/user-orbit-points" element={<UserOrbitPoints />} />
        <Route path="/user-badges" element={<UserBadges />} />
        <Route path="/user-settings" element={<UserSettings />} />
        <Route path="/user-help" element={<UserHelp />} />
      </Route>

      {/* 
          REMAKER SIDE: PUBLIC PAGES (no sidebar layout)
           */}

      <Route path="/remakers" element={<ReMakersHome />} />
      <Route path="/remakers-home" element={<ReMakersHome />} />
      <Route path="/remakers-auth" element={<ReMakerAuth />} />
      <Route path="/remakers-about" element={<ReMakerAbout />} />
      <Route path="/remakers-faq" element={<ReMakerFAQ />} />
      <Route path="/remakers-how-it-works" element={<ReMakerHowItWorks />} />
      <Route path="/remakers-contact" element={<ReMakerContact />} />
      <Route
        path="/remakers-before-marketplace"
        element={<ReMakerBeforeMarketplace />}
      />

      {/* 
          REMAKER SIDE: STUDIO (inside the ReMaker layout)
           */}

      <Route element={<ReMakerLayout />}>
        {/* ---------- Dashboard + profile ---------- */}
        <Route path="/remaker-dashboard" element={<ReMakerDashboard />} />
        <Route path="/remaker-profile" element={<ReMakerProfile />} />

        {/* ---------- Marketplace: buy from users and other ReMakers ---------- */}
        <Route path="/remaker-marketplace" element={<ReMakerMarketplace />} />
        <Route
          path="/remaker-marketplace/product/:id"
          element={<ReMakerProductDetails />}
        />
        {/* Seller profile: ReMaker profile or community user profile */}
        <Route
          path="/remaker-marketplace/seller/:id"
          element={<ReMakerSellerProfile />}
        />

        {/* ---------- Purchases: orders the ReMaker bought ---------- */}
        <Route path="/remaker-orders" element={<ReMakerOrders />} />
        <Route
          path="/remaker-orders/:orderId"
          element={<ReMakerOrderDetails />}
        />
        <Route
          path="/remaker-orders/:orderId/track"
          element={<ReMakerOrderTrack />}
        />
        <Route
          path="/remaker-orders/:orderId/report"
          element={<ReMakerOrderReport />}
        />

        {/* ---------- Sales: orders customers placed with the ReMaker ---------- */}
        <Route path="/remaker-sales" element={<ReMakerSales />} />
        <Route path="/remaker-sales/:saleId" element={<ReMakerSaleDetails />} />

        {/* ---------- Customers: people who bought from the ReMaker ---------- */}
        <Route path="/remaker-customers" element={<ReMakerCustomers />} />
        <Route
          path="/remaker-customers/:customerId"
          element={<ReMakerCustomerProfile />}
        />

        {/* ---------- Earnings: overview, statement and payouts ---------- */}
        <Route path="/remaker-earnings" element={<ReMakerEarnings />} />
        <Route
          path="/remaker-earnings/transactions"
          element={<ReMakerTransactions />}
        />
        <Route path="/remaker-earnings/payouts" element={<ReMakerPayouts />} />

        {/* ---------- Portfolio: before / after work ---------- */}
        {/* "new" is listed before ":id" so it is never read as an id */}
        <Route path="/remaker-portfolio" element={<ReMakerPortfolio />} />
        <Route
          path="/remaker-portfolio/new"
          element={<ReMakerPortfolioAdd />}
        />
        <Route
          path="/remaker-portfolio/:id/edit"
          element={<ReMakerPortfolioEdit />}
        />
        <Route
          path="/remaker-portfolio/:id"
          element={<ReMakerPortfolioView />}
        />

        {/* ---------- Products: what the ReMaker sells ---------- */}
        <Route path="/remaker-products" element={<ReMakerProducts />} />
        <Route path="/remaker-products/new" element={<ReMakerAddProduct />} />
        <Route
          path="/remaker-products/marketplace"
          element={<ReMakerProductsMarketplace />}
        />
        <Route
          path="/remaker-products/:id/edit"
          element={<ReMakerEditProduct />}
        />
      </Route>

      {/* ADMIN SIDE */}
      {/* Public admin pages */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin-home" element={<AdminHome />} />
      <Route path="/admin-about" element={<AdminAbout />} />
      <Route path="/admin-how-it-works" element={<AdminHowItWorks />} />

      {/* Admin panel (inside the admin layout) */}
      <Route element={<AdminLayout />}>
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}
