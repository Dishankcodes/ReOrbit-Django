import { apiRequest } from "./api";
import { fetchPublicWorks } from "./portfolio";

function mapPublicRemaker(row) {
  const profile = row.profile || {};
  const skills = String(profile.skills || "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const rating = Number(profile.rating_average || 0);

  return {
    id: row.public_id,
    name: row.full_name,
    username: row.username,
    craft: profile.speciality || skills[0] || "ReMaker",
    bio: profile.bio || "",
    city: profile.city || "Location not added",
    image: profile.profile_image || "",
    coverImage: profile.cover_image || "",
    rating: Number.isFinite(rating) ? rating : 0,
    totalReviews: Number(profile.rating_count || 0),
    followers: 0,
    productsCount: Number(profile.total_uploads || 0),
    itemsRescued: 0,
    yearsOfExperience: Number.parseInt(profile.experience, 10) || 0,
    sellerType: "remaker",
    verified: true,
    portfolio: [],
  };
}

/* The public directory (all active ReMakers), read page by page */
export async function fetchPublicRemakers() {
  const rows = [];
  let page = 1;
  let pages = 1;
  do {
    const response = await apiRequest(
      `/remakers/public/?page=${page}&page_size=100`,
      { auth: false },
    );
    rows.push(...(response.data?.results || []));
    pages = response.data?.total_pages || 1;
    page += 1;
  } while (page <= pages && page <= 10);
  return rows.map(mapPublicRemaker);
}

export async function fetchPublicRemaker(publicId) {
  /* A portfolio that fails to load must not hide the whole profile */
  const [response, portfolio] = await Promise.all([
    apiRequest(`/remakers/public/${encodeURIComponent(publicId)}/`, {
      auth: false,
    }),
    fetchPublicWorks(publicId).catch(() => []),
  ]);
  if (!response.data?.remaker) {
    throw new Error("ReMaker profile was not found.");
  }
  return { ...mapPublicRemaker(response.data.remaker), portfolio };
}
