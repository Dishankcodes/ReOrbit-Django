/* The User and Admin messaging screens share one server-backed store. */
export {
  QUICK_REPLIES,
  clockLabel,
  useConversationCounts,
  dayLabel,
  deleteConversation,
  lastMessage,
  loadMoreConversations,
  loadOlderMessages,
  markConversationRead,
  markConversationUnread,
  resetMessages,
  refreshMessages,
  sendMessage,
  startConversation,
  useConversation,
  useConversations,
  useMessageStatus,
  useTotalUnread,
  useUnreadConversations,
} from "../../shared/messagingStore";
export { USER_KINDS as KINDS, listTime } from "../../shared/messagingStore";
