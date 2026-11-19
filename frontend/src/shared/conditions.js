/* =========================================================
   One list of item conditions for the whole platform.

   Each side picks from the conditions that make sense for it, and the marketplace filter
   always offers all of them (in this order), so the same words mean the same thing everywhere:
     member listings   Excellent · Very Good · Good · Fair        (pre-loved things)
     ReMaker products  Upcycled · Refurbished · Brand new         (made or restored by hand)
     ReOrbit store     Brand new · Like new · Good · Fair · Refurbished
   ========================================================= */

export const ALL_CONDITIONS = [
  { id: "Brand new", help: "Never used." },
  { id: "Like new", help: "Used once or twice, no visible wear." },
  { id: "Excellent", help: "Like new. No visible wear." },
  { id: "Very Good", help: "Light signs of use, fully working." },
  { id: "Good", help: "Clearly used but sound and usable." },
  { id: "Fair", help: "Well used, with visible wear." },
  { id: "Refurbished", help: "Restored and checked, ready for a new home." },
  { id: "Upcycled", help: "Made into something new from rescued material." },
];

export const CONDITION_IDS = ALL_CONDITIONS.map((c) => c.id);

/* what a ReMaker can choose for a product */
export const REMAKER_CONDITIONS = [
  { id: "Upcycled", help: "Made from rescued or leftover material." },
  { id: "Refurbished", help: "An old piece you restored and repaired." },
  { id: "Brand new", help: "Made new by hand." },
];
