/* =========================================================
   DUMMY DATA — Admin › Users
   UI only. No backend. Shapes follow the database notes:
   Users, User_Profile, Items, Orders, Transactions,
   Donations, Pickup_Requests, Wishlist, Reviews, Reports.

   When the backend is ready, replace the functions at the
   bottom (buildUsers) with API calls — the pages only read
   the shapes below.
   ========================================================= */

/* ---------- tiny seeded random so the dummy data never changes ---------- */
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

/* ---------- reference pools ---------- */

const ITEM_POOL = [
  {
    title: "Vintage Teak Drawer Chest",
    category: "Furniture",
    image: "/images/products/teak-drawer-chest.jpg",
    price: 6500,
  },
  {
    title: "Ceramic Table Lamp",
    category: "Home Decor",
    image: "/images/products/ceramic-lamp.jpg",
    price: 1200,
  },
  {
    title: "Wooden Study Chair",
    category: "Furniture",
    image: "/images/products/vintage-chair.jpg",
    price: 2400,
  },
  {
    title: "Solid Wood Dining Table",
    category: "Furniture",
    image: "/images/products/wooden-table.jpg",
    price: 9800,
  },
  {
    title: "Denim Jackets Bundle (4)",
    category: "Clothing",
    image: "/images/products/default-item.jpg",
    price: 1800,
  },
  {
    title: "Old Laptop (working)",
    category: "Electronics",
    image: "/images/products/default-item.jpg",
    price: 7500,
  },
  {
    title: "Glass Jars Set (12)",
    category: "Kitchen",
    image: "/images/products/default-item.jpg",
    price: 650,
  },
  {
    title: "Steel Bookshelf",
    category: "Furniture",
    image: "/images/products/default-item.jpg",
    price: 3200,
  },
  {
    title: "Brass Cooking Pots",
    category: "Kitchen",
    image: "/images/products/default-item.jpg",
    price: 2100,
  },
  {
    title: "Children's Books Bundle",
    category: "Books",
    image: "/images/products/default-item.jpg",
    price: 500,
  },
  {
    title: "Cotton Sarees (6)",
    category: "Clothing",
    image: "/images/products/default-item.jpg",
    price: 2800,
  },
  {
    title: "Carved Window Frames",
    category: "Home Decor",
    image: "/images/products/default-item.jpg",
    price: 3600,
  },
  {
    title: "Kids Bicycle",
    category: "Sports",
    image: "/images/products/default-item.jpg",
    price: 1900,
  },
  {
    title: "Rattan Side Table",
    category: "Furniture",
    image: "/images/products/default-item.jpg",
    price: 2700,
  },
];

const REMAKER_PRODUCT_POOL = [
  {
    title: "Reclaimed Wood Lamp",
    price: 1249,
    image: "/images/products/ceramic-lamp.jpg",
    seller: "Priya Shah",
  },
  {
    title: "Upcycled Denim Tote",
    price: 749,
    image: "/images/products/default-item.jpg",
    seller: "Tara Bose",
  },
  {
    title: "Teak Offcut Organizer",
    price: 699,
    image: "/images/products/teak-drawer-chest.jpg",
    seller: "Arjun Mehta",
  },
  {
    title: "Refurbished Study Chair",
    price: 3199,
    image: "/images/products/vintage-chair.jpg",
    seller: "Arjun Mehta",
  },
  {
    title: "Glass Jar Planters (set of 3)",
    price: 899,
    image: "/images/products/default-item.jpg",
    seller: "Priya Shah",
  },
  {
    title: "Rustic Coffee Table",
    price: 5400,
    image: "/images/products/wooden-table.jpg",
    seller: "Tara Bose",
  },
];

const COUNTERPARTIES = [
  "Meera Iyer",
  "Kabir Verma",
  "Nisha Rao",
  "Rohan Shah",
  "Anaya Singh",
  "Dev Joshi",
  "Ishita Nair",
];

