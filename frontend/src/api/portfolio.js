/* ReMaker portfolio: the calls and the shapes the screens use.
   Server rows come from /api/portfolio/ (see backend/apps/portfolio/views.py). */
import { apiRequest } from "./api";
import { mediaUrl } from "./profile";

const linked = (p) =>
  p
    ? {
        id: p.id,
        title: p.title,
        price: Number(p.price) || 0,
        status: p.status,
        image: mediaUrl(p.cover),
      }
    : null;

/* The ReMaker's own works (list, add, edit, view pages) */
export function mapWork(w) {
  const product = linked(w.linked_product);

  return {
    id: w.id,
    title: w.title,
    category: w.category?.name || "",
    categoryId: w.category?.id || "",
    description: w.description || "",
    before: mediaUrl(w.before),
    after: mediaUrl(w.after),
    linkedProductId: product?.id || "",
    linkedProduct: product,
    visibility: w.visibility || "Public",
    createdAt: w.uploaded_at,
  };
}

/* The user app's ReMaker profile > Portfolio tab */
export function mapPublicWork(w) {
  return {
    id: w.id,
    title: w.title,
    description: w.description || "",
    category: w.category?.name || "",
    image: mediaUrl(w.after),
    before: mediaUrl(w.before),
    after: mediaUrl(w.after),
    linkedProduct: linked(w.linked_product),
    createdAt: w.uploaded_at,
  };
}

/* The admin ReMaker profile > Portfolio tab (same field names as before) */
export function mapAdminWork(w) {
  return {
    portfolio_id: w.id,
    title: w.title,
    description: w.description || "",
    category: w.category?.name || "",
    before_image: mediaUrl(w.before),
    after_image: mediaUrl(w.after),
    linked_product: linked(w.linked_product),
    uploaded_at: w.uploaded_at,
    visibility: w.visibility,
  };
}

/* Form values -> what the server expects. Files are only sent when they changed. */
function toForm(values) {
  const form = new FormData();

  form.append("title", values.title);
  form.append("category", values.categoryId);
  form.append("description", values.description);
  form.append("linked_product", values.linkedProductId || "");
  if (values.beforeFile) form.append("before", values.beforeFile);
  if (values.afterFile) form.append("after", values.afterFile);

  return form;
}

const works = (response) => response.data.works;
const work = (response) => response.data.work;

export const portfolioApi = {
  mine: () => apiRequest("/portfolio/me/").then(works),
  add: (values) =>
    apiRequest("/portfolio/me/", { method: "POST", body: toForm(values) }).then(work),
  update: (id, values) =>
    apiRequest(`/portfolio/me/${id}/`, { method: "PATCH", body: toForm(values) }).then(work),
  remove: (id) => apiRequest(`/portfolio/me/${id}/`, { method: "DELETE" }).then(work),
  restore: (id) =>
    apiRequest(`/portfolio/me/${id}/restore/`, { method: "POST", body: {} }).then(work),
};

export const fetchPublicWorks = (remakerId) =>
  apiRequest(`/portfolio/public/${encodeURIComponent(remakerId)}/`, { auth: false })
    .then(works)
    .then((rows) => rows.map(mapPublicWork));

export const fetchAdminWorks = (remakerId) =>
  apiRequest(`/portfolio/admin/${encodeURIComponent(remakerId)}/`)
    .then(works)
    .then((rows) => rows.map(mapAdminWork));
