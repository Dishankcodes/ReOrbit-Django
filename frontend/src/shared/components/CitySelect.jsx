import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { GUJARAT_CITIES } from "../data/gujaratCities";
import "./CitySelect.css";

/*
  Searchable Gujarat city dropdown.
    <CitySelect id="city" value={city} onChange={setCity} disabled invalid />
  Type to filter by city or district, arrow keys + Enter to pick, Esc to close.
  Colours come from --rcs-accent (set it on a parent to match a side's theme).
*/
export default function CitySelect({
  id,
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = "Select your city",
}) {
  const auto = useId();
  const uid = id || `city-${auto}`;
  const listId = `${uid}-list`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GUJARAT_CITIES;
    return GUJARAT_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.district.toLowerCase().includes(q),
    ).sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return as - bs;
    });
  }, [query]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    if (disabled) return;
    setQuery("");
    const at = GUJARAT_CITIES.findIndex((c) => c.name === value);
    setActive(Math.max(at, 0));
    setOpen(true);
  };

  const pick = (city) => {
    onChange(city.name);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (matches[active]) pick(matches[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const selected = GUJARAT_CITIES.find((c) => c.name === value);

  return (
    <div className={`rcs ${open ? "is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        id={uid}
        className={`rcs-trigger ${invalid ? "is-invalid" : ""}`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        <MapPin size={16} className="rcs-pin" />
        <span className={selected || value ? "rcs-value" : "rcs-placeholder"}>
          {selected ? selected.name : value || placeholder}
        </span>
        <ChevronDown size={16} className="rcs-chevron" />
      </button>

      {open && (
        <div className="rcs-pop">
          <div className="rcs-search">
            <Search size={15} />
            <input
              ref={searchRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={matches[active] ? `${uid}-opt-${matches[active].name}` : undefined}
              aria-label="Search cities"
              placeholder="Search city or district"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              autoComplete="off"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <ul id={listId} role="listbox" className="rcs-list" ref={listRef}>
            {matches.length === 0 && <li className="rcs-empty">No city matches “{query}”.</li>}
            {matches.map((city, i) => (
              <li
                key={city.name}
                id={`${uid}-opt-${city.name}`}
                role="option"
                aria-selected={city.name === value}
                data-active={i === active}
                className={`rcs-opt ${i === active ? "is-active" : ""} ${city.name === value ? "is-selected" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(city);
                }}
              >
                <span>
                  <b>{city.name}</b>
                  <small>{city.district} District</small>
                </span>
                {city.name === value && <Check size={15} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
