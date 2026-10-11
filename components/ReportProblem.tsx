"use client";
import AnimatedSelect from "@/components/AnimatedSelect";
import Link from "next/link";
import { useState } from "react";
import { useApp } from "./Providers";
import { api } from "@/lib/client";
export default function ReportProblem({problemId}:{problemId:string}) {
 const {user}=useApp();
 const [open,setOpen]=useState(false),[category,setCategory]=useState("incorrect_answer"),[details,setDetails]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function send(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");try{await api("reports/"+problemId,{category,details});setDetails("");setMessage("Report sent. An administrator will review it.");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <section className="mt-6"><button type="button" className="btn-secondary" aria-expanded={open} onClick={()=>setOpen(!open)}>Report a problem</button>{open&&<div className="panel mt-3 p-5">{!user?<p><Link className="text-emerald-400" href={"/login?next="+encodeURIComponent("/problems/"+problemId)}>Log in</Link> to submit a report.</p>:<form onSubmit={send} className="space-y-4"><fieldset disabled={busy} className="space-y-4"><label className="block text-sm">Issue<AnimatedSelect className="field mt-2" aria-label="Report category" value={category} onChange={e=>setCategory(e.target.value)}><option value="incorrect_answer">Incorrect answer or solution</option><option value="unclear_wording">Unclear wording</option><option value="missing_figure">Missing or unreadable figure</option><option value="other">Other</option></AnimatedSelect></label><label className="block text-sm">What should we check?<textarea className="field mt-2" required maxLength={2000} value={details} onChange={e=>setDetails(e.target.value)} /></label><button className="btn" disabled={!details.trim()}>{busy?"Sending…":"Send report"}</button></fieldset></form>}{message&&<p role="status" className="mt-3 text-sm">{message}</p>}</div>}</section>;
}