const PAYMENT_METHODS = ["UPI", "CARD", "NET_BANKING", "WALLET", "COD"];
const REJECTION_MESSAGES = [
  "Photos do not match the condition listed. Please re-upload clear images.",
  "Item condition was marked Good but the photos show major damage.",
  "Duplicate listing of an item already on the platform.",
];
const REVIEW_TEXT = [
  "Exactly as described. Packaging was careful and delivery was quick.",
  "Beautiful piece, you can tell it was restored with care. Would buy again.",
  "Good value for money. A small scratch that was not in the photos, but fine overall.",
  "Smooth pickup and a very polite seller. Highly recommended.",
  "Quality is decent, delivery took a little longer than promised.",
];
const REPORT_REASONS = [
  {
    type: "User",
    reason: "Abusive messages",
    description: "Sent rude messages after an order was cancelled.",
  },
  {
    type: "Item",
    reason: "Misleading condition",
    description: "Listing says Good condition but the item arrived worn.",
  },
  {
    type: "Review",
    reason: "Fake review",
    description: "Review looks copied from another listing.",
  },
  {
    type: "Login",
    reason: "Repeated login failures",
    description: "Multiple failed sign-in attempts from different cities.",
  },
  {
    type: "Other",
    reason: "Payment dispute",
    description: "Buyer claims payment was taken twice for one order.",
  },
];

/* ---------- the 24 people ----------
   level = how active the account is (drives how many records it has) */
