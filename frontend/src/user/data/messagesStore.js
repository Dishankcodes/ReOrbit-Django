import { useEffect, useMemo, useSyncExternalStore } from "react";
import { messagingApi } from "../../api/messaging";
import { getAccount, isSignedIn, SESSION_ENDED_EVENT } from "../../api/session";

export const KINDS = [{key:"all",label:"All"},{key:"unread",label:"Unread"},{key:"seller",label:"Sellers"},{key:"buyer",label:"Buyers"},{key:"remaker",label:"ReMakers"},{key:"reorbit",label:"ReOrbit"}];
export const QUICK_REPLIES={seller:["Is this still available?","Can you share one more photo of the condition?","Is the price negotiable?","Can you deliver to my pincode?"],buyer:["Thank you! I will pack it today.","Yes, it is still available.","Happy to share more photos.","I can hold it for you until tomorrow."],remaker:["Love your work! Can you make something similar?","What materials did you use?","How long would a custom piece take?"],reorbit:["Thanks, that helps.","Could you update me on this?","I have added the details you asked for."]};
let conversations=[];let loading=false;let pollTimer=null;let pollRefs=0;let activeId=null;
const listeners=new Set();const subscribe=f=>{listeners.add(f);return()=>listeners.delete(f)};const emit=()=>listeners.forEach(f=>f());const getSnapshot=()=>conversations;
const update=next=>{conversations=next;emit()};
const mergeConversation=detail=>update(conversations.some((c)=>c.id===detail.id)?conversations.map((c)=>c.id===detail.id?detail:c):[detail,...conversations]);
export const lastMessage=c=>c?.messages?.[c.messages.length-1]||c?.last_message||{text:"",at:c?.updated_at||c?.updatedAt||new Date().toISOString()};
export async function loadConversations() {
  if (loading || !isSignedIn()) return;
  loading = true;
  try {
    const rows = await messagingApi.list();
    update(rows.map((row) => {
      const current = conversations.find((conversation) => conversation.id === row.id);
      return current?.messages?.length ? { ...row, messages: current.messages } : row;
    }));
    if (activeId) {
      const detail = await messagingApi.get(activeId);
      mergeConversation(detail);
    }
  } finally {
    loading = false;
  }
}
function usePoll(enabled = true) {
  useEffect(() => {
    loadConversations().catch(() => {});
    if (!enabled) return undefined;
    pollRefs += 1;
    if (!pollTimer) {
      pollTimer = window.setInterval(() => loadConversations().catch(() => {}), 5000);
    }
    return () => {
      pollRefs -= 1;
      if (pollRefs === 0 && pollTimer) {
        window.clearInterval(pollTimer);
        pollTimer = null;
        activeId = null;
      }
    };
  }, [enabled]);
}
export function useConversations(poll = true) {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  usePoll(poll);
  return useMemo(
    () => [...list].sort((a, b) => new Date(lastMessage(b).at) - new Date(lastMessage(a).at)),
    [list],
  );
}
export function useConversation(id){const list=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);usePoll();useEffect(()=>{activeId=id||null;if(id)messagingApi.get(id).then(mergeConversation).catch(()=>{})},[id]);return list.find(c=>c.id===id)||null}
export function useTotalUnread(){const list=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);usePoll();return list.reduce((n,c)=>n+(c.unread||0),0)}
export async function sendMessage(id,{text="",image=""}={}){const row=await messagingApi.send(id,{text:text.trim(),image});update(conversations.map(c=>c.id===id?{...c,unread:0,messages:[...c.messages,row]}:c));return row}
export function markConversationRead(id){messagingApi.read(id).then(()=>update(conversations.map(c=>c.id===id?{...c,unread:0}:c))).catch(()=>{})}
export function markConversationUnread(id){messagingApi.unread(id).then(()=>loadConversations()).catch(()=>{})}
export function deleteConversation(id){messagingApi.archive(id).then(()=>update(conversations.filter(c=>c.id!==id))).catch(()=>{})}
export async function startConversation({key,kind,name,subtitle,image="",context=null}){const [role,raw=""]=String(key||"").split(":");let target_type=role==="seller"?"user":role;let target_id=raw.replace(/^(user|remaker|admin)-/,"");if(!["user","remaker","admin"].includes(target_type))throw new Error("Choose a valid recipient.");const conv=await messagingApi.start({target_type,target_id,kind:kind||target_type,subject:name||"",context:context||{},display:{name,subtitle,image}});update([conv,...conversations.filter(c=>c.id!==conv.id)]);return conv.id}
export function resetMessages(){return loadConversations()}
if(typeof window!=="undefined")window.addEventListener(SESSION_ENDED_EVENT,()=>update([]));
export function clockLabel(iso){return new Date(iso).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit",hour12:true}).toLowerCase()}
const startToday=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()};
export function listTime(iso){const d=new Date(iso);if(d.getTime()>=startToday())return clockLabel(iso);if(d.getTime()>=startToday()-86400000)return "Yesterday";return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
export function dayLabel(iso){const d=new Date(iso);if(d.getTime()>=startToday())return "Today";if(d.getTime()>=startToday()-86400000)return "Yesterday";return d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}
