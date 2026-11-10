import { useEffect, useState } from "react";

/* A whole-number field that behaves like people expect.
   While typing, the box shows exactly what was typed, so you can backspace
   the "1", clear the box and type "2". The value is only clamped to
   min..max when you leave the box (or press Enter). The parent always
   receives a valid number, never "" or NaN.

   <NumberInput value={qty} min={1} max={20} onChange={setQty} /> */
export default function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  className,
  ...rest
}) {
  const [text, setText] = useState(String(value ?? ""));

  // follow the parent when it changes the number itself (the +/- buttons, reset)
  useEffect(() => {
    setText((current) => (current === "" || Number(current) === Number(value) ? current : String(value ?? "")));
  }, [value]);

  const clamp = (n) => Math.min(max, Math.max(min, n));

  const commit = () => {
    const n = text === "" ? min : clamp(Number(text));
    setText(String(n));
    if (n !== value) onChange(n);
  };

  return (
    <input
      {...rest}
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").slice(0, String(max).length);
        setText(digits);
        // keep the parent in step while typing (clamped), but never push "" up
        if (digits !== "") {
          const n = clamp(Number(digits));
          if (n !== value) onChange(n);
        }
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
      }}
      onFocus={(event) => event.target.select()}
    />
  );
}
