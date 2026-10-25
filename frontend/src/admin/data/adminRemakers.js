/* =========================================================
   DUMMY DATA — Admin › ReMakers
   UI only. No backend. Shapes follow the database notes:
   ReMakers, ReMaker_Profile, ReMaker_Portfolio,
   ReMaker_Products, Refurbishments, Orders, ReMaker_Reviews,
   Reports.
   ========================================================= */

function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (random, list) => list[Math.floor(random() * list.length)];
const between = (random, min, max) =>
  min + Math.floor(random() * (max - min + 1));
/* Dummy dates never run past "today" (18 Oct 2026): anything later is
   pulled back to a recent day so lists never show the future. */
const LATEST = new Date("2026-10-18T12:00:00");
function addDays(iso, days) {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  if (date > LATEST) {
    const back = new Date(LATEST);
    back.setDate(back.getDate() - (Math.abs(days) % 25));
    back.setHours(8 + (Math.abs(days) % 9), 15);
    return back.toISOString();
  }
  return date.toISOString();
}

const NOW = "2026-10-18T10:00:00";

/* ---------- pools ---------- */

const PRODUCT_POOL = [
  {
    title: "Reclaimed Wood Lamp",
    category: "Home Decor",
    price: 1249,
    image: "/images/products/ceramic-lamp.jpg",
  },
  {
    title: "Refurbished Study Chair",
    category: "Furniture",
    price: 3199,
    image: "/images/products/vintage-chair.jpg",
  },
  {
    title: "Rustic Coffee Table",
    category: "Furniture",
    price: 5400,
    image: "/images/products/wooden-table.jpg",
  },
  {
    title: "Teak Offcut Organizer",
    category: "Home Decor",
    price: 699,
    image: "/images/products/teak-drawer-chest.jpg",
  },
  {
    title: "Upcycled Denim Tote",
    category: "Fashion",
    price: 749,
    image: "/images/portfolio/priya-bag.jpg",
  },
  {
    title: "Patchwork Denim Jacket",
    category: "Fashion",
    price: 1899,
    image: "/images/portfolio/priya-jacket.jpg",
  },
  {
    title: "Metal Pipe Wall Shelf",
    category: "Furniture",
    price: 2650,
    image: "/images/portfolio/arjun-shelf.jpg",
  },
  {
    title: "Industrial Metal Stool",
    category: "Furniture",
    price: 2200,
    image: "/images/portfolio/arjun-metal.jpg",
  },
  {
    title: "Teak Console Table",
    category: "Furniture",
    price: 7800,
    image: "/images/portfolio/tara-console.jpg",
  },
  {
    title: "Glass Jar Planters (set of 3)",
    category: "Home Decor",
    price: 899,
    image: "/images/products/default-item.jpg",
  },
  {
    title: "Cane Weave Side Table",
    category: "Furniture",
    price: 3400,
    image: "/images/products/default-item.jpg",
  },
  {
    title: "Saree Cushion Covers (set of 4)",
    category: "Home Decor",
    price: 1100,
    image: "/images/products/default-item.jpg",
  },
];

const MATERIAL_POOL = [
  "Old Teak Wardrobe",
  "Denim Jackets Bundle",
  "Cotton Sarees (6)",
  "Steel Bookshelf",
  "Brass Cooking Pots",
  "Carved Window Frames",
  "Glass Jars Set (12)",
  "Wooden Study Chair",
];