const PEOPLE = [
  {
    name: "Dishank Prajapati",
    email: "dishank.prajapati@gmail.com",
    provider: "email",
    status: "Active",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    joined: "2025-02-11T09:30:00",
    image: "/images/users/dishank-prajapati.jpg",
    level: 5,
  },
  {
    name: "Nivya Maniyar",
    email: "nivya.maniyar@gmail.com",
    provider: "google",
    status: "Active",
    city: "Surat",
    state: "Gujarat",
    pincode: "600028",
    joined: "2025-03-04T14:10:00",
    image: "/images/users/nivya-maniyar.jpg",
    level: 5,
  },
  {
    name: "Messy Mirror - ReMaker",
    email: "messy.mirror.remaker@gmail.com",
    provider: "email",
    status: "Active",
    city: "Vadodara",
    state: "Gujarat",
    pincode: "110017",
    joined: "2025-03-29T11:05:00",
    image: "/images/users/messy-mirror-remaker.jpg",
    level: 4,
  },
  {
    name: "Narendra Modi",
    email: "narendra.modi@gmail.com",
    provider: "google",
    status: "Active",
    city: "Rajkot",
    state: "Gujarat",
    pincode: "560034",
    joined: "2025-04-17T16:45:00",
    image: "/images/users/narendra-modi.jpg",
    level: 4,
  },
  {
    name: "Amit Shah",
    email: "amit.shah@gmail.com",
    provider: "email",
    status: "Suspended",
    city: "Gandhinagar",
    state: "Gujarat",
    pincode: "395007",
    joined: "2025-05-02T10:20:00",
    image: "/images/users/amit-shah.jpg",
    level: 3,
  },
  {
    name: "Sumit Meraiya",
    email: "sumit.meraiya@gmail.com",
    provider: "google",
    status: "Active",
    city: "Bhavnagar",
    state: "Gujarat",
    pincode: "302001",
    joined: "2025-05-21T08:15:00",
    image: "/images/users/sumit-meraiya.jpg",
    level: 4,
  },
  {
    name: "Ranbir Kapoor",
    email: "ranbir.kapoor@gmail.com",
    provider: "email",
    status: "Active",
    city: "Jamnagar",
    state: "Gujarat",
    pincode: "411004",
    joined: "2025-06-09T13:00:00",
    level: 3,
  },
  {
    name: "Virat Kohli",
    email: "virat.kohli@gmail.com",
    provider: "email",
    status: "Active",
    city: "Anand",
    state: "Gujarat",
    pincode: "682016",
    joined: "2025-06-30T17:25:00",
    level: 3,
  },
  {
    name: "Arvind Kejriwal",
    email: "arvind.kejriwal@gmail.com",
    provider: "google",
    status: "Blocked",
    city: "Nadiad",
    state: "Gujarat",
    pincode: "400053",
    joined: "2025-07-12T12:40:00",
    image: "/images/users/arvind-kejriwal.jpg",
    level: 2,
  },
  {
    name: "Yogi Adityanath",
    email: "yogi.adityanath@gmail.com",
    provider: "email",
    status: "Active",
    city: "Junagadh",
    state: "Gujarat",
    pincode: "500034",
    joined: "2025-07-26T09:55:00",
    level: 4,
  },
  {
    name: "Harshad Mehta",
    email: "harshad.mehta@gmail.com",
    provider: "email",
    status: "Active",
    city: "Morbi",
    state: "Gujarat",
    pincode: "226010",
    joined: "2025-08-08T15:30:00",
    level: 2,
  },
  {
    name: "Ambani",
    email: "ambani@gmail.com",
    provider: "google",
    status: "Active",
    city: "Mehsana",
    state: "Gujarat",
    pincode: "695004",
    joined: "2025-08-23T11:20:00",
    image: "/images/users/ambani.jpg",
    level: 3,
  },
  {
    name: "Rahul Gandhi",
    email: "rahul.gandhi@gmail.com",
    provider: "email",
    status: "Suspended",
    city: "Bharuch",
    state: "Gujarat",
    pincode: "201301",
    joined: "2025-09-05T10:10:00",
    level: 2,
  },
  {
    name: "Priyanka Gandhi",
    email: "priyanka.gandhi@gmail.com",
    provider: "email",
    status: "Active",
    city: "Navsari",
    state: "Gujarat",
    pincode: "390007",
    joined: "2025-09-19T14:50:00",
    image: "/images/users/priyanka-gandhi.jpg",
    level: 3,
  },
  {
    name: "Shah Rukh Khan",
    email: "shah.rukh.khan@gmail.com",
    provider: "google",
    status: "Active",
    city: "Valsad",
    state: "Gujarat",
    pincode: "160017",
    joined: "2025-10-03T09:05:00",
    image: "/images/users/shah-rukh-khan.jpg",
    level: 2,
  },
  {
    name: "Deepika Padukone",
    email: "deepika.padukone@gmail.com",
    provider: "email",
    status: "Deleted",
    city: "Porbandar",
    state: "Gujarat",
    pincode: "110024",
    joined: "2025-10-27T16:35:00",
    image: "/images/users/deepika-padukone.jpg",
    level: 1,
  },
  {
    name: "Salman Khan",
    email: "salman.khan@gmail.com",
    provider: "email",
    status: "Active",
    city: "Palanpur",
    state: "Gujarat",
    pincode: "462016",
    joined: "2025-11-14T12:00:00",
    image: "/images/users/salman-khan.jpg",
    level: 2,
  },
  {
    name: "Aamir Khan",
    email: "aamir.khan@gmail.com",
    provider: "google",
    status: "Active",
    city: "Godhra",
    state: "Gujarat",
    pincode: "422005",
    joined: "2025-12-01T10:45:00",
    image: "/images/users/aamir-khan.jpg",
    level: 3,
  },
  {
    name: "Sachin Tendulkar",
    email: "sachin.tendulkar@gmail.com",
    provider: "email",
    status: "Blocked",
    city: "Dahod",
    state: "Gujarat",
    pincode: "122002",
    joined: "2025-12-18T18:20:00",
    image: "/images/users/sachin-tendulkar.jpg",
    level: 2,
  },
  {
    name: "Gautam Adani",
    email: "gautam.adani@gmail.com",
    provider: "email",
    status: "Active",
    city: "Amreli",
    state: "Gujarat",
    pincode: "452001",
    joined: "2026-01-09T09:25:00",
    image: "/images/users/gautam-adani.jpg",
    level: 2,
  },
  {
    name: "Ratan Tata",
    email: "ratan.tata@gmail.com",
    provider: "google",
    status: "Active",
    city: "Botad",
    state: "Gujarat",
    pincode: "403001",
    joined: "2026-02-02T13:40:00",
    image: "/images/users/ratan-tata.jpg",
    level: 2,
  },
  {
    name: "Nirmala Sitharaman",
    email: "nirmala.sitharaman@gmail.com",
    provider: "email",
    status: "Deleted",
    city: "Veraval",
    state: "Gujarat",
    pincode: "500081",
    joined: "2026-03-16T11:15:00",
    image: "/images/users/nirmala-sitharaman.jpg",
    level: 1,
  },
  {
    name: "Rajinikanth",
    email: "rajinikanth@gmail.com",
    provider: "email",
    status: "Active",
    city: "Patan",
    state: "Gujarat",
    pincode: "360001",
    joined: "2026-05-22T15:05:00",
    image: "/images/users/rajinikanth.jpg",
    level: 1,
  },
  {
    name: "Akshay Kumar",
    email: "akshay.kumar@gmail.com",
    provider: "google",
    status: "Active",
    city: "Surendranagar",
    state: "Gujarat",
    pincode: "700019",
    joined: "2026-09-08T10:30:00",
    image: "/images/users/akshay-kumar.jpg",
    level: 1,
  },
];
/* ---------- builders for each user's related records ---------- */

