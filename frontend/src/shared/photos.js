/* Product photos (free to use, from Pexels). Each subject has a few different
   pictures so two listings of the same kind don't look identical.
   Backend later: photos come from uploads; this is only the demo set. */
const px = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1000`;

export const PHOTO_BANK = {
  cabinet: [177143, 5824819, 5825540, 8134812],
  chest: [5825540, 8134812, 6333743, 10397037],
  chair: [696407, 2168227, 1148955, 14792097],
  table: [8251682, 12277213, 34658646, 11112739],
  lamp: [6825324, 1643280, 34237532],
  desklamp: [1112598, 1122530, 33375682, 8263851],
  shelf: [7055956, 4503943, 3664343, 19109111],
  bag: [10566057, 3185223],
  jacket: [16428589, 7679725, 7679454, 16390583],
  books: [5009179, 33283, 19208445, 16009657],
  textile: [8762879, 9316208, 8266834],
  metal: [10945653, 15602670],
};

const RULES = [
  [/lamp.*(industrial|desk|metal)|industrial.*lamp|desk lamp/i, "desklamp"],
  [/lamp|light/i, "lamp"],
  [/shelf|shelves|rack|wall decor/i, "shelf"],
  [/drawer|chest|dresser/i, "chest"],
  [/cabinet|console|sideboard|cupboard/i, "cabinet"],
  [/chair|stool|bench|sofa|armchair/i, "chair"],
  [/table|desk/i, "table"],
  [/bag|tote|purse|backpack/i, "bag"],
  [/jacket|shirt|denim|clothing|coat|dress|kurta|saree/i, "jacket"],
  [/book|novel/i, "books"],
  [/metal|iron|steel|decor/i, "metal"],
  [/textile|cushion|pillow|quilt|fabric|rug/i, "textile"],
];

const hash = (s) =>
  [...String(s)].reduce(
    (h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0,
    7,
  );

export function photoKey(text = "", category = "") {
  const hit =
    RULES.find(([re]) => re.test(text)) ||
    RULES.find(([re]) => re.test(category));
  return hit
    ? hit[1]
    : category === "Books"
      ? "books"
      : category === "Clothing" || category === "Fashion"
        ? "jacket"
        : "cabinet";
}

export function photoFor(text = "", category = "", salt = "") {
  const ids = PHOTO_BANK[photoKey(text, category)];
  return px(ids[hash(`${text}|${salt}`) % ids.length]);
}
