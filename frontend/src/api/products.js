import { apiRequest } from "./api";

/* One set of calls for "a seller's products", used for ReMakers
   (/remakers/products) and for ReOrbit's own store (/admins/store).
   Every call returns { product } rows in the server's snake_case shape. */
export function productApi(base) {
  const one = (r) => r.data.product;
  return {
    list: (params = "") => apiRequest(`${base}/${params}`).then((r) => r.data),
    get: (id) => apiRequest(`${base}/${id}/`).then(one),
    create: (body) =>
      apiRequest(`${base}/`, { method: "POST", body }).then(one),
    update: (id, body) =>
      apiRequest(`${base}/${id}/`, { method: "PATCH", body }).then(one),
    publish: (id) =>
      apiRequest(`${base}/${id}/publish/`, { method: "POST", body: {} }).then(
        one,
      ),
    pause: (id) =>
      apiRequest(`${base}/${id}/pause/`, { method: "POST", body: {} }).then(
        one,
      ),
    remove: (id) => apiRequest(`${base}/${id}/`, { method: "DELETE" }),
    upload: (id, files) => {
      const form = new FormData();
      files.forEach((f) => form.append("images", f));
      return apiRequest(`${base}/${id}/images/`, {
        method: "POST",
        body: form,
      }).then(one);
    },
    removeImage: (id, imageId) =>
      apiRequest(`${base}/${id}/images/${imageId}/`, { method: "DELETE" }).then(
        one,
      ),
    reorder: (id, order) =>
      apiRequest(`${base}/${id}/images/order/`, {
        method: "POST",
        body: { order },
      }).then(one),
  };
}

export const remakerProductApi = productApi("/remakers/products");
export const adminStoreApi = productApi("/admins/store");

/* all rows of a list (the server pages at 100 max) */
export async function listAll(api, params = "") {
  const sep = params.includes("?") ? "&" : "?";
  const first = await api.list(`${params}${sep}page_size=100`);
  let rows = first.results;
  for (let p = 2; p <= first.total_pages; p += 1) {
    rows = rows.concat(
      (await api.list(`${params}${sep}page_size=100&page=${p}`)).results,
    );
  }
  return rows;
}

/* Make the server's photos match the form. `photos` is the seller's final order:
   [{ serverId?, file? }]. Removes dropped photos, uploads new ones, then orders. */
export async function syncPhotos(api, id, photos, current) {
  const keep = new Set(photos.filter((p) => p.serverId).map((p) => p.serverId));
  let rows = current;
  for (const row of current) {
    if (!keep.has(row.id)) rows = (await api.removeImage(id, row.id)).images;
  }
  rows = rows.filter((r) => keep.has(r.id));
  const fresh = photos.filter((p) => p.file);
  if (fresh.length) {
    rows = (
      await api.upload(
        id,
        fresh.map((p) => p.file),
      )
    ).images;
    const added = rows.slice(rows.length - fresh.length);
    fresh.forEach((p, n) => {
      p.serverId = added[n].id;
    });
  }
  const order = photos.map((p) => p.serverId).filter(Boolean);
  if (order.length > 1 && order.some((v, n) => rows[n]?.id !== v))
    await api.reorder(id, order);
}

/* categories that can hold products, cached for the session */
let catPromise = null;
export function fetchProductCategories() {
  if (!catPromise) {
    catPromise = apiRequest("/marketplace/categories/?for=product", {
      auth: false,
    })
      .then((r) => r.data.categories)
      .catch((e) => {
        catPromise = null;
        throw e;
      });
  }
  return catPromise;
}
