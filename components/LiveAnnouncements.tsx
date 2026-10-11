"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { ANNOUNCEMENTS_UPDATED_EVENT, type Announcement } from "@/lib/announcements";
import { useApp } from "./Providers";

export default function LiveAnnouncements() {
  const { user, authLoading } = useApp();
  if (!user || authLoading || !supabase) return null;
  return <AnnouncementInbox key={user.id} />;
}

function AnnouncementInbox() {
  const { notify } = useApp();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const dismissed = useRef(new Set<string>());
  const active = useRef(true);

  useEffect(() => {
    const client = supabase!;
    let listening = true, pending = false;
    active.current = true;
    async function refresh() {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const { data, error } = await client.rpc("user_announcements");
        if (listening && !error && Array.isArray(data)) {
          setAnnouncements((data as Announcement[]).filter(item => !dismissed.current.has(item.id)));
        }
      } catch { /* Retry when the tab becomes visible or on the next poll. */ }
      finally { pending = false; }
    }
    void refresh();
    const timer = setInterval(refresh, 5000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener(ANNOUNCEMENTS_UPDATED_EVENT, refresh);
    return () => {
      listening = false;
      active.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener(ANNOUNCEMENTS_UPDATED_EVENT, refresh);
    };
  }, []);

  async function dismiss(announcement: Announcement) {
    if (dismissed.current.has(announcement.id)) return;
    dismissed.current.add(announcement.id);
    setAnnouncements(previous => previous.filter(item => item.id !== announcement.id));
    try {
      const { error } = await supabase!.rpc("dismiss_announcement", { p_id: announcement.id });
      if (error) throw error;
    } catch {
      if (!active.current) return;
      dismissed.current.delete(announcement.id);
      setAnnouncements(previous => [...previous.filter(item => item.id !== announcement.id), announcement].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      notify("Could not dismiss the announcement. Please try again.");
    }
  }

  if (!announcements.length) return null;
  return (
    <aside
      aria-label="Announcements"
      className="fixed left-4 right-4 top-24 z-40 max-h-[60vh] overflow-y-auto rounded-2xl border border-emerald-500/40 bg-panel shadow-xl sm:left-auto sm:w-96"
    >
      <h2 className="flex items-center gap-2 border-b border-edge px-4 py-3 text-sm font-semibold">
        <Bell size={17} aria-hidden="true" /> Announcements <span className="muted">({announcements.length})</span>
      </h2>
      <div aria-live="polite" aria-relevant="additions" className="divide-y divide-edge">
        {announcements.map(announcement => (
          <article key={announcement.id} className="p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-emerald-400">From the admins</p>
              <button
                type="button"
                aria-label="Dismiss announcement"
                onClick={() => void dismiss(announcement)}
                className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-ink"
              ><X size={18} aria-hidden="true" /></button>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{announcement.message}</p>
            <time dateTime={announcement.created_at} className="mt-3 block text-xs muted">{new Date(announcement.created_at).toLocaleString()}</time>
          </article>
        ))}
      </div>
    </aside>
  );
}