const BUYERS = [
  "Aarav Patel",
  "Meera Iyer",
  "Kabir Verma",
  "Nisha Rao",
  "Anaya Singh",
  "Dev Joshi",
  "Ishita Nair",
  "Saanvi Reddy",
  "Diya Menon",
];
const PAYMENT_METHODS = ["UPI", "CARD", "NET_BANKING", "WALLET", "COD"];
const PRODUCT_REVIEWS = [
  "The finish is beautiful and you can tell this was made with care. Packed very well too.",
  "Exactly like the photos. Sturdy, well built and a great conversation piece.",
  "Lovely craftsmanship. Delivery took a couple of days longer than promised but worth the wait.",
  "Good value for an upcycled piece. Small scratch near one edge, otherwise perfect.",
  "Bought this as a gift and it was a hit. The story behind the piece made it special.",
  "Great communication from the maker and the quality exceeded my expectations.",
];
const NOTES = [
  "Sanded, re-stained and rewired. Frame was solid.",
  "Fabric panels cleaned and re-stitched with a patchwork pattern.",
  "Rust removed, powder-coated and fitted with new fasteners.",
  "Joints reinforced and the surface sealed with natural oil.",
];
const REPORT_REASONS = [
  {
    type: "ReMaker",
    reason: "Delayed delivery",
    description:
      "Buyer says the product arrived two weeks after the promised date.",
  },
  {
    type: "Product",
    reason: "Not as described",
    description: "Finish and size differ from the listing photos.",
  },
  {
    type: "Review",
    reason: "Unfair review",
    description: "ReMaker believes a review was posted by a competitor.",
  },
  {
    type: "Other",
    reason: "Payment dispute",
    description: "Customer claims they were charged twice for one product.",
  },
];

/* before / after pairs we really have images for */
const PORTFOLIO_REAL = {
  priya: [
    {
      title: "Denim to Tote",
      description:
        "Worn-out denim turned into a sturdy everyday tote with leather handles.",
      before: "/images/portfolio/before-priya-bag.jpg",
      after: "/images/portfolio/priya-bag.jpg",
    },
    {
      title: "Patchwork Jacket",
      description: "Three old jackets stitched into one statement piece.",
      before: "/images/portfolio/before-priya-jacket.jpg",
      after: "/images/portfolio/priya-jacket.jpg",
    },
    {
      title: "Home Textile Set",
      description: "Saree offcuts became cushion covers and table runners.",
      before: "/images/portfolio/before-priya-home.jpg",
      after: "/images/portfolio/priya-home.jpg",
    },
  ],
  arjun: [
    {
      title: "Lamp Revival",
      description: "A broken fixture rewired and finished in brushed brass.",
      before: "/images/portfolio/before-arjun-lamp.jpg",
      after: "/images/portfolio/arjun-lamp.jpg",
    },
    {
      title: "Rust to Stool",
      description: "Rusted pipes cleaned and powder-coated into a stool.",
      before: "/images/portfolio/before-arjun-metal.jpg",
      after: "/images/portfolio/arjun-metal.jpg",
    },
    {
      title: "Pipe Shelf",
      description: "Scrap pipe and plank turned into a wall shelf.",
      before: "/images/portfolio/before-arjun-shelf.jpg",
      after: "/images/portfolio/arjun-shelf.jpg",
    },
  ],
  tara: [
    {
      title: "Chair Restoration",
      description: "A cracked teak chair rebuilt and re-caned.",
      before: "/images/portfolio/before-tara-chair.jpg",
      after: "/images/portfolio/tara-chair.jpg",
    },
    {
      title: "Console from Door",
      description: "An old carved door became a console table.",
      before: "/images/portfolio/before-tara-console.jpg",
      after: "/images/portfolio/tara-console.jpg",
    },
    {
      title: "Teak Cabinet",
      description: "Water-damaged cabinet restored to its original glow.",
      before: "/images/portfolio/before-tara-teak-cabinet.jpg",
      after: "/images/portfolio/tara-teak-cabinet.jpg",
    },
  ],
};

