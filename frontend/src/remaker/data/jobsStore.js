/* =========================================================
   REMAKER JOBS - UI STORE (no backend yet)
   Refurbishing work that ReOrbit's warehouse offers to verified
   ReMakers (the ReMaker and admin collaboration from the project
   notes). Follows the Refurbishments table:
     refurbishment_status  Assigned | In_Progress | Completed
     quality_status        Pending | Passed | Failed
   The same item keeps its item_id from the warehouse through to the
   finished piece.

   Job states used in this UI:
     Open -> Assigned -> In progress -> In review (quality check)
          -> Completed (passed)   or   Needs changes (failed, back to work)

   Saved in localStorage. Replace the functions with API calls later.
   ========================================================= */

import { useMemo, useSyncExternalStore } from "react";

const KEY = "reorbit_remaker_jobs_v1";
const NOW = Date.now();
const ago = (hours) => new Date(NOW - hours * 3600000).toISOString();
const inDays = (days) => new Date(NOW + days * 86400000).toISOString();

const P = "/images/portfolio/";

export const JOB_STATES = {
  Open: { label: "Open", tone: "open" },
  Assigned: { label: "Assigned to you", tone: "pending" },
  "In progress": { label: "In progress", tone: "progress" },
  "In review": { label: "In quality review", tone: "pending" },
  "Needs changes": { label: "Needs changes", tone: "waiting" },
  Completed: { label: "Completed", tone: "done" },
};

export const DIFFICULTY_TONE = { Easy: "good", Medium: "pending", Hard: "bad" };

function job(base) {
  return {
    progress: [],
    afterImage: "",
    qc: null,
    assignedAt: "",
    startedAt: "",
    submittedAt: "",
    completedAt: "",
    ...base,
  };
}

