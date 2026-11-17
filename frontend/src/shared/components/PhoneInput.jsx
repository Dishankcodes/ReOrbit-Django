import React from "react";
import { localDigits, toPhone } from "../phone";
import "./PhoneInput.css";

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
  const digits = localDigits(value);
  const shown = digits.length > 5 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;

  const emit = (raw) => {
    const next = toPhone(raw);
    onValue?.(next);
    onChange?.({ target: { name, value: next } });
  };

  return (
    <span className={`ph-input ${disabled ? "is-disabled" : ""} ${className}`}>
      <span className="ph-prefix" aria-hidden="true">
        +91
      </span>
      <input
        id={id}
        name={name}
        className={inputClassName}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={11 /* 10 digits + the space */}
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        onChange={(e) => emit(e.target.value)}
        onPaste={(e) => {
          e.preventDefault();
          emit(e.clipboardData.getData("text"));
        }}
      />
    </span>
  );
}
