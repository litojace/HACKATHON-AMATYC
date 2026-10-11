"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { AdminProblemSummary } from "@/lib/admin-problems";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import { useApp } from "@/components/Providers";
export default function AdminProblems() {
  const {user} = useApp();
  return <main className="mx-auto max-w-5xl px-5 py-10"><AccountGate requireAuth title="Sign in to manage problems." description="Only administrators can create and edit problems."><List key={user?.id} /></AccountGate></main>;
}
function List() {
  const [problems,setProblems] = useState<AdminProblemSummary[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  useEffect(() => {
    let active = true;
    api<AdminProblemSummary[]>("admin/problems").then(data => { if (active) setProblems(data); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  if (loading) return <Loading />;
  if (error) return <p role="alert" className="panel p-8">{error}</p>;
  const visible = problems.filter(p => `${p.title} ${p.id}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageTitle eyebrow="ADMINISTRATION" title="Manage problems" description="Drafts are private. Publish reviewed problems to add them to the library." />
    <div className="mb-5 flex flex-wrap gap-3"><Link href="/admin/problems/new" className="btn">Create problem</Link><input aria-label="Search managed problems" placeholder="Search name or ID" className="field max-w-md" value={search} onChange={e => setSearch(e.target.value)} /></div>
    <ul className="panel divide-y divide-edge">{visible.map(p => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{p.title}</p><p className="mt-1 text-xs muted">{p.id} · {p.category} · {p.difficulty} · {p.publication_status}</p></div><Link className="btn-secondary" href={"/admin/problems/" + encodeURIComponent(p.id)}>Edit</Link></li>)}</ul>
    {!visible.length && <p className="mt-4 muted">No matching problems.</p>}
  </>;
}