function seed() {
  return [
    job({
      id: "JB-5112",
      itemId: "IT-6041",
      title: "Teak wardrobe door",
      category: "Furniture",
      summary:
        "Turn a carved teak wardrobe door into a hall console or wall panel.",
      brief:
        "A 70-year-old carved teak door from a donated wardrobe. The carving is intact but the varnish is cracked and one hinge mortise is damaged. We would like it restored and turned into a useful piece, like a wall console or a bench back.",
      requirements: [
        "Keep the original carved panel visible",
        "Strip the old varnish and re-seal with a natural finish",
        "Mention the new use in your notes",
        "Finished piece must be stable and safe to use",
      ],
      materials:
        "Item and sandpaper provided. Legs, brackets and finish are your own.",
      difficulty: "Hard",
      fee: 4200,
      days: 14,
      warehouse: "Naroda, Ahmedabad",
      weight: "About 18 kg",
      before: [
        P + "before-tara-console.jpg",
        P + "before-tara-teak-cabinet.jpg",
      ],
      status: "Open",
      postedAt: ago(8),
      dueAt: "",
    }),
    job({
      id: "JB-5109",
      itemId: "IT-6038",
      title: "Worn denim jackets (lot of 6)",
      category: "Clothing",
      summary:
        "Six donated denim jackets ready to become bags, cushions or patchwork.",
      brief:
        "Six denim jackets in mixed sizes, washed and sorted. Make something useful and sellable from all of them. Totes, aprons and cushion covers have worked well before.",
      requirements: [
        "Use every jacket, or tell us what is left over",
        "Linings and stitching must be strong",
        "Finished items need a ReOrbit label we will provide",
      ],
      materials: "Jackets provided. Thread, lining and zips are your own.",
      difficulty: "Medium",
      fee: 2800,
      days: 10,
      warehouse: "Naroda, Ahmedabad",
      weight: "About 4 kg",
      before: [P + "before-priya-jacket.jpg", P + "before-priya-bag.jpg"],
      status: "Open",
      postedAt: ago(26),
      dueAt: "",
    }),
    job({
      id: "JB-5106",
      itemId: "IT-6033",
      title: "Brass-handled drawer set",
      category: "Storage",
      summary: "Give a scratched drawer unit a clean, modern finish.",
      brief:
        "Two matching drawer units with solid brass handles. The wood is scratched and one runner sticks. Repair the runner, refinish the wood, polish the brass and keep the original look.",
      requirements: [
        "Repair or replace the sticking runner",
        "Sand and refinish all outer surfaces",
        "Polish the brass handles",
      ],
      materials: "Items provided. Finish and runners are your own.",
      difficulty: "Easy",
      fee: 1900,
      days: 7,
      warehouse: "Sanand, Ahmedabad",
      weight: "About 12 kg",
      before: [P + "before-arjun-shelf.jpg"],
      status: "Open",
      postedAt: ago(50),
      dueAt: "",
    }),
    job({
      id: "JB-5101",
      itemId: "IT-6027",
      title: "Industrial machine lamp base",
      category: "Lighting",
      summary: "Wire an old steel machine part into a statement table lamp.",
      brief:
        "A heavy steel machine part with a nice industrial shape. Clean it, treat the rust, then wire it into a lamp with a cloth cable and a dimmer. All wiring must meet ISI safety standards.",
      requirements: [
        "Treat and seal rust before wiring",
        "Use ISI marked wiring and holders",
        "Test the lamp before submitting",
      ],
      materials: "Item provided. Wiring parts are your own.",
      difficulty: "Medium",
      fee: 2400,
      days: 9,
      warehouse: "Naroda, Ahmedabad",
      weight: "About 7 kg",
      before: [P + "before-arjun-lamp.jpg", P + "before-arjun-metal.jpg"],
      status: "Open",
      postedAt: ago(70),
      dueAt: "",
    }),
    job({
      id: "JB-5098",
      itemId: "IT-6019",
      title: "Cane-back dining chair",
      category: "Furniture",
      summary: "Restore a wobbly chair with a broken cane back.",
      brief:
        "A solid wood dining chair with a torn cane back and loose joints. Re-weave the cane, tighten and glue the joints, and finish it in a calm colour that suits a modern home.",
      requirements: [
        "Re-weave the back in natural cane",
        "Joints must be tight with no wobble",
        "Finish must be safe for everyday use",
      ],
      materials: "Chair provided. Cane and finish are your own.",
      difficulty: "Medium",
      fee: 2200,
      days: 10,
      warehouse: "Naroda, Ahmedabad",
      weight: "About 6 kg",
      before: [P + "before-tara-chair.jpg"],
      status: "In progress",
      postedAt: ago(130),
      assignedAt: ago(110),
      startedAt: ago(70),
      dueAt: inDays(5),
      progress: [
        {
          id: "pg1",
          at: ago(70),
          text: "Collected the chair. Joints are very loose and two stretchers are cracked.",
        },
        {
          id: "pg2",
          at: ago(40),
          text: "Took the chair apart and cleaned old glue from all the joints. New dowels are cut.",
          photo: P + "before-tara-chair.jpg",
        },
      ],
    }),
    job({
      id: "JB-5104",
      itemId: "IT-6022",
      title: "Carved wooden window frames (pair)",
      category: "Decor",
      summary: "Turn a pair of old window frames into mirrors or wall decor.",
      brief:
        "Two carved wooden window frames from a demolished house. Clean and strengthen them, then turn them into decorative mirrors or photo frames.",
      requirements: [
        "Strengthen loose corners",
        "Add mirror glass or backing with safe fixings",
        "Add secure hanging hardware",
      ],
      materials: "Frames provided. Glass and hardware are your own.",
      difficulty: "Easy",
      fee: 1600,
      days: 8,
      warehouse: "Sanand, Ahmedabad",
      weight: "About 5 kg",
      before: [P + "before-priya-home.jpg"],
      status: "Assigned",
      postedAt: ago(40),
      assignedAt: ago(5),
      dueAt: inDays(8),
    }),
    job({
      id: "JB-5091",
      itemId: "IT-6011",
      title: "Brass floor lamp stand",
      category: "Lighting",
      summary: "Polish and rewire a tall brass lamp stand.",
      brief:
        "A tall brass lamp stand with a tarnished finish and old wiring. Polish it, rewire it safely and add a new shade.",
      requirements: [
        "Rewire with ISI marked parts",
        "Polish without removing the patina completely",
        "Add a new shade",
      ],
      materials: "Stand provided. Wiring and shade are your own.",
      difficulty: "Easy",
      fee: 1700,
      days: 7,
      warehouse: "Naroda, Ahmedabad",
      weight: "About 5 kg",
      before: [P + "before-arjun-lamp.jpg"],
      afterImage: P + "arjun-lamp.jpg",
      status: "In review",
      postedAt: ago(260),
      assignedAt: ago(240),
      startedAt: ago(220),
      submittedAt: ago(20),
      dueAt: inDays(1),
      qc: { status: "Pending", note: "" },
      progress: [
        {
          id: "pg3",
          at: ago(200),
          text: "Removed old wiring and polished the stand. The patina looks warm and even.",
        },
        {
          id: "pg4",
          at: ago(60),
          text: "New wiring done and tested. Shade fitted.",
          photo: P + "arjun-lamp.jpg",
        },
      ],
    }),
    job({
      id: "JB-5075",
      itemId: "IT-5998",
      title: "Rusted window grille",
      category: "Decor",
      summary: "Make a wall shelf from a rusted iron grille.",
      brief:
        "A decorative iron window grille covered in surface rust. Clean, seal and turn it into a wall shelf or plant stand.",
      requirements: [
        "Remove loose rust and seal the metal",
        "Add a wooden shelf",
        "Mounting must hold at least 10 kg",
      ],
      materials: "Grille provided. Wood and wall fixings are your own.",
      difficulty: "Medium",
      fee: 2000,
      days: 9,
      warehouse: "Sanand, Ahmedabad",
      weight: "About 9 kg",
      before: [P + "before-arjun-metal.jpg"],
      afterImage: P + "arjun-metal.jpg",
      status: "Needs changes",
      postedAt: ago(420),
      assignedAt: ago(400),
      startedAt: ago(380),
      submittedAt: ago(130),
      dueAt: inDays(3),
      qc: {
        status: "Failed",
        note: "The shelf plank is not fixed firmly enough and the sealant still looks patchy on the left side. Please re-secure the plank and re-coat the grille, then resubmit.",
      },
      progress: [
        {
          id: "pg5",
          at: ago(370),
          text: "Wire brushed the whole grille and applied the first sealant coat.",
        },
        {
          id: "pg6",
          at: ago(140),
          text: "Fitted a pine plank and finished. Ready for review.",
          photo: P + "arjun-metal.jpg",
        },
        {
          id: "pg7",
          at: ago(100),
          text: "Quality check failed. Starting the fixes now.",
        },
      ],
    }),
    job({
      id: "JB-5060",
      itemId: "IT-5971",
      title: "Teak cabinet with brass hinges",
      category: "Furniture",
      summary: "Restore a teak cabinet and keep the original hinges.",
      brief:
        "A teak cabinet with original brass hinges and a cracked top. Repair, refinish and keep the hardware.",
      requirements: [
        "Repair the cracked top",
        "Keep the original hinges",
        "Oil or wax finish",
      ],
      materials: "Cabinet provided. Finish is your own.",
      difficulty: "Hard",
      fee: 3900,
      days: 14,
      warehouse: "Naroda, Ahmedabad",
      weight: "About 22 kg",
      before: [P + "before-tara-teak-cabinet.jpg"],
      afterImage: P + "tara-teak-cabinet.jpg",
      status: "Completed",
      postedAt: ago(1200),
      assignedAt: ago(1180),
      startedAt: ago(1150),
      submittedAt: ago(900),
      completedAt: ago(860),
      dueAt: ago(840),
      qc: {
        status: "Passed",
        note: "Beautiful repair work. The grain and hinges look great.",
      },
      progress: [
        {
          id: "pg8",
          at: ago(1000),
          text: "Top repaired with a butterfly joint, refinished with hard wax oil.",
        },
      ],
    }),
    job({
      id: "JB-5044",
      itemId: "IT-5950",
      title: "Patchwork quilt offcuts",
      category: "Clothing",
      summary: "Turn quilt offcuts into tote bags.",
      brief:
        "A box of cotton quilt offcuts. Make tote bags, pouches or cushion covers.",
      requirements: [
        "Use at least 80% of the offcuts",
        "Strong seams and lining",
      ],
      materials: "Offcuts provided. Thread and lining are your own.",
      difficulty: "Easy",
      fee: 1400,
      days: 7,
      warehouse: "Sanand, Ahmedabad",
      weight: "About 3 kg",
      before: [P + "before-priya-bag.jpg"],
      afterImage: P + "priya-bag.jpg",
      status: "Completed",
      postedAt: ago(1900),
      assignedAt: ago(1880),
      startedAt: ago(1860),
      submittedAt: ago(1700),
      completedAt: ago(1660),
      dueAt: ago(1640),
      qc: {
        status: "Passed",
        note: "Neat stitching and a clever use of the offcuts.",
      },
      progress: [],
    }),
  ];
}

