import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

/* const { toast, toastNode } = useToast();
   toast("Account suspended");   ...and render {toastNode} once. */
export default function useToast() {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  const toast = useCallback((text) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const toastNode = message ? (
    <div className="ad-toast" role="status">
      <CheckCircle2 size={17} />
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setMessage(null)}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  ) : null;

  return { toast, toastNode };
}
