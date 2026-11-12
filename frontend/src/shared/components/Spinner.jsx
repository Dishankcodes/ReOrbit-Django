import React from "react";
import "./Spinner.css";

/* One loading spinner for the whole app. Uses the surrounding text colour, so it fits
   every side's theme.
     <Spinner />                      small inline (inside a button)
     <Spinner size={28} label="…" />  with a caption
     <PageLoader />                   centred, for a page or panel that is loading */
export default function Spinner({ size = 16, label = "", className = "" }) {
  return (
    <span
      className={`ro-spin-wrap ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="ro-spin"
        style={{
          width: size,
          height: size,
          borderWidth: Math.max(2, Math.round(size / 9)),
        }}
        aria-hidden="true"
      />
      {label ? (
        <span className="ro-spin-label">{label}</span>
      ) : (
        <span className="ro-sr">Loading</span>
      )}
    </span>
  );
}

export function PageLoader({ label = "Loading…", minHeight = 240 }) {
  return (
    <div className="ro-pageloader" style={{ minHeight }}>
      <Spinner size={30} label={label} />
    </div>
  );
}

/* Shown after a short delay so fast loads never flash a spinner. */
export function DelayedLoader({ delay = 250, ...rest }) {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return show ? (
    <PageLoader {...rest} />
  ) : (
    <div style={{ minHeight: rest.minHeight || 240 }} />
  );
}