/* ---------- store ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (raw) {
      const value = JSON.parse(raw);
      if (Array.isArray(value)) return value;
    }
  } catch {
    /* fall back to the seed */
  }

  return seed();
}

let jobs = load();
const listeners = new Set();

function commit(next) {
  jobs = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(jobs));
  } catch {
    /* storage full or blocked: the change still lives for this session */
  }

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => jobs;

export function useJobs() {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return useMemo(
    () => [...list].sort((a, b) => b.postedAt.localeCompare(a.postedAt)),
    [list],
  );
}

export function useJob(id) {
  const list = useSyncExternalStore(subscribe, getSnapshot);

  return list.find((item) => item.id === id) || null;
}

function patch(id, change) {
  commit(
    jobs.map((item) => {
      if (item.id !== id) return item;
      return typeof change === "function"
        ? change(item)
        : { ...item, ...change };
    }),
  );
}

/* ---------- actions ---------- */

export function acceptJob(id) {
  patch(id, (item) => ({
    ...item,
    status: "Assigned",
    assignedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + item.days * 86400000).toISOString(),
  }));
}

/* Hand an assigned job back before starting */
export function declineJob(id) {
  patch(id, { status: "Open", assignedAt: "", dueAt: "" });
}

export function startJob(id) {
  patch(id, (item) => ({
    ...item,
    status: "In progress",
    startedAt: new Date().toISOString(),
    progress: [
      ...item.progress,
      {
        id: `pg-${Date.now()}`,
        at: new Date().toISOString(),
        text: "Collected the item and started work.",
      },
    ],
  }));
}