function buildItems(random, userId, count, joined, userStatus) {
  const items = [];
  for (let index = 0; index < count; index += 1) {
    const base =
      ITEM_POOL[(index * 3 + Math.floor(random() * 5)) % ITEM_POOL.length];
    const created = addDays(joined, between(random, 6, 160));
    const roll = random();

    let verification = "Verified";
    let itemStatus = pick(random, [
      "Listed",
      "Listed",
      "Listed",
      "Sold",
      "Reserved",
      "Warehouse",
      "Refurbishment",
      "Completed",
      "Donated",
    ]);
    let rejectionMessage = "";

    if (roll < 0.12) {
      verification = "Pending";
      itemStatus = "Draft";
    } else if (roll < 0.2 || (userStatus === "Blocked" && index === 0)) {
      verification = "Rejected";
      itemStatus = "Draft";
      rejectionMessage = pick(random, REJECTION_MESSAGES);
    }

    items.push({
      item_id: `ITM-${userId.slice(4)}${index + 1}`,
      title: base.title,
      category: base.category,
      image: base.image,
      condition: pick(random, ["Good", "Good", "Medium", "Worst"]),
      quantity: between(random, 1, 3),
      estimated_price: base.price + between(random, -3, 5) * 50,
      pickup_preference: pick(random, ["Self Pickup", "Managed by platform"]),
      verification_status: verification,
      item_status: itemStatus,
      rejection_message: rejectionMessage,
      created_at: created,
    });
  }
  return items;
}

function paymentFor(orderStatus, random) {
  if (orderStatus === "Completed") return "Success";
  if (orderStatus === "Confirmed") return "Success";
  if (orderStatus === "Returned") return "Refunded";
  if (orderStatus === "Cancelled")
    return random() > 0.5 ? "Refunded" : "Failed";
  return "Pending";
}

function buildOrders(random, userId, purchases, sales, joined) {
  const orders = [];
  let counter = 1;

  for (let index = 0; index < purchases; index += 1) {
    const product = pick(random, REMAKER_PRODUCT_POOL);
    const status = pick(random, [
      "Completed",
      "Completed",
      "Completed",
      "Confirmed",
      "Pending",
      "Cancelled",
      "Returned",
    ]);
    const fromAdmin = random() > 0.8;
    orders.push({
      order_id: `ORD-${userId.slice(4)}${String(counter).padStart(2, "0")}`,
      role: "Buyer",
      title: product.title,
      image: product.image,
      counterparty: fromAdmin ? "ReOrbit Platform" : product.seller,
      counterparty_type: fromAdmin ? "Admin" : "ReMaker",
      amount: product.price,
      order_status: status,
      payment_method: pick(random, PAYMENT_METHODS),
      payment_status: paymentFor(status, random),
      order_date: addDays(joined, between(random, 12, 200)),
    });
    counter += 1;
  }

  for (let index = 0; index < sales; index += 1) {
    const item = pick(random, ITEM_POOL);
    const status = pick(random, [
      "Completed",
      "Completed",
      "Confirmed",
      "Pending",
      "Cancelled",
    ]);
    const toAdmin = random() > 0.55;
    orders.push({
      order_id: `ORD-${userId.slice(4)}${String(counter).padStart(2, "0")}`,
      role: "Seller",
      title: item.title,
      image: item.image,
      counterparty: toAdmin ? "ReOrbit Platform" : pick(random, COUNTERPARTIES),
      counterparty_type: toAdmin ? "Admin" : "User",
      amount: item.price,
      order_status: status,
      payment_method: pick(random, PAYMENT_METHODS),
      payment_status: paymentFor(status, random),
      order_date: addDays(joined, between(random, 20, 220)),
    });
    counter += 1;
  }

  return orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
}