/* ---------- the people ---------- */
const PEOPLE = [
  {
    key: "priya",
    name: "Popular Artist",
    art: "Thread & Loom",
    email: "popular-artist@gmail.com",
    provider: "email",
    status: "Active",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380009",
    joined: "2025-01-14T10:00:00",
    image: "/images/remakers/popular-artist.jpg",
    level: 5,
    skills: ["Textile upcycling", "Patchwork", "Hand stitching"],
    years: 6,
    certs: ["Certified Sustainable Designer"],
    bio: "Turning worn denim and sarees into everyday pieces people love to use. Zero-waste studio.",
  },
  {
    key: "arjun",
    name: "Nivya Maniyar",
    art: "Iron & Ember",
    email: "nivya-maniyar@gmail.com",
    provider: "google",
    status: "Active",
    city: "Surat",
    state: "Gujarat",
    pincode: "411001",
    joined: "2025-02-03T11:30:00",
    image: "/images/remakers/nivya-maniyar.jpg",
    level: 5,
    skills: ["Metalwork", "Powder coating", "Lighting"],
    years: 9,
    certs: ["Welding Level 2", "Electrical Safety"],
    bio: "Industrial scrap becomes furniture and lighting. Every piece is rebuilt to last another decade.",
  },
  {
    key: "tara",
    name: "Messy Mirror",
    art: "Teak Tales",
    email: "messy-mirror@gmail.com",
    provider: "email",
    status: "Active",
    city: "Vadodara",
    state: "Gujarat",
    pincode: "700019",
    joined: "2025-02-20T09:15:00",
    image: "/images/remakers/messy-mirror.jpg",
    level: 5,
    skills: ["Furniture restoration", "Wood finishing", "Cane weaving"],
    years: 12,
    certs: ["Heritage Wood Restoration"],
    bio: "Restoring teak and rosewood heirlooms with traditional joinery and natural finishes.",
  },
  {
    name: "Nivya Maniar",
    art: "Reweave Studio",
    email: "nivya-maniar@gmail.com",
    provider: "google",
    status: "Active",
    city: "Rajkot",
    state: "Gujarat",
    image: "/images/remakers/nivya-maniar.jpg",
    pincode: "302001",
    joined: "2025-04-08T14:00:00",
    level: 4,
    skills: ["Block printing", "Textile upcycling"],
    years: 4,
    certs: [],
    bio: "Block-printed home textiles made from saree offcuts.",
  },
  {
    name: "Dishank Prajapati",
    art: "Plank & Pivot",
    email: "dishank-prajapati@gmail.com",
    provider: "email",
    status: "Active",
    city: "Gandhinagar",
    state: "Gujarat",
    image: "/images/remakers/dishank-prajapati.jpg",
    pincode: "110017",
    joined: "2025-04-25T12:20:00",
    level: 4,
    skills: ["Pallet furniture", "Carpentry"],
    years: 7,
    certs: ["Carpentry Diploma"],
    bio: "Pallet wood and packing crates reborn as modern furniture.",
  },
  {
    name: "Arijit Singh",
    art: "Cane & Co.",
    email: "arijit-singh@gmail.com",
    provider: "email",
    status: "Active",
    city: "Bhavnagar",
    state: "Gujarat",
    image: "/images/remakers/arijit-singh.jpg",
    pincode: "682016",
    joined: "2025-05-12T16:45:00",
    level: 4,
    skills: ["Cane weaving", "Coir crafts"],
    years: 10,
    certs: [],
    bio: "Traditional Kerala cane weaving applied to rescued furniture.",
  },
  {
    name: "Shreya Ghoshal",
    art: "Glass Garden",
    email: "shreya-ghoshal@gmail.com",
    provider: "google",
    status: "Suspended",
    city: "Jamnagar",
    state: "Gujarat",
    image: "/images/remakers/shreya-ghoshal.jpg",
    pincode: "422005",
    joined: "2025-06-01T10:10:00",
    level: 3,
    skills: ["Glass upcycling", "Planters"],
    years: 3,
    certs: [],
    bio: "Bottles and jars turned into planters and lamps.",
  },
  {
    name: "Diljit Dosanjh",
    art: "Second Stitch",
    email: "diljit-dosanjh@gmail.com",
    provider: "email",
    status: "Active",
    city: "Anand",
    state: "Gujarat",
    image: "/images/remakers/diljit-dosanjh.jpg",
    pincode: "560034",
    joined: "2025-06-19T13:30:00",
    level: 3,
    skills: ["Denim upcycling", "Bags"],
    years: 5,
    certs: ["Fashion Design Diploma"],
    bio: "Denim and cotton remade into bags, aprons and accessories.",
  },
  {
    name: "A. R. Rahman",
    art: "Rustic Root",
    email: "a-r-rahman@gmail.com",
    provider: "email",
    status: "Blocked",
    city: "Nadiad",
    state: "Gujarat",
    image: "/images/remakers/a-r-rahman.jpg",
    pincode: "226010",
    joined: "2025-07-07T11:00:00",
    level: 2,
    skills: ["Wood finishing"],
    years: 2,
    certs: [],
    bio: "Rustic finishes on reclaimed timber.",
  },
  {
    name: "Sonu Nigam",
    art: "Patchwork Nest",
    email: "sonu-nigam@gmail.com",
    provider: "google",
    status: "Active",
    city: "Junagadh",
    state: "Gujarat",
    image: "/images/remakers/sonu-nigam.jpg",
    pincode: "700091",
    joined: "2025-08-02T15:40:00",
    level: 3,
    skills: ["Quilting", "Textile upcycling"],
    years: 6,
    certs: [],
    bio: "Quilts and throws sewn from family fabric scraps.",
  },
  {
    name: "Neha Kakkar",
    art: "Scrap to Style",
    email: "neha-kakkar@gmail.com",
    provider: "email",
    status: "Active",
    city: "Morbi",
    state: "Gujarat",
    image: "/images/remakers/neha-kakkar.jpg",
    pincode: "160017",
    joined: "2025-08-29T09:50:00",
    level: 3,
    skills: ["Metalwork", "Furniture design"],
    years: 8,
    certs: ["Welding Level 1"],
    bio: "Furniture from scrap steel and salvaged timber.",
  },
  {
    name: "Pritam Chakraborty",
    art: "Studio Aditi",
    email: "pritam-chakraborty@gmail.com",
    provider: "email",
    status: "Deleted",
    city: "Mehsana",
    state: "Gujarat",
    image: "/images/remakers/pritam-chakraborty.jpg",
    pincode: "500034",
    joined: "2025-09-15T10:25:00",
    level: 1,
    skills: ["Home decor"],
    years: 1,
    certs: [],
    bio: "Small-batch home decor.",
  },
  {
    name: "Badshah",
    art: "Wood Whisper",
    email: "badshah@gmail.com",
    provider: "email",
    status: "Active",
    city: "Bharuch",
    state: "Gujarat",
    image: "/images/remakers/badshah.jpg",
    pincode: "411004",
    joined: "2025-10-11T12:15:00",
    level: 2,
    skills: ["Wood carving", "Toys"],
    years: 4,
    certs: [],
    bio: "Hand-carved toys and decor from furniture offcuts.",
  },
  {
    name: "Sunidhi Chauhan",
    art: "Loop Lane",
    email: "sunidhi-chauhan@gmail.com",
    provider: "google",
    status: "Suspended",
    city: "Navsari",
    state: "Gujarat",
    image: "/images/remakers/sunidhi-chauhan.jpg",
    pincode: "400053",
    joined: "2025-11-03T14:55:00",
    level: 2,
    skills: ["Crochet", "Yarn upcycling"],
    years: 3,
    certs: [],
    bio: "Crochet pieces made from reclaimed yarn.",
  },
  {
    name: "Vishal Dadlani",
    art: "Brass Bloom",
    email: "vishal-dadlani@gmail.com",
    provider: "email",
    status: "Active",
    city: "Valsad",
    state: "Gujarat",
    image: "/images/remakers/vishal-dadlani.jpg",
    pincode: "680001",
    joined: "2026-01-21T11:10:00",
    level: 2,
    skills: ["Brass polishing", "Lighting"],
    years: 5,
    certs: [],
    bio: "Old brass vessels re-made into lamps and planters.",
  },
  {
    name: "Amit Trivedi",
    art: "Fresh Fibre",
    email: "amit-trivedi@gmail.com",
    provider: "email",
    status: "Active",
    city: "Palanpur",
    state: "Gujarat",
    image: "/images/remakers/amit-trivedi.jpg",
    pincode: "403001",
    joined: "2026-06-09T10:00:00",
    level: 1,
    skills: ["Natural dyeing", "Textile upcycling"],
    years: 2,
    certs: [],
    bio: "Naturally dyed textile pieces from reclaimed cotton.",
  },
];

