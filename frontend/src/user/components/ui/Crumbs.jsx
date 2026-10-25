import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/* items: [{ label, to? }] — the last one is the current page. */
export default function Crumbs({ items }) {
  return (
    <nav className="dn-crumbs dn-no-print" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <React.Fragment key={item.label}>
            {last || !item.to ? (
              <strong>{item.label}</strong>
            ) : (
              <Link to={item.to}>{item.label}</Link>
            )}
            {!last && <ChevronRight size={13} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
