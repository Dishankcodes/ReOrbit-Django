import React, { useEffect } from "react";

/* Full-size look at a photo a customer attached */
export default function PhotoViewer({ photos, index, onChange, onClose }) {
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onChange((index + 1) % photos.length);
      if (event.key === "ArrowLeft") onChange((index - 1 + photos.length) % photos.length);
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [index, photos.length, onChange, onClose]);

  return (
    <div
      className="rvp-overlay dark"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="rvp-viewer" role="dialog" aria-modal="true" aria-label="Customer photo">
        <img src={photos[index]} alt={`Customer photo ${index + 1} of ${photos.length}`} />

        <button type="button" className="rvp-viewer-close" onClick={onClose}>
          Close
        </button>

        {photos.length > 1 && (
          <div className="rvp-viewer-nav">
            <button type="button" onClick={() => onChange((index - 1 + photos.length) % photos.length)}>
              Previous
            </button>
            <span>
              {index + 1} / {photos.length}
            </span>
            <button type="button" onClick={() => onChange((index + 1) % photos.length)}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
