import React, { useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  HelpCircle,
  ShoppingBag,
  Heart,
  Truck,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../../css/UserProfile-css/UserHelp.css";

const faqData = [
  {
    id: 1,
    question: "How do I place an order?",
    answer:
      "Open a product from the ReOrbit marketplace, review its details and choose the purchase action. You will then continue through checkout, select your delivery details and confirm the order.",
    icon: ShoppingBag,
  },
  {
    id: 2,
    question: "How can I track my order?",
    answer:
      "Open My Orders from the sidebar and select the order you want to inspect. The order details screen shows its current status and complete journey.",
    icon: Truck,
  },
  {
    id: 3,
    question: "How does the wishlist work?",
    answer:
      "Use the heart action on marketplace products to save them. Your saved products are available from My Wishlist so you can return to them later.",
    icon: Heart,
  },
  {
    id: 4,
    question: "What are Orbit Points?",
    answer:
      "Orbit Points are ReOrbit's sustainability reward points. You can earn them through eligible sustainable actions and eventually redeem them for rewards.",
    icon: ShieldCheck,
  },
  {
    id: 5,
    question: "How do I donate an item?",
    answer:
      "Open Donations from your user navigation and select the donation flow. You can choose the item category and provide the required pickup information.",
    icon: Heart,
  },
  {
    id: 6,
    question: "How can I update my profile?",
    answer:
      "Open My Profile from the user navigation. Select Edit Profile, update your information and save the changes.",
    icon: HelpCircle,
  },
];

export default function UserHelp() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(1);

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return faqData;

    return faqData.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }, [search]);

  return (
    <section className="user-help-page">
      <div className="help-header">
        <small>Support centre</small>

        <h1>How can we help?</h1>

        <p>
          Find quick answers about shopping, orders, rewards,
          donations and your ReOrbit account.
        </p>
      </div>

      <label className="help-search">
        <Search size={17} />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search your question..."
        />
      </label>

      <div className="help-layout">
        <div className="help-faq-list">
          {filteredFaqs.map((faq) => {
            const Icon = faq.icon;
            const open = openId === faq.id;

            return (
              <article
                key={faq.id}
                className={`help-faq ${
                  open ? "open" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenId(open ? null : faq.id)
                  }
                >
                  <span className="help-faq-question">
                    <span className="help-faq-question-icon">
                      <Icon size={14} />
                    </span>

                    {faq.question}
                  </span>

                  <span className="help-faq-chevron">
                    <ChevronDown size={15} />
                  </span>
                </button>

                {open && (
                  <div className="help-faq-answer">
                    {faq.answer}
                  </div>
                )}
              </article>
            );
          })}

          {filteredFaqs.length === 0 && (
            <div className="help-faq">
              <div
                style={{
                  padding: 25,
                  color: "#6b756d",
                  fontSize: 8,
                  textAlign: "center",
                }}
              >
                No matching questions found.
              </div>
            </div>
          )}
        </div>

        <aside className="help-support">
          <div className="help-support-icon">
            <MessageCircle size={22} />
          </div>

          <small>Need more help?</small>

          <h2>Talk to ReOrbit</h2>

          <p>
            If you cannot find the answer you're looking for,
            reach out to the ReOrbit support team.
          </p>

          <button
            type="button"
            className="help-contact-btn"
            onClick={() =>
              window.alert(
                "Support contact UI is ready. Messaging/backend support will be connected later."
              )
            }
          >
            Contact Support
          </button>

          <div className="help-quick-links">
            <button
              type="button"
              className="help-quick-link"
              onClick={() => navigate("/user-orders")}
            >
              <ShoppingBag size={13} />
              View my orders
            </button>

            <button
              type="button"
              className="help-quick-link"
              onClick={() => navigate("/user-profile")}
            >
              <HelpCircle size={13} />
              Manage my profile
            </button>

            <button
              type="button"
              className="help-quick-link"
              onClick={() => navigate("/user-settings")}
            >
              <ShieldCheck size={13} />
              Account settings
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}