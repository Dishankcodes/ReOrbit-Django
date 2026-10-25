import {
  Armchair,
  Shirt,
  BookOpen,
  Laptop,
  Lamp,
  UtensilsCrossed,
  Watch,
  Dumbbell,
  Gift,
} from "lucide-react";

const ICONS = {
  Furniture: Armchair,
  Clothing: Shirt,
  Books: BookOpen,
  Electronics: Laptop,
  "Home Decor": Lamp,
  Kitchen: UtensilsCrossed,
  Fashion: Watch,
  Sports: Dumbbell,
};

export const categoryIcon = (category) => ICONS[category] || Gift;
