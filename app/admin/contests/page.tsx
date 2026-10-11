"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {api} from "@/lib/client";
import type {AdminContest} from "@/lib/admin-contests";
import {AccountGate,Loading,PageTitle} from "@/components/Shared";
import {useApp} from "@/components/Providers";
export default function AdminContests() {
 const {user}=useApp();
 return <main className="mx-auto max-w-5xl px-5 py-10"><AccountGate requireAuth title="Sign in to manage contests." description="Only administrators can create and monitor contests."><List key={user?.id}/></AccountGate></main>;
}
function List() {
 const [contests,setContests]=useState<AdminContest[]|null>(null),[error,setError]=useState("");
 useEffect(()=>{let active=true;api<AdminContest[]>("admin/contests").then(data=>{if(active)setContests(data);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 if(error)return <p role="alert" className="panel p-6">{error}</p>;
 if(!contests)return <Loading/>;
 return <><PageTitle eyebrow="ADMINISTRATION" title="Manage contests" description="Create scheduled competitions and follow participant progress."/><Link className="btn mb-5" href="/admin/contests/new">Create contest</Link><ul className="panel divide-y divide-edge">{contests.map(c=><li key={c.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold">{c.name}</h2><p className="mt-2 text-sm muted">{c.question_count} questions · {c.duration_seconds/60} minutes · {c.published?"Published":"Private draft"} · {c.participants??0} participants</p>{c.starts_at&&<p className="mt-1 text-xs muted">{new Date(c.starts_at).toLocaleString()} – {new Date(c.ends_at!).toLocaleString()}</p>}</div><Link className="btn-secondary" href={"/admin/contests/"+c.id}>Monitor contest</Link></li>)}</ul>{!contests.length&&<p className="mt-5 muted">No contests yet.</p>}</>;
}
