import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./user/pages/HomePages/Home";
import About from "./user/pages/HomePages/About";
import FAQ from "./user/pages/HomePages/FAQ";
import Contact from "./user/pages/HomePages/Contact";
import HowItWorks from "./user/pages/HomePages/HowItWorks";
import Privacy from "./user/pages/HomePages/Privacy";
import Terms from "./user/pages/HomePages/Terms";
import ReMakerDiscover from "./user/pages/HomePages/ReMakerDiscover";
import Marketplace from "./user/pages/HomePages/UserBeforeMarketplace";
import UserAuth from "./user/pages/Auth/Auth";
import UserLayout from "./user/components/UserLayout";
import UserDashboard from "./user/pages/UserDashboard";
import UserProfile from "./user/pages/UserProfile";
import UserMarketplace from "./user/pages/BuyProducts/UserMarketplace";
import UserProductDetails from "./user/pages/BuyProducts/UserProductDetails";
import UserSellerProfile from "./user/pages/BuyProducts/UserSellerProfile";
import UserArtistProfile from "./user/pages/BuyProducts/UserArtistProfile";
import UserCheckout from "./user/pages/UserCheckout";
import UserOrders from "./user/pages/UserOrders";
import UserOrderDetails from "./user/pages/UserOrderDetails";
import UserWishlist from "./user/pages/UserWishlist";
import UserDonations from "./user/pages/UserDonations";
import UserFollowing from "./user/pages/UserFollowing";
import UserOrbitPoints from "./user/pages/UserOrbitPoints";
import UserBadges from "./user/pages/UserBadges";
import UserSettings from "./user/pages/UserSettings";
import UserHelp from "./user/pages/UserHelp";

import ReMakerAuth from "./remaker/pages/Auth/ReMakerAuth";
import ReMakersHome from "./remaker/pages/HomePages/ReMakersHome";
import ReMakerAbout from "./remaker/pages/HomePages/About";
import ReMakerFAQ from "./remaker/pages/HomePages/FAQ";
import ReMakerHowItWorks from "./remaker/pages/HomePages/HowItWorks";
import ReMakerContact from "./remaker/pages/HomePages/Contact";
import RemakerBeforeMarketplace from "./remaker/pages/HomePages/ReMakerBeforeMarketplace";
import ReMakerLayout from "./remaker/components/ReMakerLayout";
import ReMakerDashboard from "./remaker/pages/ReMakerDashboard";
import ReMakerProducts from "./remaker/pages/Products/ReMakerProducts";
import ReMakerAddProduct from "./remaker/pages/Products/ReMakerAddProduct";
import ReMakerEditProduct from "./remaker/pages/Products/ReMakerEditProduct";
import ReMakerProfile from "./remaker/pages/ReMakerProfile";
import ReMakerMarketplace from "./remaker/pages/Marketplace/ReMakerMarketplace";
import ReMakerProductDetails from "./remaker/pages/Marketplace/ReMakerProductDetails";
import ReMakerSellerProfile from "./remaker/pages/Marketplace/ReMakerSellerProfile";
import ReMakerPortfolio from "./remaker/pages/Portfolio/ReMakerPortfolio";
import ReMakerPortfolioAdd from "./remaker/pages/Portfolio/ReMakerPortfolioAdd";
import ReMakerPortfolioView from "./remaker/pages/Portfolio/ReMakerPortfolioView";
import ReMakerPortfolioEdit from "./remaker/pages/Portfolio/ReMakerPortfolioEdit";
import ReMakerOrders from "./remaker/pages/Orders/ReMakerOrders";
import ReMakerOrderDetails from "./remaker/pages/Orders/ReMakerOrderDetails";
import ReMakerOrderTrack from "./remaker/pages/Orders/ReMakerOrderTrack";
import ReMakerOrderReport from "./remaker/pages/Orders/ReMakerOrderReport";

import AdminHome from "./admin/pages/HomePages/AdminHome";
import AdminAbout from "./admin/pages/HomePages/AdminAbout";
import AdminHowItWorks from "./admin/pages/HomePages/AdminHowItWorks";
import AdminLogin from "./admin/pages/Auth/AdminLogin";
import AdminLayout from "./admin/components/AdminLayout";
import AdminDashboard from "./admin/pages/Dashboard";

import "./styles/theme.css";
import "./user/css/marketplace-icons.css";

