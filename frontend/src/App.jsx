import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./user/pages/Home";
import Login from "./user/pages/Login";
import Marketplace from "./user/pages/Marketplace";
import ReMakers from "./remaker/pages/ReMakers";
import AdminDashboard from "./admin/pages/Dashboard";

import "./styles/theme.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/remakers" element={<ReMakers />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
