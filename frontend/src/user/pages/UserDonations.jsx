import React, { useMemo, useState } from "react";
import {
  HeartHandshake,
  Shirt,
  BookOpen,
  Laptop,
  Home,
  PackageCheck,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../css/UserDonations.css";

const categories = [
  {
    id: "clothing",
    title: "Clothing",
    description: "Clean clothes ready for a second life.",
    icon: Shirt,
  },
  {
    id: "books",
    title: "Books",
    description: "Books waiting for another reader.",
    icon: BookOpen,
  },
  {
    id: "electronics",
    title: "Electronics",
    description: "Useful electronics you no longer need.",
    icon: Laptop,
  },
  {
    id: "home",
    title: "Home Items",
    description: "Furniture, decor and everyday items.",
    icon: Home,
  },
];

const initialDonations = [
  {
    id: "DON1024",
    title: "Old Book Collection",
    category: "Books",
    amount: "12 items",
    status: "Pickup scheduled",
    date: "18 Aug 2026",
  },
  {
    id: "DON1025",
    title: "Winter Clothing",
    category: "Clothing",
    amount: "8 items",
    status: "Collected",
    date: "10 Aug 2026",
  },
  {
    id: "DON1026",
    title: "Unused Home Decor",
    category: "Home Items",
    amount: "5 items",
    status: "Processing",
    date: "22 Aug 2026",
  },
];

export default function UserDonations() {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState("books");

  const [donations] = useState(initialDonations);

  const selected = useMemo(
    () => categories.find((category) => category.id === selectedCategory),
    [selectedCategory],
  );

  return (
    <section className="user-donations-page">
      <div className="donations-hero">
        <div className="donations-hero-icon">
          <HeartHandshake size={29} />
        </div>

        <div className="donations-hero-content">
          <small>Give items another orbit</small>

          <h1>Donate with purpose.</h1>

          <p>
            Turn useful items you no longer need into meaningful resources for
            someone else while reducing unnecessary waste.
          </p>
        </div>

        <div className="donation-stat-group">
          <div className="donation-stat">
            <strong>25</strong>
            <span>Items donated</span>
          </div>

          <div className="donation-stat">
            <strong>68 kg</strong>
            <span>Waste diverted</span>
          </div>
        </div>
      </div>

      <article
        style={{
          padding: 21,
          marginBottom: 14,
          border: "1px solid #dce5de",
          borderRadius: 17,
          background: "#fff",
        }}
      >
        <div
          style={{
            marginBottom: 15,
          }}
        >
          <span
            style={{
              color: "#728078",
              fontSize: 7,
              fontWeight: 800,
              letterSpacing: ".12em",
              textTransform: "uppercase",
            }}
          >
            Start a donation
          </span>

          <h2
            style={{
              marginTop: 5,
              color: "#1f2923",
              fontFamily: "Playfair Display, Georgia, serif",
              fontSize: 20,
            }}
          >
            What would you like to donate?
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 10,
          }}
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const active = selectedCategory === category.id;

            return (
              <button
                type="button"
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  padding: 14,
                  border: active ? "1px solid #2a4d3a" : "1px solid #dce5de",
                  borderRadius: 13,
                  background: active ? "#edf4ef" : "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 11,
                    background: active ? "#2a4d3a" : "#edf4ef",
                    color: active ? "#fff" : "#2a4d3a",
                  }}
                >
                  <Icon size={17} />
                </span>

                <strong
                  style={{
                    display: "block",
                    marginTop: 10,
                    color: "#1f2923",
                    fontSize: 9,
                  }}
                >
                  {category.title}
                </strong>

                <small
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "#6b756d",
                    fontSize: 7,
                    lineHeight: 1.5,
                  }}
                >
                  {category.description}
                </small>
              </button>
            );
          })}
        </div>

        {selected && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 15,
              marginTop: 15,
              padding: 13,
              borderRadius: 11,
              background: "#fafcfb",
              border: "1px solid #edf1ed",
            }}
          >
            <div>
              <strong
                style={{
                  display: "block",
                  color: "#2a4d3a",
                  fontSize: 9,
                }}
              >
                {selected.title} selected
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: 4,
                  color: "#6b756d",
                  fontSize: 7,
                }}
              >
                Schedule a convenient pickup for your donation.
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                window.alert(
                  "Donation pickup flow is ready for UI integration.",
                )
              }
              style={{
                minHeight: 37,
                padding: "0 12px",
                border: 0,
                borderRadius: 9,
                background: "#2a4d3a",
                color: "#fff",
                fontSize: 8,
                fontWeight: 800,
              }}
            >
              <CalendarDays
                size={13}
                style={{
                  marginRight: 6,
                  verticalAlign: "middle",
                }}
              />
              Schedule Pickup
            </button>
          </div>
        )}
      </article>

      <div className="donations-list">
        {donations.map((donation) => (
          <article className="donation-card" key={donation.id}>
            <div className="donation-icon">
              <PackageCheck size={19} />
            </div>

            <div>
              <h3>{donation.title}</h3>

              <p>
                {donation.category} · {donation.date}
              </p>
            </div>

            <strong className="donation-card-amount">{donation.amount}</strong>

            <span className="donation-status">
              <CheckCircle2
                size={10}
                style={{
                  marginRight: 4,
                  verticalAlign: "middle",
                }}
              />
              {donation.status}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
