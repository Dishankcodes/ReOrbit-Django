import React, { useLayoutEffect, useRef } from "react";
import { localDigits, toPhone } from "../phone";
import "./PhoneInput.css";

const format = (d) => (d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);
/* where the caret goes so it sits after the same number of digits as before */
const caretAt = (text, digitsBefore) => {
  if (digitsBefore <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (/\d/.test(text[i])) seen += 1;
    if (seen === digitsBefore) return i + 1;
  }
  return text.length;
};

/* A phone box with a fixed +91 in front: digits only, at most 10.
   It hands back the full number ("+91 98765 43210") through onValue(value),
   and also through onChange({ target: { name, value } }) for forms that use one handler. */
export default function PhoneInput({
  id,
  name = "phone",
  value,
  onValue,
  onChange,
  className = "",
  inputClassName = "",
  placeholder = "98765 43210",
  disabled = false,
  invalid = false,
  required = false,
  autoFocus = false,
  "aria-label": ariaLabel = "10-digit mobile number",
}) {
  const inputRef = useRef(null);
  const caret = useRef(null); // digits before the caret, kept across the re-render
  const digits = localDigits(value);
  const shown = format(digits);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (caret.current == null || !el || document.activeElement !== el) return;
    const pos = caretAt(shown, caret.current);
    el.setSelectionRange(pos, pos);
    caret.current = null;
  }, [shown]);

  const emit = (d) => {
    const next = toPhone(d);
    onValue?.(next);
    onChange?.({ target: { name, value: next } });
  };

  const onType = (e) => {
    const el = e.target;
    // the box holds only the 10 local digits (+91 is outside it), so take them as typed
    const raw = el.value;
    const before = raw.slice(0, el.selectionStart ?? raw.length).replace(/\D/g, "").length;
    let d = raw.replace(/\D/g, "");
    if (d.length > 10) {
      // typed over a full number: keep what was typed at the caret, drop the overflow at the end
      d = d.slice(0, 10);
    }
    caret.current = Math.min(before, 10);
    emit(d);
  };

  return (
    <span className={`ph-input ${disabled ? "is-disabled" : ""} ${className}`}>
      <span className="ph-prefix" aria-hidden="true">
        +91
      </span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        className={inputClassName}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        onChange={onType}
        onPaste={(e) => {
          // a pasted number may carry +91, 91 or a leading 0
          e.preventDefault();
          caret.current = 10;
          emit(localDigits(e.clipboardData.getData("text")));
        }}
      />
    </span>
  );
}
