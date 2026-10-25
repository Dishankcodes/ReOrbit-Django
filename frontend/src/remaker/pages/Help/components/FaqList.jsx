import React, { useState } from "react";

import { FAQ_CATEGORIES } from "../../../data/helpStore";

/* Accordion of help articles. Uses native details/summary so it works
   with the keyboard and screen readers out of the box. */
export default function FaqList({ items, showCategory = false }) {
  const [openId, setOpenId] = useState("");

  if (items.length === 0) return null;

  return (
    <div className="hlp-faq">
      {items.map((item) => {
        const open = openId === item.id;
        const category = FAQ_CATEGORIES.find(
          (entry) => entry.key === item.category,
        );

        return (
          <details
            className={open ? "open" : ""}
            key={item.id}
            open={open}
            onToggle={(event) => {
              if (event.target.open) setOpenId(item.id);
              else if (open) setOpenId("");
            }}
          >
            <summary>
              <span>
                <strong>{item.q}</strong>
                {showCategory && category && <small>{category.label}</small>}
              </span>
              <i aria-hidden="true" />
            </summary>

            <p>{item.a}</p>
          </details>
        );
      })}
    </div>
  );
}