function buildDonations(random, userId, count, joined) {
  const donations = [];
  for (let index = 0; index < count; index += 1) {
    const item = pick(random, ITEM_POOL);
    const status = pick(random, [
      "Completed",
      "Completed",
      "Received",
      "Picked_Up",
      "Scheduled",
      "Pending",
    ]);
    /* open donations are recent; finished ones can be older */
    const donated =
      status === "Completed"
        ? addDays(joined, between(random, 15, 230))
        : addDays("2026-10-18T10:00:00", -between(random, 2, 20));
    const hasPickup = status !== "Pending";
    donations.push({
      donation_id: `DN-${userId.slice(4)}${index + 1}`,
      title: item.title,
      category: item.category,
      image: item.image,
      quantity: between(random, 1, 4),
      donation_date: donated,
      donation_status: status,
      pickup_date: hasPickup ? addDays(donated, between(random, 2, 6)) : null,
      pickup_slot: hasPickup
        ? pick(random, [
            "9:00 AM – 12:00 PM",
            "12:00 PM – 3:00 PM",
            "3:00 PM – 6:00 PM",
          ])
        : null,
      certificate: status === "Completed",
    });
  }
  return donations.sort(
    (a, b) => new Date(b.donation_date) - new Date(a.donation_date),
  );
}

function buildWishlist(random, count, joined) {
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    const isProduct = random() > 0.5;
    const source = isProduct
      ? pick(random, REMAKER_PRODUCT_POOL)
      : pick(random, ITEM_POOL);
    entries.push({
      wishlist_id: `WL-${index + 1}`,
      kind: isProduct ? "ReMaker product" : "Item",
      title: source.title,
      image: source.image,
      price: source.price,
      by: isProduct ? source.seller : "Community seller",
      added_at: addDays(joined, between(random, 5, 240)),
    });
  }
  return entries;
}

function buildReviews(random, count, joined) {
  const reviews = [];
  for (let index = 0; index < count; index += 1) {
    const isRemaker = random() > 0.65;
    const target = isRemaker
      ? pick(random, ["Priya Shah", "Arjun Mehta", "Tara Bose"])
      : pick(random, REMAKER_PRODUCT_POOL).title;
    reviews.push({
      review_id: `RV-${index + 1}`,
      kind: isRemaker ? "ReMaker" : "Product",
      target,
      rating: between(random, 3, 5),
      text: pick(random, REVIEW_TEXT),
      created_at: addDays(joined, between(random, 30, 240)),
    });
  }
  return reviews.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
}

function buildReports(random, status, joined) {
  const reports = [];
  const against =
    status === "Blocked"
      ? 2
      : status === "Suspended"
        ? 1
        : random() > 0.82
          ? 1
          : 0;
  for (let index = 0; index < against; index += 1) {
    const reason = pick(random, REPORT_REASONS);
    reports.push({
      report_id: `RP-${between(random, 100, 999)}`,
      direction: "Against this user",
      other_party: pick(random, COUNTERPARTIES),
      report_type: reason.type,
      reason: reason.reason,
      description: reason.description,
      status: pick(
        random,
        status === "Active"
          ? ["Pending", "Reviewed"]
          : ["Resolved", "Reviewed", "Pending"],
      ),
      created_at: addDays(joined, between(random, 60, 250)),
    });
  }
  if (random() > 0.78) {
    const reason = pick(random, REPORT_REASONS);
    reports.push({
      report_id: `RP-${between(random, 100, 999)}`,
      direction: "Filed by this user",
      other_party: pick(random, [
        "Priya Shah",
        "Arjun Mehta",
        "Community seller",
      ]),
      report_type: reason.type,
      reason: reason.reason,
      description: reason.description,
      status: pick(random, ["Resolved", "Rejected", "Pending"]),
      created_at: addDays(joined, between(random, 60, 250)),
    });
  }
  return reports.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );
}

function buildActivity(user, items, orders, donations) {
  const events = [
    { type: "account", text: "Created a ReOrbit account", at: user.created_at },
  ];
  items.slice(0, 3).forEach((item) =>
    events.push({
      type: "item",
      text: `Uploaded “${item.title}”`,
      at: item.created_at,
    }),
  );
  orders.slice(0, 3).forEach((order) =>
    events.push({
      type: "order",
      text:
        order.role === "Buyer"
          ? `Placed order ${order.order_id} for “${order.title}”`
          : `Sold “${order.title}” (${order.order_id})`,
      at: order.order_date,
    }),
  );
  donations.slice(0, 2).forEach((donation) =>
    events.push({
      type: "donation",
      text: `Donated “${donation.title}”`,
      at: donation.donation_date,
    }),
  );
  return events.sort((a, b) => new Date(b.at) - new Date(a.at));
}

/* ---------- assemble ---------- */