/* ---------- builders ---------- */

function buildPortfolio(random, rid, person, joined) {
  const real = PORTFOLIO_REAL[person.key];
  if (real) {
    return real.map((entry, i) => ({
      portfolio_id: `PF-${rid.slice(4)}${i + 1}`,
      title: entry.title,
      description: entry.description,
      before_image: entry.before,
      after_image: entry.after,
      uploaded_at: addDays(joined, 40 + i * 55),
    }));
  }
  const count =
    person.level >= 3 ? between(random, 1, 3) : between(random, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const product = pick(random, PRODUCT_POOL);
    return {
      portfolio_id: `PF-${rid.slice(4)}${i + 1}`,
      title: product.title,
      description: `Rebuilt from ${pick(random, MATERIAL_POOL).toLowerCase()} using traditional methods.`,
      before_image: "/images/products/default-item.jpg",
      after_image: product.image,
      uploaded_at: addDays(joined, between(random, 30, 240)),
    };
  });
}

function buildProducts(random, rid, count, joined, status) {
  const products = [];
  for (let i = 0; i < count; i += 1) {
    const base =
      PRODUCT_POOL[(i * 5 + Math.floor(random() * 4)) % PRODUCT_POOL.length];
    const own = random() > 0.7;
    let productStatus = pick(random, [
      "Listed",
      "Listed",
      "Listed",
      "Listed",
      "Sold_Out",
      "Draft",
      "Inactive",
    ]);
    if (status === "Blocked" || status === "Deleted")
      productStatus = "Inactive";
    products.push({
      product_id: `PRD-${rid.slice(4)}${i + 1}`,
      title: base.title,
      category: base.category,
      image: base.image,
      price: base.price + between(random, -2, 4) * 50,
      stock: productStatus === "Sold_Out" ? 0 : between(random, 1, 12),
      status: productStatus,
      source_item: own
        ? null
        : `ITM-${between(random, 1001, 1024)}${between(random, 1, 5)}`,
      created_at: addDays(joined, between(random, 20, 250)),
    });
  }
  return products;
}

