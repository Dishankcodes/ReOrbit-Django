import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./user/pages/Home";
import About from "./user/pages/About";
import FAQ from "./user/pages/FAQ";
import Contact from "./user/pages/Contact";
import HowItWorks from "./user/pages/HowItWorks";
import Privacy from "./user/pages/Privacy";
import Terms from "./user/pages/Terms";
import ReMakerDiscover from "./user/pages/ReMakerDiscover";
import Marketplace from "./user/pages/UserBeforeMarketplace";

import UserAuth from "./user/pages/Auth";
import ReMakerAuth from "./remaker/pages/ReMakerAuth";

import ReMakersHome from "./remaker/pages/ReMakersHome";
import ReMakerAbout from "./remaker/pages/About";
import ReMakerFAQ from "./remaker/pages/FAQ";
import ReMakerHowItWorks from "./remaker/pages/HowItWorks";
import ReMakerContact from "./remaker/pages/Contact";
import RemakerBeforeMarketplace from "./remaker/pages/ReMakerBeforeMarketplace";

import AdminHome from "./admin/pages/AdminHome";
import AdminDashboard from "./admin/pages/Dashboard";
import AdminAbout from "./admin/pages/AdminAbout";
import AdminHowItWorks from "./admin/pages/AdminHowItWorks";

import AdminLogin from "./admin/pages/AdminLogin";

import "./styles/theme.css";

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
