/* Conversation targets shared by product, profile, order and donation pages. */
import { productPath } from "../../shared/slug";

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
    to: productPath(item.id, item.title),
    image: item.image,
  },
});

export const personChat = (person, kind) => ({
  key: `${kind}:${person.id}`,
  kind,
  name: person.name,
  subtitle: `${kind === "remaker" ? "ReMaker" : "Seller"} · ${person.city}`,
  image: person.image,
  context: null,
});
