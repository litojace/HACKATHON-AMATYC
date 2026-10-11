"use client";
import AnimatedSelect from "@/components/AnimatedSelect";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {api} from "@/lib/client";
import {CONTEST_PRESETS,adminContestSchema,type AdminContest} from "@/lib/admin-contests";
import type {AdminProblemSummary} from "@/lib/admin-problems";
import {AccountGate,Loading,PageTitle} from "@/components/Shared";
import {useApp} from "@/components/Providers";
import AdminProblemEditor from "@/components/AdminProblemEditor";
function localDate(time:number){const d=new Date(time);return new Date(time-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
export default function NewContest(){const {user}=useApp();return <main className="mx-auto max-w-6xl px-5 py-10"><AccountGate requireAuth title="Sign in to manage contests." description="Only administrators can create contests."><Creator key={user?.id}/></AccountGate></main>;}
function Creator(){
 const router=useRouter();const [problems,setProblems]=useState<AdminProblemSummary[]|null>(null),[error,setError]=useState("");
 const [name,setName]=useState(""),[description,setDescription]=useState(""),[count,setCount]=useState(5),[starts,setStarts]=useState(()=>localDate(Date.now()+3600000)),[ends,setEnds]=useState(()=>localDate(Date.now()+7200000));
 const [selected,setSelected]=useState<string[]>([]),[search,setSearch]=useState(""),[editingNew,setEditingNew]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{let active=true;Promise.all([api("admin/contests"),api<AdminProblemSummary[]>("admin/problems")]).then(([,p])=>{if(active)setProblems(p);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function save(published:boolean){
  if(busy)return;setMessage("");
  const startTime=new Date(starts),endTime=new Date(ends);
  if(!Number.isFinite(startTime.getTime())||!Number.isFinite(endTime.getTime())){setMessage("Choose start and closing times.");return;}
  const parsed=adminContestSchema.safeParse({name,description,question_count:count,starts_at:startTime.toISOString(),ends_at:endTime.toISOString(),published,problem_ids:selected});
  if(!parsed.success){setMessage(parsed.error.issues.map(i=>i.message).join("\n"));return;}
  setBusy(true);
  try{const contest=await api<AdminContest>("admin/contests",parsed.data);router.push("/admin/contests/"+contest.id);}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}
 }
 if(error)return <p role="alert" className="panel p-6">{error}</p>;
 if(!problems)return <Loading/>;
 const filtered=problems.filter(p=>`${p.title} ${p.id} ${p.category}`.toLowerCase().includes(search.toLowerCase()));
 return <><PageTitle eyebrow="ADMINISTRATION" title="Create contest" description="Reuse reviewed problems or create new ones. Each question is copied into this contest to preserve its content."/>
 <Link className="btn-secondary mb-5" href="/admin/contests">Manage contests</Link>
 <fieldset disabled={busy} className="panel grid gap-4 p-5 sm:grid-cols-2">
  <label className="text-sm">Contest name<input className="field mt-2" maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label>
  <label className="text-sm">Contest length<AnimatedSelect className="field mt-2" value={count} onChange={e=>setCount(Number(e.target.value))}>{CONTEST_PRESETS.map(p=><option key={p.count} value={p.count}>{p.count} questions · {p.minutes} minutes</option>)}</AnimatedSelect></label>
  <label className="text-sm">Starts at (your local time)<input className="field mt-2" type="datetime-local" value={starts} onChange={e=>setStarts(e.target.value)}/></label>
  <label className="text-sm">Closes at (your local time)<input className="field mt-2" type="datetime-local" value={ends} onChange={e=>setEnds(e.target.value)}/></label>
  <label className="text-sm sm:col-span-2">Description<textarea className="field mt-2" rows={3} value={description} onChange={e=>setDescription(e.target.value)}/></label>
  <p className="text-sm muted sm:col-span-2">Each user gets {count*3} minutes and one attempt. All attempts end when the event closes. Rating updates and solutions become available 15 minutes after closing. Scoring: +2 correct, −0.5 incorrect, 0 blank.</p>
 </fieldset>
 <div className="mt-6 grid gap-5 lg:grid-cols-2">
 <section className="panel p-5"><h2 className="font-semibold">Choose existing problems</h2><input aria-label="Search contest problems" className="field my-4" placeholder="Search title, ID or category" value={search} onChange={e=>setSearch(e.target.value)}/><div className="max-h-96 space-y-2 overflow-y-auto">{filtered.map(p=><label key={p.id} className="flex gap-3 rounded-lg border border-edge p-3 text-sm"><input type="checkbox" checked={selected.includes(p.id)} disabled={busy||(!selected.includes(p.id)&&selected.length>=count)} onChange={e=>setSelected(previous=>e.target.checked?[...previous,p.id]:previous.filter(id=>id!==p.id))}/><span>{p.title}<span className="mt-1 block text-xs muted">{p.category} · {p.difficulty} · {p.publication_status}</span></span></label>)}</div></section>
 <section className="panel p-5"><h2 className="font-semibold">Question order · {selected.length}/{count}</h2><ol className="mt-4 space-y-3">{selected.map((id,i)=><li key={id} className="rounded-lg border border-edge p-3"><p className="text-sm">{i+1}. {problems.find(p=>p.id===id)?.title??id}</p><div className="mt-2 flex flex-wrap gap-2"><button className="btn-secondary !px-3 !py-2" disabled={busy||i===0} onClick={()=>setSelected(previous=>{const next=[...previous];[next[i-1],next[i]]=[next[i],next[i-1]];return next;})}>Move up</button><button className="btn-secondary !px-3 !py-2" disabled={busy||i===selected.length-1} onClick={()=>setSelected(previous=>{const next=[...previous];[next[i+1],next[i]]=[next[i],next[i+1]];return next;})}>Move down</button><button className="btn-secondary !px-3 !py-2" disabled={busy} onClick={()=>setSelected(previous=>previous.filter(value=>value!==id))}>Remove</button><Link href={"/admin/problems/"+id} target="_blank" className="btn-secondary !px-3 !py-2">Review source</Link></div></li>)}</ol><button className="btn-secondary mt-5" disabled={busy||selected.length>=count} onClick={()=>setEditingNew(true)}>Create a new problem</button><p className="mt-3 text-xs muted">Mark new problems as reviewed and save a private draft before adding them. Your contest selection stays here while you work.</p></section>
 </div>
 {editingNew&&<section className="panel mt-5 p-5"><button className="btn-secondary" onClick={()=>setEditingNew(false)}>Cancel new problem</button><AdminProblemEditor embedded onSaved={p=>{setProblems(previous=>[...(previous??[]),p]);setSelected(previous=>previous.length<count?[...previous,p.id]:previous);setEditingNew(false);}}/></section>}
 {message&&<p role="alert" className="mt-5 whitespace-pre-line text-sm">{message}</p>}
 <div className="mt-6 flex gap-3"><button className="btn-secondary" disabled={busy||editingNew} onClick={()=>void save(false)}>Save contest draft</button><button className="btn" disabled={busy||editingNew} onClick={()=>void save(true)}>{busy?"Saving…":"Publish contest"}</button></div></>;
}