function paymentFor(status, random) {
  if (status === "Completed" || status === "Confirmed") return "Success";
  if (status === "Returned") return "Refunded";
  if (status === "Cancelled") return random() > 0.5 ? "Refunded" : "Failed";
  return "Pending";
}

function buildOrders(random, rid, products, sales, purchases, joined) {
  const orders = [];
  let counter = 1;
  for (let i = 0; i < sales; i += 1) {
    const product = products.length
      ? pick(random, products)
      : pick(random, PRODUCT_POOL);
    const status = pick(random, [
      "Completed",
      "Completed",
      "Completed",
      "Confirmed",
      "Pending",
      "Cancelled",
      "Returned",
    ]);
    orders.push({
      order_id: `ORD-${rid.slice(4)}${String(counter).padStart(2, "0")}`,
      role: "Seller",
      title: product.title,
      image: product.image,
      counterparty: pick(random, BUYERS),
      counterparty_type: "User",
      amount: product.price,
      order_status: status,
      payment_method: pick(random, PAYMENT_METHODS),
      payment_status: paymentFor(status, random),
      order_date: addDays(joined, between(random, 25, 260)),
    });
    counter += 1;
  }
  for (let i = 0; i < purchases; i += 1) {
    const material = pick(random, MATERIAL_POOL);
    const status = pick(random, [
      "Completed",
      "Completed",
      "Confirmed",
      "Pending",
    ]);
    const fromAdmin = random() > 0.4;
    orders.push({
      order_id: `ORD-${rid.slice(4)}${String(counter).padStart(2, "0")}`,
      role: "Buyer",
      title: material,
      image: "/images/products/default-item.jpg",
      counterparty: fromAdmin ? "ReOrbit Platform" : pick(random, BUYERS),
      counterparty_type: fromAdmin ? "Admin" : "User",
      amount: between(random, 4, 40) * 100,
      order_status: status,
      payment_method: pick(random, PAYMENT_METHODS),
      payment_status: paymentFor(status, random),
      order_date: addDays(joined, between(random, 15, 240)),
    });
    counter += 1;
  }
  return orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
}

