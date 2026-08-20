import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./user/pages/Home";
import Login from "./user/pages/Login";
import Marketplace from "./user/pages/Marketplace";
import About from "./user/pages/About";
import FAQ from "./user/pages/FAQ";
import Contact from "./user/pages/Contact";
import HowItWorks from "./user/pages/HowItWorks";


import ReMakers from "./remaker/pages/ReMakers";
import ReMakerAbout from "./remaker/pages/About";
import ReMakerFAQ from "./remaker/pages/FAQ";
import AdminDashboard from "./admin/pages/Dashboard";

import "./styles/theme.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* USER */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/how-it-works" element={<HowItWorks />} />

        {/* REMAKER */}
        <Route path="/remakers" element={<ReMakers />} />
        <Route path="/remakers-about" element={<ReMakerAbout />} />
        <Route path="/remakers-faq" element={<ReMakerFAQ />} />

        {/* ADMIN */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
