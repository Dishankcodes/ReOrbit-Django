import React, { useState } from "react";

export const SITE_URL = "https://dishankcodes-reorbit.vercel.app/";
export const REMAKER_SITE_URL = "https://dishankcodes-reorbit.vercel.app/remakers";

/* Shares ReOrbit's link: the phone's share sheet where there is one, otherwise it copies the link.
   `remaker` shares the ReMaker landing page instead of the main site. */
export default function ShareSiteButton({ remaker = false, className = "", children }) {
  const [copied, setCopied] = useState(false);
  const url = remaker ? REMAKER_SITE_URL : SITE_URL;
  const share = async (e) => {
    e.preventDefault();
    const data = {
      title: remaker ? "ReOrbit for ReMakers" : "ReOrbit",
      text: remaker
        ? "Sell what you remake on ReOrbit, the circular marketplace."
        : "ReOrbit: buy, sell and donate pre-loved things.",
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") return; // they closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };
  return (
    <a href={url} onClick={share} className={className} aria-label={copied ? "Link copied" : "Share ReOrbit"}
       title={copied ? "Link copied" : "Share ReOrbit"} style={{ position: "relative" }}>
      {children || <span className="material-symbols-outlined">{copied ? "check" : "share"}</span>}
      {copied && (
        <span role="status" style={{ position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)", whiteSpace: "nowrap", padding: "4px 9px", borderRadius: 8,
          background: "#1f2923", color: "#fff", fontSize: 12, fontWeight: 600 }}>
          Link copied
        </span>
      )}
    </a>
  );
}
