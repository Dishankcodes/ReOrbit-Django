/* Admin › open (or start) a direct chat with a member or ReMaker, then go to it.
   The server reuses an existing chat between the two, so pressing Message twice opens the same one. */
import { startConversation } from "../../shared/messagingStore";

export async function openChat(navigate, { type, id, name, image = "" }) {
  try {
    const convo = await startConversation({
      key: `${type}:${id}`,
      kind: type,
      name,
      subtitle: type === "remaker" ? "ReMaker" : "Member",
      image,
    });
    navigate(`/admin-messages/${convo}`);
  } catch (error) {
    window.dispatchEvent(
      new CustomEvent("reorbit:toast", { detail: error.message || "Could not open the chat." }),
    );
  }
}
