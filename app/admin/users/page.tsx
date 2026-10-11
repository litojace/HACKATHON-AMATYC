"use client";
import AnimatedSelect from "@/components/AnimatedSelect";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import { getCodeforcesTitle } from "@/lib/rating";
type Member = {id:string;full_name:string;rating:number;school:string|null};
export default function AdminUsers() {
 return <main className="mx-auto max-w-3xl px-5 py-10"><AccountGate requireAuth><Editor /></AccountGate></main>;
}
function Editor() {
 const {user,refreshAccount}=useApp();
 const [members,setMembers]=useState<Member[]|null>(null),[selected,setSelected]=useState(""),[rating,setRating]=useState(""),[reason,setReason]=useState(""),[error,setError]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;api<Member[]>("admin/users").then(data=>{if(!active)return;setMembers(data);const member=data.find(p=>p.id===user?.id)??data[0];if(member){setSelected(member.id);setRating(String(member.rating));}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[user?.id]);
 const current=members?.find(p=>p.id===selected);
 async function save(e:React.FormEvent){e.preventDefault();if(!current||busy)return;setBusy(true);setMessage("");try{const result=await api<{rating:number}>("admin/users/"+selected,{rating:Number(rating),reason},"PATCH");setMembers(previous=>previous!.map(p=>p.id===selected?{...p,rating:result.rating}:p));setReason("");setMessage("Rating updated. The user’s rank and leaderboard now reflect this rating.");await refreshAccount();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <><PageTitle eyebrow="ADMINISTRATION" title="Manage user ratings" description="Adjust any user’s rating, including your own. Each change is recorded with your reason." />{error?<p role="alert" className="panel p-6">{error}</p>:!members?<Loading />:<form onSubmit={save} className="panel p-6"><fieldset disabled={busy} className="space-y-5"><label className="block text-sm">User<AnimatedSelect aria-label="User" className="field mt-2" value={selected} onChange={e=>{setSelected(e.target.value);setRating(String(members.find(p=>p.id===e.target.value)!.rating));setReason("");setMessage("");}}>{members.map(p=><option key={p.id} value={p.id}>{p.full_name}{p.id===user?.id?" (you)":""}{p.school?" · "+p.school:""}</option>)}</AnimatedSelect></label>{current&&<p className="muted text-sm">Current rating: {current.rating} · {getCodeforcesTitle(current.rating).title}</p>}<label className="block text-sm">New rating<input className="field mt-2" type="number" min="1" max="10000" step="1" required value={rating} onChange={e=>setRating(e.target.value)} /></label><label className="block text-sm">Reason<textarea className="field mt-2" required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} /></label><button className="btn" disabled={!current||Number(rating)===current.rating||!reason.trim()}>{busy?"Saving…":"Update rating"}</button></fieldset>{message&&<p role="status" className="mt-5 text-sm">{message}</p>}</form>}</>;
}
