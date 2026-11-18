/* =========================================================
   Shrink a photo in the browser the moment it is picked.

   - Phone photos are often 4000px and 5–10 MB. Uploads stay fast on mobile data and on the
     free server: the longest side becomes at most 1600px (JPEG, quality 0.85), usually
     200–600 KB. The server still checks and re-processes every photo.
   - The result lives in memory, so the upload never goes back to the phone's original file.
     On Android, a photo picked from Google Photos or cloud storage can stop being readable
     a few minutes later; the browser then fails the upload without sending anything
     (ERR_UPLOAD_FILE_CHANGED), which looked like "Unable to connect to the server".
   - Photos that are already small are kept as they are (but still copied into memory).
   - If the browser can't draw the photo (e.g. HEIC on some phones), the original is copied
     into memory and sent as is; the server says if it can't accept it.

   const file = await compressPhoto(input.files[0]);
   const files = await compressPhotos(input.files);
   ========================================================= */

const MAX_SIDE = 1600;
const QUALITY = 0.85;
const KEEP_UNDER_BYTES = 350 * 1024; // already small: don't touch

function loadImage(file) {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => viaElement(file));
  }
  return viaElement(file);
}

function viaElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

async function inMemory(file) {
  try {
    const data = await file.arrayBuffer();
    return new File([data], file.name || "photo", { type: file.type, lastModified: Date.now() });
  } catch {
    const e = new Error("We couldn't read that photo from your phone. Please choose it again.");
    e.code = "PHOTO_UNREADABLE";
    throw e;
  }
}

export async function compressPhoto(file, { maxSide = MAX_SIDE, quality = QUALITY } = {}) {
  if (!file || !(file instanceof Blob)) return file;
  const type = (file.type || "").toLowerCase();
  if (!type.startsWith("image/") || type === "image/gif" || type === "image/svg+xml") return inMemory(file);

  let img;
  try {
    img = await loadImage(file);
  } catch {
    return inMemory(file); // the browser can't draw it: send the original and let the server decide
  }

  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  if (scale === 1 && file.size <= KEEP_UNDER_BYTES) {
    img.close?.();
    return inMemory(file);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // transparent PNGs become white, not black, as JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob || blob.size >= file.size) return inMemory(file); // compression didn't help
  const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

/* a FileList or array -> compressed Files (keeps the order) */
export function compressPhotos(list, options) {
  return Promise.all(Array.from(list || []).map((f) => compressPhoto(f, options)));
}

/* Before an upload: make sure every file in a FormData can still be read, copying it into
   memory. Returns a new FormData. Throws a clear PHOTO_UNREADABLE error instead of letting
   the browser fail the request silently. */
export async function readyFormData(form) {
  if (!(form instanceof FormData)) return form;
  const out = new FormData();
  for (const [key, value] of form.entries()) {
    if (value instanceof File) out.append(key, await inMemory(value), value.name);
    else out.append(key, value);
  }
  return out;
}