function buildRefurbishments(random, rid, count, joined) {
  return Array.from({ length: count }, (_, i) => {
    const status = pick(random, [
      "Completed",
      "Completed",
      "In_Progress",
      "Assigned",
    ]);
    const assigned = addDays(joined, between(random, 30, 240));
    const started =
      status === "Assigned" ? null : addDays(assigned, between(random, 1, 4));
    const done =
      status === "Completed" ? addDays(started, between(random, 5, 20)) : null;
    const product = pick(random, PRODUCT_POOL);
    return {
      refurbishment_id: `RF-${rid.slice(4)}${i + 1}`,
      item_id: `ITM-${between(random, 1001, 1024)}${between(random, 1, 5)}`,
      title: pick(random, MATERIAL_POOL),
      assigned_date: assigned,
      start_date: started,
      completion_date: done,
      quality_status:
        status === "Completed"
          ? pick(random, ["Passed", "Passed", "Passed", "Failed"])
          : "Pending",
      refurbishment_status: status,
      before_image: "/images/products/default-item.jpg",
      after_image: status === "Completed" ? product.image : null,
      notes: pick(random, NOTES),
      assigned_by: "Admin · Nikhil Rao",
    };
  }).sort((a, b) => new Date(b.assigned_date) - new Date(a.assigned_date));
}

