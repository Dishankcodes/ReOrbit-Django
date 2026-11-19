/* Skills a ReMaker can tap to add on their profile, picked from what they say they make
   (their speciality). Each set has 15; the general set fills in when nothing matches. */

const SETS = {
  wood: ["Upcycled furniture", "Wood restoration", "Carpentry", "Pallet furniture", "Wood carving",
    "Sanding and refinishing", "Teak and sheesham work", "Furniture repair", "Wood polishing",
    "Joinery", "Shelves and storage", "Reclaimed wood décor", "Chair re-caning", "Wood burning art", "Door and window reuse"],
  textile: ["Upcycled clothing", "Patchwork", "Quilting", "Embroidery", "Block printing", "Saree upcycling",
    "Tote bag making", "Denim reuse", "Macramé", "Tailoring and alterations", "Natural dyeing",
    "Hand stitching", "Rug weaving", "Cushion covers", "Kantha work"],
  metal: ["Metal upcycling", "Welding", "Scrap metal art", "Brass and copper polishing", "Lamp making",
    "Rust restoration", "Wire craft", "Tin can art", "Bicycle part furniture", "Sheet metal work",
    "Industrial décor", "Metal painting", "Hardware restoration", "Candle holders", "Wall hooks and racks"],
  glass: ["Bottle upcycling", "Glass cutting", "Bottle lamps", "Glass painting", "Terrariums",
    "Mosaic art", "Jar storage", "Candle making", "Stained glass", "Glass etching", "Vases from bottles",
    "Fairy light décor", "Resin and glass", "Window reuse", "Kitchen jars"],
  paper: ["Paper craft", "Handmade paper", "Papier-mâché", "Book binding", "Newspaper baskets",
    "Gift wrapping", "Origami", "Cardboard furniture", "Journals from scrap", "Quilling",
    "Collage art", "Paper lamps", "Calligraphy", "Seed paper", "Card making"],
  plastic: ["Plastic upcycling", "Eco-bricks", "Bottle planters", "Plastic weaving", "Tyre furniture",
    "Pot and planter making", "Recycled plastic jewellery", "Bag making from packets", "Garden décor",
    "Fused plastic", "Bottle cap art", "Crate furniture", "Outdoor seating", "Toy making", "Storage boxes"],
  clay: ["Pottery", "Ceramic repair", "Kintsugi", "Terracotta painting", "Planters", "Hand building",
    "Glazing", "Mosaic from broken tiles", "Diya making", "Clay jewellery", "Tableware",
    "Sculpting", "Tile art", "Matka painting", "Wall plates"],
  leather: ["Leather upcycling", "Bag repair", "Wallet making", "Belt making", "Leather stitching",
    "Shoe repair", "Leather dyeing", "Jacket reuse", "Key chains", "Laptop sleeves",
    "Hand tooling", "Strap making", "Leather patches", "Book covers", "Card holders"],
  general: ["Upcycling", "Restoration", "Repair", "Hand painting", "Home décor", "Furniture makeover",
    "Lamp making", "Planters", "Gift items", "Custom orders", "Wall art", "Storage solutions",
    "Sustainable design", "Product photography", "Workshops and teaching"],
};

const KEYWORDS = [
  ["wood", /wood|furnit|teak|carpent|pallet|timber|sheesham|chair|table/i],
  ["textile", /textile|fabric|cloth|sari|saree|denim|sew|stitch|tailor|embroider|weav|quilt|garment/i],
  ["metal", /metal|iron|brass|copper|steel|weld|scrap|tin|wire/i],
  ["glass", /glass|bottle|jar|candle/i],
  ["paper", /paper|book|card|origami|cardboard/i],
  ["plastic", /plastic|tyre|tire|eco.?brick|crate/i],
  ["clay", /clay|pot|ceramic|terracotta|tile/i],
  ["leather", /leather|shoe|wallet|belt/i],
];

/* up to 15 ideas for this speciality (and bio), leaving out skills already added */
export function skillIdeas(speciality = "", bio = "", have = []) {
  const text = `${speciality} ${bio}`;
  const matched = KEYWORDS.filter(([, re]) => re.test(text)).map(([k]) => k);
  const pool = [...matched.flatMap((k) => SETS[k]), ...SETS.general];
  const taken = new Set(have.map((s) => s.toLowerCase()));
  return [...new Set(pool)].filter((s) => !taken.has(s.toLowerCase())).slice(0, 15);
}
