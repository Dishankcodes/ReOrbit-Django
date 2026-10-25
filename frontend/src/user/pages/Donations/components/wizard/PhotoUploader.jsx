import React, { useRef, useState } from "react";
import { ImagePlus, X, Star } from "lucide-react";

const MAX_PHOTOS = 5;
const MAX_MB = 5;

/* images: [{ id, url, name }] */
export default function PhotoUploader({ images, onChange, error }) {
  const inputRef = useRef(null);
  const [localError, setLocalError] = useState("");
  const [dragging, setDragging] = useState(false);

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const room = MAX_PHOTOS - images.length;
    const accepted = [];
    let message = "";

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        message = "Only image files can be added.";
      } else if (file.size > MAX_MB * 1024 * 1024) {
        message = `Each photo must be under ${MAX_MB} MB.`;
      } else if (accepted.length < room) {
        accepted.push({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          url: URL.createObjectURL(file),
          name: file.name,
        });
      } else {
        message = `You can add up to ${MAX_PHOTOS} photos.`;
      }
    });

    setLocalError(message);
    if (accepted.length) onChange([...images, ...accepted]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (id) => {
    const target = images.find((image) => image.id === id);
    if (target?.url.startsWith("blob:")) URL.revokeObjectURL(target.url);
    onChange(images.filter((image) => image.id !== id));
    setLocalError("");
  };

  const makeCover = (id) => {
    const target = images.find((image) => image.id === id);
    onChange([target, ...images.filter((image) => image.id !== id)]);
  };

  return (
    <div className="dn-field">
      <span className="dn-label">
        Photos <em>*</em>
        <span className="dn-hint">
          {" "}
          · {images.length}/{MAX_PHOTOS} added, first photo is the cover
        </span>
      </span>

      <div className="dn-photos">
        {images.map((image, index) => (
          <figure className="dn-photo" key={image.id}>
            <img src={image.url} alt={image.name} />
            {index === 0 ? (
              <span className="dn-photo-cover">Cover</span>
            ) : (
              <button
                type="button"
                className="dn-photo-star"
                onClick={() => makeCover(image.id)}
                aria-label="Make cover photo"
                title="Make cover photo"
              >
                <Star size={13} />
              </button>
            )}
            <button
              type="button"
              className="dn-photo-x"
              onClick={() => remove(image.id)}
              aria-label={`Remove ${image.name}`}
            >
              <X size={14} />
            </button>
          </figure>
        ))}

        {images.length < MAX_PHOTOS && (
          <button
            type="button"
            className={`dn-photo-add ${dragging ? "is-drag" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
          >
            <ImagePlus size={24} />
            <strong>Add photos</strong>
            <small>Drag & drop or browse</small>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => addFiles(event.target.files)}
      />

      {(error || localError) && (
        <span className="dn-error">{error || localError}</span>
      )}
      <span className="dn-hint">
        Clear, well-lit photos help us review faster. Photos must match the real
        condition of the item.
      </span>
    </div>
  );
}