function buildUsers() {
  return PEOPLE.map((person, index) => {
    const random = createRandom(7000 + index * 131);
    const userId = `USR-${1001 + index}`;
    const level = person.level;

    const uploads =
      level === 1 ? between(random, 0, 2) : between(random, 1, level + 2);
    const purchases =
      level === 1 ? between(random, 0, 2) : between(random, 1, level + 2);
    const sales = level >= 3 ? between(random, 1, 4) : between(random, 0, 1);
    const donationCount =
      level >= 2 ? between(random, 1, 3) : between(random, 0, 1);

    const items = buildItems(
      random,
      userId,
      uploads,
      person.joined,
      person.status,
    );
    const orders = buildOrders(random, userId, purchases, sales, person.joined);
    const donations = buildDonations(
      random,
      userId,
      donationCount,
      person.joined,
    );
    const wishlist = buildWishlist(
      random,
      level >= 2 ? between(random, 1, 4) : between(random, 0, 1),
      person.joined,
    );
    const reviews = buildReviews(
      random,
      level >= 3 ? between(random, 1, 3) : between(random, 0, 1),
      person.joined,
    );
    const reports = buildReports(random, person.status, person.joined);

    const spent = orders
      .filter(
        (order) =>
          order.role === "Buyer" &&
          ["Completed", "Confirmed"].includes(order.order_status),
      )
      .reduce((sum, order) => sum + order.amount, 0);
    const earned = orders
      .filter(
        (order) =>
          order.role === "Seller" &&
          ["Completed", "Confirmed"].includes(order.order_status),
      )
      .reduce((sum, order) => sum + order.amount, 0);

    const lastActive =
      person.status === "Active"
        ? addDays("2026-10-18T09:00:00", -between(random, 0, 12))
        : addDays("2026-10-18T09:00:00", -between(random, 20, 120));

    const user = {
      user_id: userId,
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
      last_active: lastActive,
      profile: {
        profile_image: person.image || null,
        phone: `+91 9${between(random, 1000, 9999)}${between(random, 10000, 99999)}`,
        address: `${between(random, 4, 220)}, ${pick(random, ["Green Park Road", "Lake View Street", "Garden Colony", "Temple Road", "Orbit Nagar", "Rose Avenue"])}`,
        city: person.city,
        state: person.state,
        pincode: person.pincode,
        total_uploads: items.length,
        total_sales: orders.filter((order) => order.role === "Seller").length,
        total_purchases: orders.filter((order) => order.role === "Buyer")
          .length,
        environmental_impact:
          Math.round(
            (items.length * 6.2 + donations.length * 4.1 + purchases * 5.3) *
              10,
          ) / 10,
      },
      totals: { spent, earned },
      items,
      orders,
      donations,
      wishlist,
      reviews,
      reports,
      statusHistory: [],
    };

    /* moderation history for accounts that are not Active */
    if (person.status !== "Active") {
      const reasons = {
        Suspended: "Multiple buyer complaints about misleading item condition.",
        Blocked:
          "Repeated policy violations and a confirmed fraudulent listing.",
        Deleted: "Account deleted at the user's own request.",
      };
      user.statusHistory.push({
        id: `${userId}-h1`,
        action: person.status,
        reason: reasons[person.status],
        by: person.status === "Deleted" ? "User request" : "Admin · Nikhil Rao",
        at: addDays("2026-10-18T10:00:00", -between(random, 8, 70)),
      });
    }

    user.activity = buildActivity(user, items, orders, donations);
    return user;
  });
}

/* Admin review: a few waiting donations were already turned down.
   Done after everything is built so the seeded dummy data stays the same. */
const REJECT_REASONS = [
  "Item is in very poor condition and cannot be reused.",
  "This category cannot be accepted for donation right now.",
  "Item is outside our free pickup area.",
  "Photos and description do not match what was offered.",
];
function applyDonationReviews(users) {
  let pendingIndex = 0;
  users.forEach((user) => {
    user.donations.forEach((donation) => {
      if (donation.donation_status !== "Pending") return;
      pendingIndex += 1;
      if (pendingIndex % 3 === 0) {
        donation.donation_status = "Rejected";
        donation.reject_reason =
          REJECT_REASONS[pendingIndex % REJECT_REASONS.length];
        donation.reviewed_at = addDays(donation.donation_date, 1);
        donation.pickup_date = null;
        donation.pickup_slot = null;
      }
    });
  });
  return users;
}

export const INITIAL_USERS = applyDonationReviews(buildUsers());