function buildReviews(random, count, joined, products) {
  return Array.from({ length: count }, (_, i) => {
    const rating = pick(random, [5, 5, 5, 4, 4, 3, 2]);
    return {
      review_id: `RV-${i + 1}`,
      reviewer: pick(random, BUYERS),
      product: products.length ? pick(random, products).title : "General",
      rating,
      text:
        rating <= 3
          ? "Took longer than expected and the finish had a few rough spots."
          : pick(random, PRODUCT_REVIEWS),
      created_at: addDays(joined, between(random, 40, 280)),
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function buildReports(random, status, joined) {
  const reports = [];
  const against =
    status === "Blocked"
      ? 2
      : status === "Suspended"
        ? 1
        : random() > 0.8
          ? 1
          : 0;
  for (let i = 0; i < against; i += 1) {
    const reason = pick(random, REPORT_REASONS);
    reports.push({
      report_id: `RP-${between(random, 100, 999)}`,
      direction: "Against this ReMaker",
      other_party: pick(random, BUYERS),
      report_type: reason.type,
      reason: reason.reason,
      description: reason.description,
      status: pick(
        random,
        status === "Active"
          ? ["Pending", "Reviewed"]
          : ["Resolved", "Reviewed", "Pending"],
      ),
      created_at: addDays(joined, between(random, 60, 260)),
    });
  }
  if (random() > 0.75) {
    const reason = pick(random, REPORT_REASONS);
    reports.push({
      report_id: `RP-${between(random, 100, 999)}`,
      direction: "Filed by this ReMaker",
      other_party: pick(random, BUYERS),
      report_type: "User",
      reason: "Abusive messages",
      description:
        "Customer sent rude messages after a custom order was declined.",
      status: pick(random, ["Resolved", "Rejected", "Pending"]),
      created_at: addDays(joined, between(random, 60, 260)),
    });
  }
  return reports.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
}

function buildActivity(rm) {
  const events = [
    { type: "account", text: "Joined ReOrbit as a ReMaker", at: rm.created_at },
  ];
  rm.portfolio
    .slice(0, 2)
    .forEach((p) =>
      events.push({
        type: "item",
        text: `Added “${p.title}” to portfolio`,
        at: p.uploaded_at,
      }),
    );
  rm.products
    .slice(0, 2)
    .forEach((p) =>
      events.push({
        type: "item",
        text: `Listed product “${p.title}”`,
        at: p.created_at,
      }),
    );
  rm.orders.slice(0, 3).forEach((o) =>
    events.push({
      type: "order",
      text:
        o.role === "Seller"
          ? `Sold “${o.title}” to ${o.counterparty} (${o.order_id})`
          : `Bought “${o.title}” (${o.order_id})`,
      at: o.order_date,
    }),
  );
  rm.refurbishments
    .slice(0, 2)
    .forEach((r) =>
      events.push({
        type: "donation",
        text: `Refurbishment ${r.refurbishment_id} ${r.refurbishment_status === "Completed" ? "completed" : "assigned"}`,
        at: r.completion_date || r.assigned_date,
      }),
    );
  return events.sort((a, b) => new Date(b.at) - new Date(a.at));
}

/* ---------- assemble ---------- */

function buildRemakers() {
  return PEOPLE.map((person, index) => {
    const random = createRandom(9100 + index * 173);
    const rid = `RMK-${2001 + index}`;
    const level = person.level;

    const products = buildProducts(
      random,
      rid,
      level === 1 ? between(random, 0, 2) : between(random, 2, level + 3),
      person.joined,
      person.status,
    );
    const sales =
      level === 1 ? between(random, 0, 2) : between(random, 2, level * 2 + 1);
    const purchases = between(random, 0, 3);
    const orders = buildOrders(
      random,
      rid,
      products,
      sales,
      purchases,
      person.joined,
    );
    const portfolio = buildPortfolio(random, rid, person, person.joined);
    const refurbishments = buildRefurbishments(
      random,
      rid,
      level >= 2 ? between(random, 1, 4) : between(random, 0, 1),
      person.joined,
    );
    const reviews = buildReviews(
      random,
      level >= 3 ? between(random, 3, 7) : between(random, 0, 2),
      person.joined,
      products,
    );
    const reports = buildReports(random, person.status, person.joined);

    const earned = orders
      .filter(
        (o) =>
          o.role === "Seller" &&
          ["Completed", "Confirmed"].includes(o.order_status),
      )
      .reduce((sum, o) => sum + o.amount, 0);
    const spent = orders
      .filter(
        (o) =>
          o.role === "Buyer" &&
          ["Completed", "Confirmed"].includes(o.order_status),
      )
      .reduce((sum, o) => sum + o.amount, 0);
    const rating = reviews.length
      ? Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
        ) / 10
      : 0;

    const rm = {
      remaker_id: rid,
      username: person.art,
      full_name: person.name,
      email: person.email,
      auth_provider: person.provider,
      google_id:
        person.provider === "google"
          ? `g-${between(random, 10000000, 99999999)}`
          : null,
      status: person.status,
      created_at: person.joined,
      updated_at: addDays(person.joined, between(random, 10, 200)),
      last_active:
        person.status === "Active"
          ? addDays("2026-10-18T09:00:00", -between(random, 0, 9))
          : addDays("2026-10-18T09:00:00", -between(random, 20, 120)),
      followers:
        person.status === "Deleted" ? 0 : between(random, 12, level * 90),
      rating,
      profile: {
        profile_image: person.image || null,
        phone: `+91 9${between(random, 1000, 9999)}${between(random, 10000, 99999)}`,
        address: `${between(random, 4, 220)}, ${pick(random, ["Studio Lane", "Craft Colony", "Workshop Road", "Artisan Street", "Heritage Nagar"])}`,
        city: person.city,
        state: person.state,
        pincode: person.pincode,
        bio: person.bio,
        skills: person.skills,
        experience: `${person.years} year${person.years === 1 ? "" : "s"}`,
        certification: person.certs,
        total_uploads: products.length,
        total_sales: orders.filter((o) => o.role === "Seller").length,
        total_purchases: orders.filter((o) => o.role === "Buyer").length,
        environmental_impact:
          Math.round(
            (refurbishments.length * 14.5 +
              products.length * 6.8 +
              sales * 3.2) *
              10,
          ) / 10,
      },
      totals: { earned, spent },
      portfolio,
      products,
      orders,
      refurbishments,
      reviews,
      reports,
      statusHistory: [],
    };

    if (person.status !== "Active") {
      const reasons = {
        Suspended:
          "Several buyers reported delayed deliveries and unanswered messages.",
        Blocked:
          "Repeated policy violations: products sold did not match listings.",
        Deleted: "Account deleted at the ReMaker's own request.",
      };
      rm.statusHistory.push({
        id: `${rid}-h1`,
        action: person.status,
        reason: reasons[person.status],
        by:
          person.status === "Deleted"
            ? "ReMaker request"
            : "Admin · Nikhil Rao",
        at: addDays(NOW, -between(random, 8, 70)),
      });
    }

    rm.activity = buildActivity(rm);
    return rm;
  });
}

export const INITIAL_REMAKERS = buildRemakers();
