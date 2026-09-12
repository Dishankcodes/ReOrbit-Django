import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import ReMakerAuth from "./remaker/pages/Auth/ReMakerAuth";

import ReMakersHome from "./remaker/pages/HomePages/ReMakersHome";
import ReMakerAbout from "./remaker/pages/HomePages/About";
import ReMakerFAQ from "./remaker/pages/HomePages/FAQ";
import ReMakerHowItWorks from "./remaker/pages/HomePages/HowItWorks";
import ReMakerContact from "./remaker/pages/HomePages/Contact";
import RemakerBeforeMarketplace from "./remaker/pages/HomePages/ReMakerBeforeMarketplace";

import AdminHome from "./admin/pages/HomePages/AdminHome";
import AdminDashboard from "./admin/pages/Dashboard";
import AdminAbout from "./admin/pages/HomePages/AdminAbout";
import AdminHowItWorks from "./admin/pages/HomePages/AdminHowItWorks";

import AdminLogin from "./admin/pages/Auth/AdminLogin";

import "./styles/theme.css";



function UserDashboardPlaceholder() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "10px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>ReOrbit User Dashboard</h1>

      <p>
        Authentication successful. Dashboard UI
        will be implemented in Phase 2.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* USER */}
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
        
        {/* REMAKER AUTH */}
        <Route path="/remakers-auth" element={<ReMakerAuth />} />

        {/* REMAKER */}
        <Route path="/remakers-home" element={<ReMakersHome />} />
        <Route path="/remakers-about" element={<ReMakerAbout />} />
        <Route path="/remakers-faq" element={<ReMakerFAQ />} />
        <Route path="/remakers-how-it-works" element={<ReMakerHowItWorks />} />
        <Route path="/remakers-contact" element={<ReMakerContact />} />
        <Route
          path="/remakers-before-marketplace"
          element={<RemakerBeforeMarketplace />}
        />

        {/* ADMIN */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/admin-home" element={<AdminHome />} />
        <Route path="/admin-about" element={<AdminAbout />} />
        <Route path="/admin-how-it-works" element={<AdminHowItWorks />} />

        <Route path="/admin-login" element={<AdminLogin />} />
      </Routes>
    </BrowserRouter>
  );
}
