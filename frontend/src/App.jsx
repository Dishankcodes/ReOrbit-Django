import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// User public pages.
import Home from "./user/pages/HomePages/Home";
import About from "./user/pages/HomePages/About";
import FAQ from "./user/pages/HomePages/FAQ";
import Contact from "./user/pages/HomePages/Contact";
import HowItWorks from "./user/pages/HomePages/HowItWorks";
import Privacy from "./user/pages/HomePages/Privacy";
import Terms from "./user/pages/HomePages/Terms";
import ReMakerDiscover from "./user/pages/HomePages/ReMakerDiscover";
import Marketplace from "./user/pages/HomePages/UserBeforeMarketplace";

// User authentication.
import UserAuth from "./user/pages/Auth/Auth";

// User after-login.
import UserLayout from "./user/components/UserLayout";
import UserDashboard from "./user/pages/UserDashboard";

// ReMaker authentication.
import ReMakerAuth from "./remaker/pages/Auth/ReMakerAuth";

// ReMaker public pages.
import ReMakersHome from "./remaker/pages/HomePages/ReMakersHome";
import ReMakerAbout from "./remaker/pages/HomePages/About";
import ReMakerFAQ from "./remaker/pages/HomePages/FAQ";
import ReMakerHowItWorks from "./remaker/pages/HomePages/HowItWorks";
import ReMakerContact from "./remaker/pages/HomePages/Contact";
import RemakerBeforeMarketplace from "./remaker/pages/HomePages/ReMakerBeforeMarketplace";

// ReMaker after-login.
import ReMakerLayout from "./remaker/components/ReMakerLayout";
import ReMakerDashboard from "./remaker/pages/ReMakerDashboard";

// Admin public pages.
import AdminHome from "./admin/pages/HomePages/AdminHome";
import AdminAbout from "./admin/pages/HomePages/AdminAbout";
import AdminHowItWorks from "./admin/pages/HomePages/AdminHowItWorks";
import AdminLogin from "./admin/pages/Auth/AdminLogin";

// Admin panel.
import AdminLayout from "./admin/components/AdminLayout";
import AdminDashboard from "./admin/pages/Dashboard";

import "./styles/theme.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* USER PUBLIC PAGES */}

        <Route path="/" element={<Home />} />
        <Route path="/discover-remakers" element={<ReMakerDiscover />} />
        <Route path="/discover-marketplace" element={<Marketplace />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/UserPrivacy" element={<Privacy />} />
        <Route path="/UserTerms" element={<Terms />} />

        {/* USER AUTH */}

        <Route path="/auth" element={<UserAuth />} />

        {/* USER AFTER LOGIN */}

        <Route element={<UserLayout />}>
          <Route path="/user-dashboard" element={<UserDashboard />} />
        </Route>

        {/* REMAKER AUTH */}

        <Route path="/remakers-auth" element={<ReMakerAuth />} />

        {/* REMAKER PUBLIC PAGES */}

        <Route path="/remakers-home" element={<ReMakersHome />} />

        <Route path="/remakers-about" element={<ReMakerAbout />} />

        <Route path="/remakers-faq" element={<ReMakerFAQ />} />

        <Route path="/remakers-how-it-works" element={<ReMakerHowItWorks />} />

        <Route path="/remakers-contact" element={<ReMakerContact />} />

        <Route
          path="/remakers-before-marketplace"
          element={<RemakerBeforeMarketplace />}
        />

        {/* REMAKER AFTER LOGIN */}

        <Route element={<ReMakerLayout />}>
          <Route path="/remaker-dashboard" element={<ReMakerDashboard />} />

          <Route
            path="/remaker-portfolio"
            element={<div>ReMaker Portfolio</div>}
          />

          <Route
            path="/remaker-products"
            element={<div>ReMaker Products</div>}
          />

          <Route path="/remaker-orders" element={<div>ReMaker Orders</div>} />

          <Route
            path="/remaker-earnings"
            element={<div>ReMaker Earnings</div>}
          />

          <Route
            path="/remaker-followers"
            element={<div>ReMaker Followers</div>}
          />

          <Route path="/remaker-reviews" element={<div>ReMaker Reviews</div>} />

          <Route
            path="/remaker-analytics"
            element={<div>ReMaker Analytics</div>}
          />

          <Route
            path="/remaker-notifications"
            element={<div>ReMaker Notifications</div>}
          />

          <Route
            path="/remaker-settings"
            element={<div>ReMaker Settings</div>}
          />

          <Route path="/remaker-help" element={<div>ReMaker Help</div>} />

          <Route path="/remaker-profile" element={<div>ReMaker Profile</div>} />

          <Route
            path="/remaker-products/new"
            element={<div>Create Product</div>}
          />
        </Route>

        {/* ADMIN PUBLIC PAGES */}

        <Route path="/admin-home" element={<AdminHome />} />

        <Route path="/admin-about" element={<AdminAbout />} />

        <Route path="/admin-how-it-works" element={<AdminHowItWorks />} />

        <Route path="/admin-login" element={<AdminLogin />} />

        {/* ADMIN PANEL */}

        <Route element={<AdminLayout />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />

          <Route path="/admin-users" element={<div>Admin Users</div>} />

          <Route path="/admin-remakers" element={<div>Admin ReMakers</div>} />

          <Route path="/admin-products" element={<div>Admin Products</div>} />

          <Route path="/admin-orders" element={<div>Admin Orders</div>} />

          <Route path="/admin-donations" element={<div>Admin Donations</div>} />

          <Route path="/admin-pickups" element={<div>Admin Pickups</div>} />

          <Route path="/admin-warehouse" element={<div>Admin Warehouse</div>} />

          <Route path="/admin-rewards" element={<div>Admin Rewards</div>} />

          <Route
            path="/admin-notifications"
            element={<div>Admin Notifications</div>}
          />

          <Route path="/admin-reports" element={<div>Admin Reports</div>} />

          <Route path="/admin-settings" element={<div>Admin Settings</div>} />

          <Route path="/admin-help" element={<div>Admin Help & Support</div>} />

          <Route path="/admin-profile" element={<div>Admin Profile</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
