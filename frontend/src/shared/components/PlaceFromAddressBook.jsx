import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone } from "lucide-react";

import "./PlaceFromAddressBook.css";

/* Phone, city and pincode are kept in one place: the address book (Saved addresses).
   The server copies the default address onto the profile, so this card only shows it. */
export default function PlaceFromAddressBook({ profile, to, tone = "" }) {
  const city = profile?.city || "";
  const pin = profile?.pincode || "";
  const phone = profile?.phone || "";
  const empty = !city && !pin && !phone;
  return (
    <section className={`pfab ${tone}`} aria-label="Phone and location">
      <div className="pfab-text">
        <strong>Phone and location</strong>
        {empty ? (
          <small>Add an address and your phone, city and pincode fill in everywhere: selling, donating and checkout.</small>
        ) : (
          <ul>
            {phone && (
              <li>
                <Phone size={14} /> {phone}
              </li>
            )}
            {(city || pin) && (
              <li>
                <MapPin size={14} /> {[city, pin].filter(Boolean).join(" · ")}
              </li>
            )}
          </ul>
        )}
        <small className="pfab-note">From your default saved address. Change it there and it updates everywhere.</small>
      </div>
      <Link to={to} className="pfab-link">
        {empty ? "Add an address" : "Manage addresses"}
      </Link>
    </section>
  );
}
