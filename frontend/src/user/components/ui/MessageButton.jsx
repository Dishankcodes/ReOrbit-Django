import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { startConversation } from "../../data/messagesStore";

/* Opens (or starts) the chat with someone about something.
   target: { key, kind, name, subtitle, image, context } - see messagesStore.startConversation */
export default function MessageButton({
  target,
  label = "Message",
  className = "dn-btn dn-btn--ghost",
  iconSize = 15,
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={className}
      onClick={() => navigate(`/user-messages/${startConversation(target)}`)}
    >
      <MessageCircle size={iconSize} /> {label}
    </button>
  );
}

/* Ready-made targets so every page starts the same chat for the same person */
export const sellerChat = (item) => ({
  key: `${item.sellerType === "remaker" ? "remaker" : "seller"}:${item.sellerId}`,
  kind: item.sellerType === "remaker" ? "remaker" : "seller",
  name: item.seller,
  subtitle:
    item.sellerType === "remaker"
      ? `ReMaker · ${item.city}`
      : `Seller · ${item.city}`,
  image: item.sellerImage,
  context: {
    label: `${item.title} · ₹${Number(item.price).toLocaleString("en-IN")}`,
    to: `/user-marketplace/product/${item.id}`,
    image: item.image,
  },
});

export const personChat = (p, kind) => ({
  key: `${kind}:${p.id}`,
  kind,
  name: p.name,
  subtitle: `${kind === "remaker" ? "ReMaker" : "Seller"} · ${p.city}`,
  image: p.image,
  context: null,
});
