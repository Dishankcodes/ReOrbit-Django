import { apiRequest } from "./api";

/* Public marketplace: user listings, ReMaker products and ReOrbit's store together. */
/* Every page (up to 2,000 listings), 100 at a time; the marketplace shows them 20 at a time. */
export async function fetchMarketplace(maxPages = 20) {
  const first = await apiRequest("/marketplace/?page_size=100", {
    auth: false,
  });
  let rows = first.data.results;
  for (let p = 2; p <= Math.min(first.data.total_pages, maxPages); p += 1) {
    rows = rows.concat(
      (
        await apiRequest(`/marketplace/?page_size=100&page=${p}`, {
          auth: false,
        })
      ).data.results,
    );
  }
  return rows;
}
