import { useEffect,useMemo,useSyncExternalStore } from "react";
import { messagingApi } from "../../api/messaging";
import { isSignedIn,SESSION_ENDED_EVENT } from "../../api/session";
export const KINDS=[{key:"all",label:"All"},{key:"unread",label:"Unread"},{key:"customer",label:"Customers"},{key:"remaker",label:"ReMakers"},{key:"reorbit",label:"ReOrbit"}];
export const QUICK_REPLIES={customer:["Thank you for your order! I will pack it today.","Your order is ready for pickup whenever you are free.","Happy to share more photos."],remaker:["Love your work! How did you finish the surface?","Thanks for the tip, that helps a lot."],reorbit:["Thanks, I will update this today.","Could you share the pickup window?"]};
let conversations=[];let loading=false;let pollTimer=null;let pollRefs=0;let activeId=null;const listeners=new Set();const subscribe=f=>{listeners.add(f);return()=>listeners.delete(f)};const emit=()=>listeners.forEach(f=>f());const getSnapshot=()=>conversations;const update=x=>{conversations=x;emit()};const mergeConversation=detail=>update(conversations.some(c=>c.id===detail.id)?conversations.map(c=>c.id===detail.id?detail:c):[detail,...conversations]);
export const lastMessage=c=>c?.messages?.[c.messages.length-1]||c?.last_message||{text:"",at:c?.updated_at||new Date().toISOString()};
export async function loadConversations() {
  if (loading || !isSignedIn("remaker")) return;
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
function usePoll(){useEffect(()=>{loadConversations().catch(()=>{});pollRefs++;if(!pollTimer)pollTimer=window.setInterval(()=>loadConversations().catch(()=>{}),5000);return()=>{pollRefs--;if(pollRefs===0&&pollTimer){window.clearInterval(pollTimer);pollTimer=null;activeId=null}}},[])}
export function useConversations(){const list=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);usePoll();return useMemo(()=>[...list].sort((a,b)=>new Date(lastMessage(b).at)-new Date(lastMessage(a).at)),[list])}
export function useConversation(id){const list=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);usePoll();useEffect(()=>{activeId=id||null;if(id)messagingApi.get(id).then(mergeConversation).catch(()=>{})},[id]);return list.find(c=>c.id===id)||null}
export function useTotalUnread(){const list=useSyncExternalStore(subscribe,getSnapshot,getSnapshot);usePoll();return list.reduce((n,c)=>n+(c.unread||0),0)}
export async function sendMessage(id,{text="",image=""}={}){const row=await messagingApi.send(id,{text:text.trim(),image});update(conversations.map(c=>c.id===id?{...c,messages:[...c.messages,row],unread:0}:c));return row}
export function markConversationRead(id){messagingApi.read(id).then(()=>update(conversations.map(c=>c.id===id?{...c,unread:0}:c))).catch(()=>{})}
export function markConversationUnread(id){messagingApi.unread(id).then(()=>loadConversations()).catch(()=>{})}
export function resetMessages(){return loadConversations()}
if(typeof window!=="undefined")window.addEventListener(SESSION_ENDED_EVENT,()=>update([]));
export function clockLabel(iso){return new Date(iso).toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit",hour12:true}).toLowerCase()}
export function listTime(iso){const d=new Date(iso),n=new Date(),s=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime();if(d.getTime()>=s)return clockLabel(iso);if(d.getTime()>=s-86400000)return "Yesterday";return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}
export function dayLabel(iso){const d=new Date(iso),n=new Date(),s=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime();if(d.getTime()>=s)return "Today";if(d.getTime()>=s-86400000)return "Yesterday";return d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}
