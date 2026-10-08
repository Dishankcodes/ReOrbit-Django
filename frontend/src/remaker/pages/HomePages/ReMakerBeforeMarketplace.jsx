import React, { useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const materials = [
  {
    id: 1,
    name: "Reclaimed Wooden Panels",
    category: "Wood",
    location: "Ahmedabad",
    condition: "Good",
    quantity: "24 pieces",
    material: "Recovered timber",
    description:
      "Clean reclaimed wooden panels suitable for furniture, shelves, decor and small restoration projects.",
    image:
      "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: 2,
    name: "Salvaged Chair Frames",
    category: "Furniture",
    location: "Pune",
    condition: "Repairable",
    quantity: "12 frames",
    material: "Wood & metal",
    description:
      "Old chair frames available for repair, redesign and creative furniture projects.",
    image:
      "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: 3,
    name: "Glass Containers",
    category: "Glass",
    location: "Mumbai",
    condition: "Good",
    quantity: "60 pieces",
    material: "Glass",
    description:
      "Reusable glass containers that can be transformed into lighting, storage and decorative pieces.",
    image:
      "https://images.unsplash.com/photo-1606913419161-1e3f3b0b8c84?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: 4,
    name: "Metal Hardware Collection",
    category: "Metal",
    location: "Bengaluru",
    condition: "Good",
    quantity: "150+ pieces",
    material: "Mixed metal",
    description:
      "Recovered handles, brackets, hinges and other hardware for restoration and new creations.",
    image:
      "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: 5,
    name: "Fabric Offcuts",
    category: "Textile",
    location: "Jaipur",
    condition: "Good",
    quantity: "18 kg",
    material: "Mixed fabric",
    description:
      "Fabric remnants suitable for cushions, bags, patchwork, soft furnishings and creative projects.",
    image:
      "https://images.unsplash.com/photo-1528459105426-b9548367069b?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: 6,
    name: "Old Wooden Drawers",
    category: "Wood",
    location: "Delhi",
    condition: "Repairable",
    quantity: "18 drawers",
    material: "Solid wood",
    description:
      "Recovered drawers that can become shelves, planters, storage units or decorative installations.",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: 7,
    name: "Electronic Components",
    category: "Electronics",
    location: "Hyderabad",
    condition: "Mixed",
    quantity: "Various parts",
    material: "Electronic components",
    description:
      "Recovered components and parts intended for repair, experimentation and creative reuse.",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85",
  },
  {
    id: 8,
    name: "Ceramic Pieces",
    category: "Ceramic",
    location: "Ahmedabad",
    condition: "Mixed",
    quantity: "35 pieces",
    material: "Ceramic",
    description:
      "Recovered ceramic pieces that can be incorporated into mosaics, decor and artistic projects.",
    image:
      "https://images.unsplash.com/photo-1493106819501-66d381c466f1?auto=format&fit=crop&w=1000&q=85",
  },
];

const categories = [
  "All",
  "Wood",
  "Furniture",
  "Glass",
  "Metal",
  "Textile",
  "Electronics",
  "Ceramic",
];

export default function ReMakerBeforeMarketplace() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [location, setLocation] = useState("All locations");
  const [condition, setCondition] = useState("All conditions");

  const filteredMaterials = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return materials.filter((item) => {
      const matchesSearch =
        !searchValue ||
        item.name.toLowerCase().includes(searchValue) ||
        item.category.toLowerCase().includes(searchValue) ||
        item.location.toLowerCase().includes(searchValue) ||
        item.material.toLowerCase().includes(searchValue);

      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const matchesLocation =
        location === "All locations" || item.location === location;

      const matchesCondition =
        condition === "All conditions" || item.condition === condition;

      return (
        matchesSearch && matchesCategory && matchesLocation && matchesCondition
      );
    });
  }, [search, activeCategory, location, condition]);

  const clearFilters = () => {
    setSearch("");
    setActiveCategory("All");
    setLocation("All locations");
    setCondition("All conditions");
  };

  return (
    <>
      <style>{`
        .remaker-before-marketplace {
          --rbm-maroon: #270809;
          --rbm-green: #08271f;
          --rbm-green-soft: #47645a;
          --rbm-sage: #c1c8c4;
          --rbm-light: #e3e2e0;
          --rbm-background: #faf9f7;
          --rbm-white: #ffffff;
          --rbm-text: #1a1c1a;
          --rbm-muted: #727975;
          --rbm-border: #c1c8c4;
          --rbm-shadow: 0 20px 50px rgba(39, 8, 9, 0.07);
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          background: var(--rbm-background);
          color: var(--rbm-text);
          font-family: var(--font-sans, "Poppins", "Inter", Arial, sans-serif);
          isolation: isolate;
        }

        .remaker-before-marketplace *,
        .remaker-before-marketplace *::before,
        .remaker-before-marketplace *::after {
          box-sizing: border-box;
        }

        .remaker-before-marketplace main {
          width: 100%;
        }

        .remaker-before-marketplace a {
          text-decoration: none;
        }

        .remaker-before-marketplace button,
        .remaker-before-marketplace input,
        .remaker-before-marketplace select {
          font: inherit;
        }

        .remaker-before-marketplace .rbm-container {
          width: min(1280px, calc(100% - 80px));
          margin: 0 auto;
        }

        .remaker-before-marketplace .rbm-hero {
          padding: 125px 0 90px;
          background: var(--rbm-background);
        }

        .remaker-before-marketplace .rbm-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
          align-items: center;
          gap: 80px;
        }

        .remaker-before-marketplace .rbm-hero-copy {
          max-width: 620px;
        }

        .remaker-before-marketplace .rbm-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--rbm-green);
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .remaker-before-marketplace .rbm-eyebrow::before {
          content: "";
          width: 24px;
          height: 1.5px;
          background: var(--rbm-green);
        }

        .remaker-before-marketplace .rbm-hero h1 {
          margin: 24px 0 22px;
          color: var(--rbm-maroon);
          font-family: var(--font-display, "Playfair Display", Georgia, serif);
          font-size: clamp(3.5rem, 6vw, 5.8rem);
          font-weight: 700;
          line-height: 0.94;
          letter-spacing: -0.055em;
        }

        .remaker-before-marketplace .rbm-hero h1 em {
          color: var(--rbm-green);
          font-style: italic;
          font-weight: 600;
        }

        .remaker-before-marketplace .rbm-hero-description {
          max-width: 600px;
          margin: 0;
          color: var(--rbm-green-soft);
          font-size: 0.94rem;
          line-height: 1.8;
        }

        .remaker-before-marketplace .rbm-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 32px;
        }

        .remaker-before-marketplace .rbm-primary-button,
        .remaker-before-marketplace .rbm-secondary-button {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 22px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 700;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
        }

        .remaker-before-marketplace .rbm-primary-button {
          border: 1px solid var(--rbm-maroon);
          background: var(--rbm-maroon);
          color: var(--rbm-white);
          box-shadow: 0 10px 25px rgba(39, 8, 9, 0.12);
        }

        .remaker-before-marketplace .rbm-primary-button:hover {
          background: #3b1011;
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(39, 8, 9, 0.18);
        }

        .remaker-before-marketplace .rbm-secondary-button {
          border: 1px solid var(--rbm-border);
          background: transparent;
          color: var(--rbm-maroon);
        }

        .remaker-before-marketplace .rbm-secondary-button:hover {
          background: rgba(39, 8, 9, 0.04);
          transform: translateY(-2px);
        }

        .remaker-before-marketplace .rbm-button-icon {
          font-size: 17px;
        }

        .remaker-before-marketplace .rbm-hero-image-wrap {
          position: relative;
          width: 100%;
          min-height: 570px;
        }

        .remaker-before-marketplace .rbm-hero-image {
          width: 100%;
          height: 570px;
          overflow: hidden;
          border-radius: 28px;
          background: var(--rbm-light);
          box-shadow: var(--rbm-shadow);
        }

        .remaker-before-marketplace .rbm-hero-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center;
        }

        .remaker-before-marketplace .rbm-floating-card {
          position: absolute;
          right: 25px;
          bottom: 25px;
          display: flex;
          align-items: center;
          gap: 13px;
          width: 315px;
          padding: 17px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          border-radius: 18px;
          background: rgba(250, 249, 247, 0.94);
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(14px);
        }

        .remaker-before-marketplace .rbm-floating-icon {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: var(--rbm-green);
          color: white;
        }

        .remaker-before-marketplace .rbm-floating-icon .material-symbols-outlined {
          font-size: 21px;
        }

        .remaker-before-marketplace .rbm-floating-card strong {
          display: block;
          color: var(--rbm-green);
          font-size: 0.76rem;
          font-weight: 800;
        }

        .remaker-before-marketplace .rbm-floating-card span:last-child {
          display: block;
          margin-top: 4px;
          color: var(--rbm-muted);
          font-size: 0.64rem;
          line-height: 1.5;
        }

        .remaker-before-marketplace .rbm-stats {
          padding: 0 0 90px;
          background: var(--rbm-background);
        }

        .remaker-before-marketplace .rbm-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          overflow: hidden;
          border: 1px solid var(--rbm-border);
          border-radius: 22px;
          background: var(--rbm-white);
        }

        .remaker-before-marketplace .rbm-stat {
          min-height: 135px;
          padding: 30px;
          border-right: 1px solid var(--rbm-border);
        }

        .remaker-before-marketplace .rbm-stat:last-child {
          border-right: 0;
        }

        .remaker-before-marketplace .rbm-stat strong {
          display: block;
          color: var(--rbm-maroon);
          font-family: var(--font-display, "Playfair Display", Georgia, serif);
          font-size: 2.5rem;
          line-height: 1;
        }

        .remaker-before-marketplace .rbm-stat span {
          display: block;
          margin-top: 10px;
          color: var(--rbm-muted);
          font-size: 0.68rem;
        }

        .remaker-before-marketplace .rbm-materials {
          padding: 100px 0;
          background: var(--rbm-white);
        }

        .remaker-before-marketplace .rbm-section-heading {
          max-width: 750px;
          margin-bottom: 38px;
        }

        .remaker-before-marketplace .rbm-section-heading h2 {
          margin: 12px 0 14px;
          color: var(--rbm-maroon);
          font-family: var(--font-display, "Playfair Display", Georgia, serif);
          font-size: clamp(2.5rem, 4.5vw, 4rem);
          font-weight: 700;
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .remaker-before-marketplace .rbm-section-heading p {
          max-width: 650px;
          margin: 0;
          color: var(--rbm-muted);
          font-size: 0.84rem;
          line-height: 1.7;
        }

        .remaker-before-marketplace .rbm-filter-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 180px 180px;
          gap: 12px;
          margin-bottom: 18px;
        }

        .remaker-before-marketplace .rbm-search {
          position: relative;
        }

        .remaker-before-marketplace .rbm-search > .material-symbols-outlined {
          position: absolute;
          left: 16px;
          top: 50%;
          color: var(--rbm-muted);
          font-size: 19px;
          transform: translateY(-50%);
          pointer-events: none;
        }

        .remaker-before-marketplace .rbm-search input,
        .remaker-before-marketplace .rbm-select {
          width: 100%;
          height: 52px;
          border: 1px solid var(--rbm-border);
          border-radius: 12px;
          outline: none;
          background: var(--rbm-background);
          color: var(--rbm-text);
          font-size: 0.73rem;
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }

        .remaker-before-marketplace .rbm-search input {
          padding: 0 45px;
        }

        .remaker-before-marketplace .rbm-search input:focus,
        .remaker-before-marketplace .rbm-select:focus {
          border-color: var(--rbm-green);
          background: var(--rbm-white);
          box-shadow: 0 0 0 3px rgba(8, 39, 31, 0.07);
        }

        .remaker-before-marketplace .rbm-clear-search {
          position: absolute;
          right: 7px;
          top: 50%;
          width: 35px;
          height: 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: var(--rbm-muted);
          transform: translateY(-50%);
          cursor: pointer;
        }

        .remaker-before-marketplace .rbm-clear-search .material-symbols-outlined {
          font-size: 18px;
        }

        .remaker-before-marketplace .rbm-select {
          padding: 0 12px;
          cursor: pointer;
        }

        .remaker-before-marketplace .rbm-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-bottom: 28px;
          border-bottom: 1px solid var(--rbm-border);
        }

        .remaker-before-marketplace .rbm-category {
          min-height: 39px;
          padding: 0 16px;
          border: 1px solid var(--rbm-border);
          border-radius: 999px;
          background: var(--rbm-white);
          color: var(--rbm-muted);
          font-size: 0.67rem;
          font-weight: 700;
          cursor: pointer;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            border-color 0.2s ease;
        }

        .remaker-before-marketplace .rbm-category:hover {
          color: var(--rbm-maroon);
          border-color: var(--rbm-maroon);
        }

        .remaker-before-marketplace .rbm-category.active {
          border-color: var(--rbm-maroon);
          background: var(--rbm-maroon);
          color: var(--rbm-white);
        }

        .remaker-before-marketplace .rbm-results-bar {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .remaker-before-marketplace .rbm-result-count {
          color: var(--rbm-muted);
          font-size: 0.7rem;
        }

        .remaker-before-marketplace .rbm-result-count strong {
          color: var(--rbm-green);
          font-size: 1rem;
        }

        .remaker-before-marketplace .rbm-reset {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--rbm-maroon);
          font-size: 0.68rem;
          font-weight: 800;
          cursor: pointer;
        }

        .remaker-before-marketplace .rbm-reset .material-symbols-outlined {
          font-size: 16px;
        }

        .remaker-before-marketplace .rbm-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .remaker-before-marketplace .rbm-card {
          overflow: hidden;
          border: 1px solid var(--rbm-border);
          border-radius: 20px;
          background: var(--rbm-white);
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .remaker-before-marketplace .rbm-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 18px 40px rgba(39, 8, 9, 0.09);
        }

        .remaker-before-marketplace .rbm-card-image {
          position: relative;
          height: 245px;
          overflow: hidden;
          background: var(--rbm-light);
        }

        .remaker-before-marketplace .rbm-card-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          transition: transform 0.45s ease;
        }

        .remaker-before-marketplace .rbm-card:hover .rbm-card-image img {
          transform: scale(1.04);
        }

        .remaker-before-marketplace .rbm-badge {
          position: absolute;
          top: 14px;
          padding: 7px 10px;
          border-radius: 999px;
          font-size: 0.58rem;
          font-weight: 800;
        }

        .remaker-before-marketplace .rbm-badge-category {
          left: 14px;
          background: rgba(250, 249, 247, 0.95);
          color: var(--rbm-green);
        }

        .remaker-before-marketplace .rbm-badge-condition {
          right: 14px;
          background: rgba(39, 8, 9, 0.9);
          color: var(--rbm-white);
        }

        .remaker-before-marketplace .rbm-card-body {
          padding: 21px;
        }

        .remaker-before-marketplace .rbm-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 11px;
          color: var(--rbm-muted);
          font-size: 0.61rem;
        }

        .remaker-before-marketplace .rbm-card-meta span {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .remaker-before-marketplace .rbm-card-meta .material-symbols-outlined {
          font-size: 14px;
        }

        .remaker-before-marketplace .rbm-card-body h3 {
          margin: 0;
          color: var(--rbm-maroon);
          font-family: var(--font-display, "Playfair Display", Georgia, serif);
          font-size: 1.45rem;
          font-weight: 700;
          line-height: 1.1;
        }

        .remaker-before-marketplace .rbm-card-body p {
          min-height: 67px;
          margin: 11px 0 18px;
          color: var(--rbm-muted);
          font-size: 0.67rem;
          line-height: 1.7;
        }

        .remaker-before-marketplace .rbm-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-top: 15px;
          border-top: 1px solid var(--rbm-border);
        }

        .remaker-before-marketplace .rbm-material-type {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: var(--rbm-green);
          font-size: 0.62rem;
          font-weight: 700;
        }

        .remaker-before-marketplace .rbm-material-type .material-symbols-outlined {
          color: var(--rbm-maroon);
          font-size: 16px;
        }

        .remaker-before-marketplace .rbm-view {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--rbm-maroon);
          font-size: 0.65rem;
          font-weight: 800;
        }

        .remaker-before-marketplace .rbm-view .material-symbols-outlined {
          font-size: 16px;
          transition: transform 0.2s ease;
        }

        .remaker-before-marketplace .rbm-view:hover .material-symbols-outlined {
          transform: translateX(3px);
        }

        .remaker-before-marketplace .rbm-empty {
          padding: 70px 25px;
          border: 1px dashed var(--rbm-border);
          border-radius: 22px;
          background: var(--rbm-background);
          text-align: center;
        }

        .remaker-before-marketplace .rbm-empty > .material-symbols-outlined {
          color: var(--rbm-muted);
          font-size: 48px;
        }

        .remaker-before-marketplace .rbm-empty h3 {
          margin: 14px 0 7px;
          color: var(--rbm-maroon);
          font-family: var(--font-display, "Playfair Display", Georgia, serif);
          font-size: 1.7rem;
        }

        .remaker-before-marketplace .rbm-empty p {
          max-width: 450px;
          margin: 0 auto;
          color: var(--rbm-muted);
          font-size: 0.72rem;
          line-height: 1.7;
        }

        .remaker-before-marketplace .rbm-empty button {
          min-height: 43px;
          margin-top: 20px;
          padding: 0 20px;
          border: 1px solid var(--rbm-maroon);
          border-radius: 999px;
          background: var(--rbm-maroon);
          color: white;
          font-size: 0.68rem;
          font-weight: 700;
          cursor: pointer;
        }

        .remaker-before-marketplace .rbm-how {
          padding: 100px 0;
          background: var(--rbm-green);
        }

        .remaker-before-marketplace .rbm-how-head {
          max-width: 700px;
          margin-bottom: 50px;
        }

        .remaker-before-marketplace .rbm-how-head .rbm-eyebrow {
          color: var(--rbm-sage);
        }

        .remaker-before-marketplace .rbm-how-head h2 {
          margin: 12px 0 0;
          color: var(--rbm-white);
          font-family: var(--font-display, "Playfair Display", Georgia, serif);
          font-size: clamp(2.5rem, 4.5vw, 4rem);
          font-weight: 600;
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .remaker-before-marketplace .rbm-how-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }

        .remaker-before-marketplace .rbm-how-card {
          min-height: 270px;
          padding: 24px 27px;
          border-left: 1px solid rgba(255, 255, 255, 0.15);
        }

        .remaker-before-marketplace .rbm-how-card:last-child {
          border-right: 1px solid rgba(255, 255, 255, 0.15);
        }

        .remaker-before-marketplace .rbm-step {
          display: block;
          margin-bottom: 35px;
          color: var(--rbm-sage);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .remaker-before-marketplace .rbm-how-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--rbm-sage);
        }

        .remaker-before-marketplace .rbm-how-icon .material-symbols-outlined {
          font-size: 21px;
        }

        .remaker-before-marketplace .rbm-how-card h3 {
          margin: 0 0 9px;
          color: var(--rbm-white);
          font-family: var(--font-display, "Playfair Display", Georgia, serif);
          font-size: 1.4rem;
          font-weight: 600;
        }

        .remaker-before-marketplace .rbm-how-card p {
          margin: 0;
          color: rgba(255, 255, 255, 0.66);
          font-size: 0.66rem;
          line-height: 1.75;
        }

        .remaker-before-marketplace .rbm-cta {
          padding: 90px 0;
          background: var(--rbm-background);
        }

        .remaker-before-marketplace .rbm-cta-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 45px;
          padding: 50px;
          border: 1px solid var(--rbm-border);
          border-radius: 26px;
          background: var(--rbm-white);
          box-shadow: var(--rbm-shadow);
        }

        .remaker-before-marketplace .rbm-cta-copy {
          max-width: 700px;
        }

        .remaker-before-marketplace .rbm-cta-copy h2 {
          margin: 10px 0;
          color: var(--rbm-maroon);
          font-family: var(--font-display, "Playfair Display", Georgia, serif);
          font-size: clamp(2.2rem, 4vw, 3.5rem);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.045em;
        }

        .remaker-before-marketplace .rbm-cta-copy p {
          max-width: 600px;
          margin: 0;
          color: var(--rbm-muted);
          font-size: 0.78rem;
          line-height: 1.7;
        }

        .remaker-before-marketplace .rbm-cta-action {
          flex-shrink: 0;
        }

        @media (max-width: 1050px) {
          .remaker-before-marketplace .rbm-container {
            width: min(100%, calc(100% - 50px));
          }

          .remaker-before-marketplace .rbm-hero-grid {
            grid-template-columns: 1fr;
            gap: 50px;
          }

          .remaker-before-marketplace .rbm-hero-copy {
            max-width: 760px;
          }

          .remaker-before-marketplace .rbm-hero-image-wrap,
          .remaker-before-marketplace .rbm-hero-image {
            min-height: 500px;
            height: 500px;
          }

          .remaker-before-marketplace .rbm-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .remaker-before-marketplace .rbm-how-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .remaker-before-marketplace .rbm-how-card:nth-child(3),
          .remaker-before-marketplace .rbm-how-card:nth-child(4) {
            border-top: 1px solid rgba(255, 255, 255, 0.15);
          }

          .remaker-before-marketplace .rbm-filter-row {
            grid-template-columns: 1fr 160px 160px;
          }
        }

        @media (max-width: 760px) {
          .remaker-before-marketplace .rbm-container {
            width: calc(100% - 32px);
          }

          .remaker-before-marketplace .rbm-hero {
            padding: 100px 0 65px;
          }

          .remaker-before-marketplace .rbm-hero h1 {
            font-size: clamp(2.8rem, 12vw, 4rem);
          }

          .remaker-before-marketplace .rbm-hero-description {
            font-size: 0.84rem;
          }

          .remaker-before-marketplace .rbm-hero-image-wrap,
          .remaker-before-marketplace .rbm-hero-image {
            min-height: 430px;
            height: 430px;
          }

          .remaker-before-marketplace .rbm-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .remaker-before-marketplace .rbm-stat {
            border-bottom: 1px solid var(--rbm-border);
          }

          .remaker-before-marketplace .rbm-stat:nth-child(2) {
            border-right: 0;
          }

          .remaker-before-marketplace .rbm-filter-row {
            grid-template-columns: 1fr;
          }

          .remaker-before-marketplace .rbm-results-bar {
            min-height: 65px;
          }

          .remaker-before-marketplace .rbm-cta-card {
            flex-direction: column;
            align-items: flex-start;
            padding: 35px 28px;
          }

          .remaker-before-marketplace .rbm-cta-action,
          .remaker-before-marketplace .rbm-cta-action a {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .remaker-before-marketplace .rbm-container {
            width: calc(100% - 24px);
          }

          .remaker-before-marketplace .rbm-hero-actions {
            flex-direction: column;
            align-items: stretch;
          }

          .remaker-before-marketplace .rbm-primary-button,
          .remaker-before-marketplace .rbm-secondary-button {
            width: 100%;
          }

          .remaker-before-marketplace .rbm-hero-image-wrap,
          .remaker-before-marketplace .rbm-hero-image {
            min-height: 350px;
            height: 350px;
          }

          .remaker-before-marketplace .rbm-floating-card {
            right: 12px;
            bottom: 12px;
            width: calc(100% - 24px);
          }

          .remaker-before-marketplace .rbm-materials,
          .remaker-before-marketplace .rbm-how {
            padding: 70px 0;
          }

          .remaker-before-marketplace .rbm-section-heading h2,
          .remaker-before-marketplace .rbm-how-head h2 {
            font-size: 2.5rem;
          }

          .remaker-before-marketplace .rbm-grid {
            grid-template-columns: 1fr;
          }

          .remaker-before-marketplace .rbm-card-image {
            height: 235px;
          }

          .remaker-before-marketplace .rbm-how-grid {
            grid-template-columns: 1fr;
          }

          .remaker-before-marketplace .rbm-how-card,
          .remaker-before-marketplace .rbm-how-card:nth-child(3),
          .remaker-before-marketplace .rbm-how-card:nth-child(4) {
            min-height: auto;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            border-left: 0;
            border-right: 0;
          }

          .remaker-before-marketplace .rbm-how-card:first-child {
            border-top: 0;
          }

          .remaker-before-marketplace .rbm-how-card:last-child {
            border-right: 0;
          }

          .remaker-before-marketplace .rbm-cta {
            padding: 65px 0;
          }

          .remaker-before-marketplace .rbm-cta-card {
            padding: 30px 22px;
            border-radius: 20px;
          }
        }

        @media (max-width: 450px) {
          .remaker-before-marketplace .rbm-hero {
            padding-top: 85px;
          }

          .remaker-before-marketplace .rbm-hero h1 {
            font-size: 2.7rem;
          }

          .remaker-before-marketplace .rbm-stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .remaker-before-marketplace .rbm-stat {
            min-height: 110px;
            padding: 21px 16px;
          }

          .remaker-before-marketplace .rbm-stat strong {
            font-size: 1.9rem;
          }

          .remaker-before-marketplace .rbm-stat span {
            font-size: 0.6rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .remaker-before-marketplace *,
          .remaker-before-marketplace *::before,
          .remaker-before-marketplace *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        .remaker-before-marketplace a:focus-visible,
        .remaker-before-marketplace button:focus-visible,
        .remaker-before-marketplace input:focus-visible,
        .remaker-before-marketplace select:focus-visible {
          outline: 2px solid var(--rbm-green);
          outline-offset: 3px;
        }
      `}</style>
      <div className="remaker-page rm-page remaker-before-marketplace">
        <Navbar />

        <main>
          <section className="rbm-hero">
            <div className="rbm-container">
              <div className="rbm-hero-grid">
                <div className="rbm-hero-copy">
                  <span className="rbm-eyebrow">ReMaker Material Library</span>

                  <h1>
                    Find material.
                    <br />
                    <em>Start making.</em>
                  </h1>

                  <p className="rbm-hero-description">
                    Browse rescued, reusable and overlooked materials available
                    through the ReOrbit network. Find something useful for your
                    next creation and give it another orbit.
                  </p>

                  <div className="rbm-hero-actions">
                    <a href="#materials" className="rbm-primary-button">
                      Browse materials
                      <span className="material-symbols-outlined rbm-button-icon">
                        arrow_downward
                      </span>
                    </a>

                    <a href="/remakers-auth" className="rbm-secondary-button">
                      Become a ReMaker
                    </a>
                  </div>
                </div>

                <div className="rbm-hero-image-wrap">
                  <div className="rbm-hero-image">
                    <img
                      src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1400&q=85"
                      alt="Creative materials and reusable objects"
                    />
                  </div>

                  <div className="rbm-floating-card">
                    <div className="rbm-floating-icon">
                      <span className="material-symbols-outlined">
                        recycling
                      </span>
                    </div>

                    <div>
                      <strong>Materials in motion</strong>
                      <span>Find something ready for another purpose.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rbm-stats">
            <div className="rbm-container">
              <div className="rbm-stats-grid">
                <div className="rbm-stat">
                  <strong>250+</strong>
                  <span>Materials available</span>
                </div>

                <div className="rbm-stat">
                  <strong>18</strong>
                  <span>Material categories</span>
                </div>

                <div className="rbm-stat">
                  <strong>25+</strong>
                  <span>Pickup locations</span>
                </div>

                <div className="rbm-stat">
                  <strong>100%</strong>
                  <span>Built for circular making</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rbm-materials" id="materials">
            <div className="rbm-container">
              <div className="rbm-section-heading">
                <span className="rbm-eyebrow">Explore the collection</span>

                <h2>Materials waiting for a new idea.</h2>

                <p>
                  Search through available materials and discover what could
                  become your next creation.
                </p>
              </div>

              <div className="rbm-filter-row">
                <div className="rbm-search">
                  <span className="material-symbols-outlined">search</span>

                  <input
                    type="text"
                    value={search}
                    placeholder="Search materials, categories or locations..."
                    onChange={(event) => setSearch(event.target.value)}
                  />

                  {search && (
                    <button
                      type="button"
                      className="rbm-clear-search"
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  )}
                </div>

                <select
                  className="rbm-select"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                >
                  <option>All locations</option>
                  <option>Ahmedabad</option>
                  <option>Pune</option>
                  <option>Mumbai</option>
                  <option>Bengaluru</option>
                  <option>Jaipur</option>
                  <option>Delhi</option>
                  <option>Hyderabad</option>
                </select>

                <select
                  className="rbm-select"
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                >
                  <option>All conditions</option>
                  <option>Good</option>
                  <option>Repairable</option>
                  <option>Mixed</option>
                </select>
              </div>

              <div className="rbm-categories">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`rbm-category ${
                      activeCategory === category ? "active" : ""
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="rbm-results-bar">
                <div className="rbm-result-count">
                  <strong>{filteredMaterials.length}</strong> materials
                  available
                </div>

                {(search ||
                  activeCategory !== "All" ||
                  location !== "All locations" ||
                  condition !== "All conditions") && (
                  <button
                    type="button"
                    className="rbm-reset"
                    onClick={clearFilters}
                  >
                    Clear filters
                    <span className="material-symbols-outlined">
                      restart_alt
                    </span>
                  </button>
                )}
              </div>

              {filteredMaterials.length > 0 ? (
                <div className="rbm-grid">
                  {filteredMaterials.map((item) => (
                    <article className="rbm-card" key={item.id}>
                      <div className="rbm-card-image">
                        <img src={item.image} alt={item.name} />

                        <span className="rbm-badge rbm-badge-category">
                          {item.category}
                        </span>

                        <span className="rbm-badge rbm-badge-condition">
                          {item.condition}
                        </span>
                      </div>

                      <div className="rbm-card-body">
                        <div className="rbm-card-meta">
                          <span>
                            <span className="material-symbols-outlined">
                              location_on
                            </span>
                            {item.location}
                          </span>

                          <span>
                            <span className="material-symbols-outlined">
                              inventory_2
                            </span>
                            {item.quantity}
                          </span>
                        </div>

                        <h3>{item.name}</h3>

                        <p>{item.description}</p>

                        <div className="rbm-card-footer">
                          <span className="rbm-material-type">
                            <span className="material-symbols-outlined">
                              recycling
                            </span>
                            {item.material}
                          </span>

                          <a href="/remakers-auth" className="rbm-view">
                            View
                            <span className="material-symbols-outlined">
                              arrow_forward
                            </span>
                          </a>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rbm-empty">
                  <span className="material-symbols-outlined">search_off</span>

                  <h3>No materials found</h3>

                  <p>
                    Try another search term or remove some filters to explore
                    more available materials.
                  </p>

                  <button type="button" onClick={clearFilters}>
                    Reset filters
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="rbm-how">
            <div className="rbm-container">
              <div className="rbm-how-head">
                <span className="rbm-eyebrow">From material to making</span>

                <h2>Simple sourcing. More meaningful making.</h2>
              </div>

              <div className="rbm-how-grid">
                <article className="rbm-how-card">
                  <span className="rbm-step">01</span>

                  <div className="rbm-how-icon">
                    <span className="material-symbols-outlined">search</span>
                  </div>

                  <h3>Discover</h3>

                  <p>
                    Browse available materials and find something that fits your
                    next idea.
                  </p>
                </article>

                <article className="rbm-how-card">
                  <span className="rbm-step">02</span>

                  <div className="rbm-how-icon">
                    <span className="material-symbols-outlined">
                      check_circle
                    </span>
                  </div>

                  <h3>Choose</h3>

                  <p>
                    Check the material details, condition, quantity and location
                    before requesting it.
                  </p>
                </article>

                <article className="rbm-how-card">
                  <span className="rbm-step">03</span>

                  <div className="rbm-how-icon">
                    <span className="material-symbols-outlined">handyman</span>
                  </div>

                  <h3>Transform</h3>

                  <p>
                    Give the material a new purpose through your own craft,
                    repair or creative process.
                  </p>
                </article>

                <article className="rbm-how-card">
                  <span className="rbm-step">04</span>

                  <div className="rbm-how-icon">
                    <span className="material-symbols-outlined">public</span>
                  </div>

                  <h3>Return to orbit</h3>

                  <p>
                    Put your finished creation back into circulation through the
                    ReOrbit marketplace.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="rbm-cta">
            <div className="rbm-container">
              <div className="rbm-cta-card">
                <div className="rbm-cta-copy">
                  <span className="rbm-eyebrow">Ready to make?</span>

                  <h2>The next great material might already be here.</h2>

                  <p>
                    Join ReOrbit as a ReMaker to request materials, create
                    meaningful products and put your work back into circulation.
                  </p>
                </div>

                <div className="rbm-cta-action">
                  <a href="/remakers-auth" className="rbm-primary-button">
                    Become a ReMaker
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
