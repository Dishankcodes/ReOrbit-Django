/* ReMaker messaging is the same persistent system used by User and Admin. */
export {
  QUICK_REPLIES,
  clockLabel,
  useConversationCounts,
  dayLabel,
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
export { REMAKER_KINDS as KINDS, listTime } from "../../shared/messagingStore";
