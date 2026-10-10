"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useApp } from "@/components/Providers";
import { AccountGate, PageTitle } from "@/components/Shared";
export default function Settings() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <AccountGate>
        <Content />
      </AccountGate>
    </main>
  );
}
function Content() {
  const { profile, demo, notify, refreshAccount } = useApp();
  const [name, setName] = useState(""),
    [school, setSchool] = useState(""),
    [avatar, setAvatar] = useState(""),
    [visible, setVisible] = useState(true),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (profile) {
      setName(profile.full_name);
      setSchool(profile.school ?? "");
      setAvatar(profile.avatar_url ?? "");
      setVisible(profile.is_public);
    }
  }, [profile]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        "me",
        {
          full_name: name,
          school: school || null,
          avatar_url: avatar || null,
          is_public: visible,
        },
        "PATCH",
      );
      await refreshAccount();
      notify("Profile updated.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ACCOUNT PREFERENCES"
        title="Make this space yours."
        description="Use the theme button in the header to choose dark or light mode."
      />
      {demo ? (
        <div className="panel p-8">
          <p className="muted">
            Profile settings require a Supabase account. Your demo bookmarks and
            attempts are browser-local.
          </p>
          <p className="mt-5 text-sm">
            See README.md for account configuration. No privileged credentials
            belong in browser variables.
          </p>
        </div>
      ) : (
        <form className="panel space-y-5 p-8" onSubmit={save}>
          <label className="block text-sm muted">
            Display name
            <input
              className="field mt-2"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm muted">
            School (optional)
            <input
              className="field mt-2"
              maxLength={100}
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            />
          </label>
          <label className="block text-sm muted">
            Avatar URL (optional HTTPS)
            <input
              className="field mt-2"
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
            />
            Show my profile and rating publicly
          </label>
          <p className="text-xs muted">
            Ratings and rated contest counts are controlled by the platform.
            Turning visibility off removes your profile from the public
            leaderboard.
          </p>
          <button disabled={busy} className="btn">
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
    </>
  );
}
