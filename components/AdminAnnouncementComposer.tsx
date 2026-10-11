"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  ANNOUNCEMENT_MAX_LENGTH,
  ANNOUNCEMENTS_UPDATED_EVENT,
  type PostedAnnouncement,
} from "@/lib/announcements";

export default function AdminAnnouncementComposer() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function post(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!supabase || busy || !text || text.length > ANNOUNCEMENT_MAX_LENGTH) return;
    setBusy(true);
    setResult("");
    setError("");
    try {
      const { data, error: failure } = await supabase.rpc("admin_post_announcement", { p_message: text });
      if (failure) throw failure;
      const announcement = data as PostedAnnouncement;
      setMessage("");
      setResult(`Announcement sent to ${announcement.recipient_count} online ${announcement.recipient_count === 1 ? "user" : "users"}.`);
      window.dispatchEvent(new Event(ANNOUNCEMENTS_UPDATED_EVENT));
    } catch {
      setError("Could not post the announcement. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 border-t border-edge pt-6" aria-labelledby="announcement-composer-title">
      <h2 id="announcement-composer-title" className="flex items-center gap-2 text-lg font-semibold">
        <Megaphone size={20} aria-hidden="true" /> Post an announcement
      </h2>
      <p id="announcement-audience" className="mt-2 text-sm muted">Send a message to everyone currently online. It stays visible until they dismiss it.</p>
      <form className="mt-4" onSubmit={post}>
        <label className="block text-sm font-medium" htmlFor="announcement-message">Announcement</label>
        <textarea
          id="announcement-message"
          className="field mt-2 min-h-32 resize-y"
          aria-describedby="announcement-audience announcement-length"
          placeholder="Write your announcement…"
          maxLength={ANNOUNCEMENT_MAX_LENGTH}
          required
          disabled={busy}
          value={message}
          onChange={event => { setMessage(event.target.value); setResult(""); setError(""); }}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p id="announcement-length" className="text-xs muted">{message.length}/{ANNOUNCEMENT_MAX_LENGTH} characters</p>
          <button className="btn" disabled={busy || !message.trim()}>{busy ? "Posting…" : "Post announcement"}</button>
        </div>
        {result && <p className="mt-4 text-sm text-[var(--success)]" role="status">{result}</p>}
        {error && <p className="mt-4 text-sm text-red-400" role="alert">{error}</p>}
      </form>
    </section>
  );
}
