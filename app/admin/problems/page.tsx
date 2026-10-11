"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { AdminProblemSummary } from "@/lib/admin-problems";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import { useApp } from "@/components/Providers";
import Dialog from "@/components/ui/Dialog";
export default function AdminProblems() {
  const {user} = useApp();
  return <main className="mx-auto max-w-5xl px-5 py-10"><AccountGate requireAuth title="Sign in to manage problems." description="Only administrators can create and edit problems."><List key={user?.id} /></AccountGate></main>;
}
function List() {
  const {reload,notify} = useApp();
  const [problems,setProblems] = useState<AdminProblemSummary[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState<AdminProblemSummary | null>(null);
  const [deleting,setDeleting] = useState(false);
  const [deleteError,setDeleteError] = useState("");
  async function remove() {
    if (!selected || deleting) return;
    setDeleting(true);setDeleteError("");
    try {
      await api("admin/problems/"+encodeURIComponent(selected.id),undefined,"DELETE");
      setProblems(previous => previous.filter(p => p.id !== selected.id));
      setSelected(null);await reload();notify("Problem deleted.");
    } catch (e) {setDeleteError((e as Error).message);}
    finally {setDeleting(false);}
  }
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
    <ul className="panel divide-y divide-edge">{visible.map(p => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">{p.title}</p><p className="mt-1 text-xs muted">{p.id} · {p.category} · {p.difficulty} · {p.publication_status}</p></div><div className="flex gap-2"><Link className="btn-secondary" href={"/admin/problems/" + encodeURIComponent(p.id)}>Edit</Link><button type="button" className="btn-secondary text-red-600" disabled={deleting} aria-label={"Delete "+p.title} onClick={() => {setSelected(p);setDeleteError("");}}>Delete</button></div></li>)}</ul>
    {!visible.length && <p className="mt-4 muted">No matching problems.</p>}
    {selected && <Dialog title="Delete this problem?" onClose={() => {if (!deleting) setSelected(null);}}>
      <p>Delete “{selected.title}”? It will disappear from the problem library and Manage problems. Existing attempts and contest results will be preserved. Unused problems are permanently deleted.</p>
      {deleteError && <p role="alert" className="mt-4 text-sm">{deleteError}</p>}
      <div className="mt-5 flex gap-3"><button type="button" className="btn-secondary" disabled={deleting} onClick={() => setSelected(null)}>Cancel</button><button type="button" className="btn bg-red-600 text-white" disabled={deleting} onClick={() => void remove()}>{deleting ? "Deleting…" : "Confirm delete"}</button></div>
    </Dialog>}
  </>;
}