export function addProgress(id, { text, photo = "" }) {
  patch(id, (item) => ({
    ...item,
    progress: [
      ...item.progress,
      {
        id: `pg-${Date.now()}`,
        at: new Date().toISOString(),
        text: text.trim(),
        photo,
      },
    ],
  }));
}

export function submitJob(id, { afterImage, note }) {
  patch(id, (item) => ({
    ...item,
    status: "In review",
    afterImage,
    submittedAt: new Date().toISOString(),
    qc: { status: "Pending", note: "" },
    progress: note.trim()
      ? [
          ...item.progress,
          {
            id: `pg-${Date.now()}`,
            at: new Date().toISOString(),
            text: note.trim(),
            photo: afterImage,
          },
        ]
      : item.progress,
  }));
}

/* Demo helper (used with ?demo=1): ReOrbit's quality decision */
export function decideQuality(id, passed) {
  patch(id, (item) => ({
    ...item,
    status: passed ? "Completed" : "Needs changes",
    completedAt: passed ? new Date().toISOString() : "",
    qc: {
      status: passed ? "Passed" : "Failed",
      note: passed
        ? "Lovely work. Approved, and your fee is on its way."
        : "A few details need another look. Please check the finish on the edges and resubmit.",
    },
    progress: passed
      ? item.progress
      : [
          ...item.progress,
          {
            id: `pg-${Date.now()}`,
            at: new Date().toISOString(),
            text: "Quality check failed. Starting the fixes now.",
          },
        ],
  }));
}

export function resumeJob(id) {
  patch(id, { status: "In progress" });
}

export function resetJobs() {
  commit(seed());
}

/* ---------- summaries + labels ---------- */

export function jobTotals(list) {
  return {
    paid: list
      .filter((item) => item.status === "Completed")
      .reduce((total, item) => total + item.fee, 0),
    review: list
      .filter((item) => item.status === "In review")
      .reduce((total, item) => total + item.fee, 0),
    active: list.filter((item) =>
      ["Assigned", "In progress", "Needs changes"].includes(item.status),
    ).length,
    done: list.filter((item) => item.status === "Completed").length,
  };
}

export function dueLabel(iso) {
  if (!iso) return "";

  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);

  if (days < 0)
    return `${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function postedLabel(iso) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);

  if (hours < 1) return "Just posted";
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export function dateLabel(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function timeLabel(iso) {
  return (
    new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }) +
    ", " +
    new Date(iso)
      .toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase()
  );
}
