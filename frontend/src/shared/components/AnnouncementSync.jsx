/* Mount once inside a layout. Pushes the admin announcements meant for
   this audience into that app's own notification list. */
import { useEffect } from "react";
import { useMyAnnouncements } from "../announcements";

export default function AnnouncementSync({ audience, onSync }) {
  const list = useMyAnnouncements(audience);
  useEffect(() => {
    onSync(list);
  }, [list, onSync]);
  return null;
}
