"use client";
import { useEffect, useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ANNOUNCEMENTS_UPDATED_EVENT, type Announcement } from "@/lib/announcements";
import { useApp } from "./Providers";

type History = { items: Announcement[]; has_more: boolean };
export default function AnnouncementArchive() {
  const { user } = useApp();
  return user && supabase ? <Archive key={user.id} /> : null;
}
function Archive() {
  const [page, setPage] = useState(0), [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<History | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void supabase!.rpc("announcement_history", { p_page: page }).then(({ data, error }) => {
      if (!active) return;
      if (error) { setError("Could not load announcements. Please try again."); }
      else setData(data as History);
      setLoading(false);
    }, () => {
      if (active) { setError("Could not load announcements. Please try again."); setLoading(false); }
    });
    return () => { active = false; };
  }, [page, refresh]);
  useEffect(() => {
    const update = () => { setPage(0); setRefresh(n => n + 1); };
    window.addEventListener(ANNOUNCEMENTS_UPDATED_EVENT, update);
    return () => window.removeEventListener(ANNOUNCEMENTS_UPDATED_EVENT, update);
  }, []);
  return <section id="announcements" className="panel mt-6 scroll-mt-24 p-5 sm:p-6" aria-labelledby="announcement-archive-title">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="announcement-archive-title" className="flex items-center gap-2 text-lg font-semibold"><Bell size={20} className="text-emerald-400" aria-hidden="true" />Announcement archive</h2>
      <button className="btn-secondary" disabled={loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={15} aria-hidden="true" />Refresh</button>
    </div>
    <p className="mt-2 text-sm muted">Revisit announcements sent to you, including those you’ve dismissed.</p>
    {loading ? <p className="mt-5 text-sm muted" role="status">Loading announcements…</p> : error ? <p className="mt-5 text-sm text-red-400" role="alert">{error}</p> : !data?.items.length ? <p className="mt-5 text-sm muted">No announcements yet. Updates from admins will appear here.</p> : <div className="mt-5 divide-y divide-edge">
      {data.items.map(item => <article key={item.id} className="py-4 first:pt-0">
        <p className="whitespace-pre-wrap break-words text-sm leading-7">{item.message}</p>
        <time dateTime={item.created_at} className="mt-2 block text-xs muted">{new Date(item.created_at).toLocaleString()}</time>
      </article>)}
    </div>}
    {(page>0 || data?.has_more) && <div className="mt-4 flex justify-end gap-3">
      <button className="btn-secondary" disabled={loading || page===0} onClick={() => setPage(n => n - 1)}>Newer</button>
      <button className="btn-secondary" disabled={loading || !data?.has_more} onClick={() => setPage(n => n + 1)}>Older</button>
    </div>}
  </section>;
}
