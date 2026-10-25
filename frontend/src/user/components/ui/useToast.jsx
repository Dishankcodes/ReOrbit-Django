import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

/* const { toast, show } = useToast();  → render {toast} once in the page. */
export default function useToast() {
  const [message, setMessage] = useState("");
  const timer = useRef(null);

  const show = useCallback((text) => {
    setMessage(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(""), 3200);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toast = message ? (
    <div className="dn-toast" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
    </div>
  ) : null;

  return { toast, show };
}