const adminPlaceholders = [
  ["users", "Users"],
  ["remakers", "ReMakers"],
  ["products", "Products"],
  ["orders", "Orders"],
  ["donations", "Donations"],
  ["pickups", "Pickups"],
  ["warehouse", "Warehouse"],
  ["rewards", "Rewards"],
  ["notifications", "Notifications"],
  ["reports", "Reports"],
  ["settings", "Settings"],
  ["help", "Help & Support"],
  ["profile", "Profile"],
];

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/discover-remakers" element={<ReMakerDiscover />} />
        <Route path="/discover-marketplace" element={<Marketplace />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/UserPrivacy" element={<Privacy />} />
        <Route path="/UserTerms" element={<Terms />} />
        <Route path="/auth" element={<UserAuth />} />

        <Route element={<UserLayout />}>
          <Route path="/user-dashboard" element={<UserDashboard />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/user-marketplace" element={<UserMarketplace />} />
          <Route
            path="/user-marketplace/product/:productId"
            element={<UserProductDetails />}
          />
          <Route
            path="/user-seller-profile/:sellerId"
            element={<UserSellerProfile />}
          />
          <Route
            path="/user-artist-profile/:artistId"
            element={<UserArtistProfile />}
          />
          <Route path="/user-checkout" element={<UserCheckout />} />
          <Route path="/user-orders" element={<UserOrders />} />
          <Route
            path="/user-orders/:orderId"
            element={<UserOrderDetails />}
          />
          <Route path="/user-wishlist" element={<UserWishlist />} />
          <Route path="/user-donations" element={<UserDonations />} />
          <Route path="/user-following" element={<UserFollowing />} />
          <Route path="/user-orbit-points" element={<UserOrbitPoints />} />
          <Route path="/user-badges" element={<UserBadges />} />
          <Route path="/user-settings" element={<UserSettings />} />
          <Route path="/user-help" element={<UserHelp />} />
        </Route>

        <Route path="/remaker-auth" element={<ReMakerAuth />} />
        <Route path="/remaker-home" element={<ReMakersHome />} />
        <Route path="/remaker-about" element={<ReMakerAbout />} />
        <Route path="/remaker-faq" element={<ReMakerFAQ />} />
        <Route
          path="/remaker-how-it-works"
          element={<ReMakerHowItWorks />}
        />
        <Route path="/remaker-contact" element={<ReMakerContact />} />
        <Route
          path="/remaker-marketplace-home"
          element={<RemakerBeforeMarketplace />}
        />
        <Route
          path="/remakers-before-marketplace"
          element={<RemakerBeforeMarketplace />}
        />

        <Route element={<ReMakerLayout />}>
          <Route path="/remaker-dashboard" element={<ReMakerDashboard />} />
          <Route path="/remaker-products" element={<ReMakerProducts />} />
          <Route
            path="/remaker-products/add"
            element={<ReMakerAddProduct />}
          />
          <Route
            path="/remaker-products/edit/:productId"
            element={<ReMakerEditProduct />}
          />
          <Route path="/remaker-profile" element={<ReMakerProfile />} />
          <Route
            path="/remaker-marketplace"
            element={<ReMakerMarketplace />}
          />
          <Route
            path="/remaker-marketplace/product/:productId"
            element={<ReMakerProductDetails />}
          />
          <Route
            path="/remaker-marketplace/seller/:sellerId"
            element={<ReMakerSellerProfile />}
          />
          <Route
            path="/remaker-seller/:sellerId"
            element={<ReMakerSellerProfile />}
          />
          <Route
            path="/remaker-portfolio"
            element={<ReMakerPortfolio />}
          />
          <Route
            path="/remaker-portfolio/add"
            element={<ReMakerPortfolioAdd />}
          />
          <Route
            path="/remaker-portfolio/:portfolioId"
            element={<ReMakerPortfolioView />}
          />
          <Route
            path="/remaker-portfolio/:portfolioId/edit"
            element={<ReMakerPortfolioEdit />}
          />
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
        </Route>

        <Route path="/admin-home" element={<AdminHome />} />
        <Route path="/admin-about" element={<AdminAbout />} />
        <Route
          path="/admin-how-it-works"
          element={<AdminHowItWorks />}
        />
        <Route path="/admin-login" element={<AdminLogin />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          {adminPlaceholders.map(([path, label]) => (
            <Route
              key={path}
              path={`/admin-${path}`}
              element={<div>{`Admin ${label}`}</div>}
            />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
