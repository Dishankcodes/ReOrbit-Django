import React, { useRef, useState } from "react";
import {
  ImagePlus,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  AlertCircle,
} from "lucide-react";

export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 4;
const MAX_MB = 3;

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });

/* 3 to 4 product photos: pick or drop, set the cover, reorder, remove. */
export default function PhotoUploader({ images, onChange }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");

  const add = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = MAX_PHOTOS - images.length;
    const problems = [];
    const ok = [];
    files.forEach((f) => {
      if (!f.type.startsWith("image/"))
        problems.push(`${f.name} is not an image.`);
      else if (f.size > MAX_MB * 1024 * 1024)
        problems.push(`${f.name} is larger than ${MAX_MB} MB.`);
      else ok.push(f);
    });
    if (ok.length > room)
      problems.push(
        `Only ${MAX_PHOTOS} photos are allowed, so ${ok.length - room} were skipped.`,
      );
    const urls = await Promise.all(ok.slice(0, room).map(readFile));
    setError(problems.join(" "));
    if (urls.length) onChange([...images, ...urls]);
    if (input.current) input.current.value = "";
  };
  const move = (i, d) => {
    const n = images.slice();
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const remove = (i) => {
    onChange(images.filter((_, k) => k !== i));
    setError("");
  };
  const cover = (i) => {
    const n = images.slice();
    const [x] = n.splice(i, 1);
    n.unshift(x);
    onChange(n);
  };

  const count = images.length;
  return (
    <div className="sl-photos">
      <div className="sl-photo-grid" role="list" aria-label="Product photos">
        {images.map((src, i) => (
          <figure
            key={`${i}-${src.slice(-24)}`}
            className={`sl-photo ${i === 0 ? "cover" : ""}`}
            role="listitem"
          >
            <img src={src} alt={`Product photo ${i + 1}`} />
            {i === 0 && (
              <span className="sl-cover-tag">
                <Star size={11} fill="currentColor" /> Cover
              </span>
            )}
            <button
              type="button"
              className="sl-photo-x"
              onClick={() => remove(i)}
              aria-label={`Remove photo ${i + 1}`}
            >
              <X size={14} />
            </button>
            <div className="sl-photo-tools">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move earlier"
              >
                <ChevronLeft size={14} />
              </button>
              {i !== 0 && (
                <button type="button" onClick={() => cover(i)} className="txt">
                  Make cover
                </button>
              )}
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === count - 1}
                aria-label="Move later"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </figure>
        ))}
        {count < MAX_PHOTOS && (
          <button
            type="button"
            className={`sl-drop ${over ? "over" : ""}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              add(e.dataTransfer.files);
            }}
            aria-label="Add photos"
          >
            {count === 0 ? <UploadCloud size={26} /> : <ImagePlus size={24} />}
            <strong>{count === 0 ? "Drop photos here" : "Add another"}</strong>
            <span>or click to browse · JPG, PNG, WebP · up to {MAX_MB} MB</span>
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
        data-testid="photo-input"
      />
      <div className="sl-photo-meta">
        <span className={count >= MIN_PHOTOS ? "ok" : ""}>
          {count} of {MAX_PHOTOS} photos · at least {MIN_PHOTOS} needed
        </span>
        <div className="sl-photo-dots" aria-hidden="true">
          {Array.from({ length: MAX_PHOTOS }, (_, i) => (
            <i
              key={i}
              className={i < count ? (count >= MIN_PHOTOS ? "ok" : "on") : ""}
            />
          ))}
        </div>
      </div>
      {error && (
        <p className="sl-photo-error" role="alert">
          <AlertCircle size={14} /> {error}
        </p>
      )}
    </div>
  );
}
