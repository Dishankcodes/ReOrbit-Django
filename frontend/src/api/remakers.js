import { apiRequest } from "./api";

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

export async function fetchPublicRemakers() {
  const remakers = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await apiRequest(
      `/remakers/public/?page=${page}&page_size=100`,
      { auth: false },
    );
    const data = response.data || {};
    remakers.push(...(data.results || []).map(mapPublicRemaker));
    totalPages = Number(data.total_pages || 1);
    page += 1;
  } while (page <= totalPages);

  return remakers;
}

export async function fetchPublicRemaker(publicId) {
  const response = await apiRequest(
    `/remakers/public/${encodeURIComponent(publicId)}/`,
    { auth: false },
  );
  if (!response.data?.remaker) {
    throw new Error("ReMaker profile was not found.");
  }
  return mapPublicRemaker(response.data.remaker);
}
