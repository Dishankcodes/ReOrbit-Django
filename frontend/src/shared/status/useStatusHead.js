import { useEffect } from "react";

/* Gives a status page (404, crash, ...) its own browser-tab title and tells search engines
   not to index it. Both are put back when the page goes away. */
export default function useStatusHead(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} · ReOrbit`;

    let meta = document.querySelector('meta[name="robots"]');
    const created = !meta;
    const previousContent = meta?.getAttribute("content");
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex");

    return () => {
      document.title = previousTitle;
      if (created) meta.remove();
      else if (previousContent == null) meta.removeAttribute("content");
      else meta.setAttribute("content", previousContent);
    };
  }, [title]);
}
