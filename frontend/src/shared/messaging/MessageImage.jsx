import React, { useEffect, useState } from "react";

import { messagingApi } from "../../api/messaging";

/* Photos are fetched one at a time and remembered, so a thread's text shows
   immediately and a photo already seen never loads twice. */
const cache = new Map();
const inflight = new Map();

function fetchImage(conversationId, messageId) {
  const key = `${conversationId}:${messageId}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (!inflight.has(key)) {
    inflight.set(
      key,
      messagingApi
        .image(conversationId, messageId)
        .then((image) => {
          cache.set(key, image);
          return image;
        })
        .finally(() => inflight.delete(key)),
    );
  }
  return inflight.get(key);
}

export default function MessageImage({ conversationId, message }) {
  const key = `${conversationId}:${message.id}`;
  const [src, setSrc] = useState(message.image || cache.get(key) || "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (message.image) {
      setSrc(message.image);
      return undefined;
    }
    if (!message.has_image || String(message.id).startsWith("pending-")) return undefined;
    let live = true;
    setFailed(false);
    fetchImage(conversationId, message.id)
      .then((image) => live && setSrc(image))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [conversationId, message.id, message.image, message.has_image]);

  if (src) return <img src={src} alt="Shared in chat" />;
  if (failed) return <span className="msgx-photo msgx-photo-failed">Photo could not be loaded</span>;
  return <span className="msgx-photo msgx-skel" aria-label="Loading photo" />;
}
