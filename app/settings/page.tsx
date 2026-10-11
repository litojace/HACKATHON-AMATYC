"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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
  const { profile, user, demo, notify, refreshAccount } = useApp();
  const [name, setName] = useState(""),
    [school, setSchool] = useState(""),
    [avatar, setAvatar] = useState(""),
    [visible, setVisible] = useState(true),
    [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
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
    let uploadedPath: string | null = null;
    let saved = false;
    try {
      let avatarUrl = avatar;
      if (file) {
        if (!supabase || !user) throw new Error("Please log in again.");
        const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[file.type];
        if (!extension || file.size > 2 * 1024 * 1024) throw new Error("Choose a PNG, JPG, or WebP image up to 2 MB.");
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploadedPath = path;
        avatarUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
      await api(
        "me",
        {
          full_name: name,
          school: school || null,
          avatar_url: avatarUrl || null,
          is_public: visible,
        },
        "PATCH",
      );
      saved = true;
      setAvatar(avatarUrl);
      setFile(null);
      await refreshAccount();
      notify("Profile updated.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      if (uploadedPath && !saved && supabase) await supabase.storage.from("avatars").remove([uploadedPath]);
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
        <form className="panel p-8" onSubmit={save}>
          <fieldset disabled={busy} className="min-w-0 space-y-5">
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
          <div className="space-y-3">
            <p className="text-sm muted">Profile avatar</p>
            <div className="flex flex-wrap items-center gap-4">
              {preview || avatar ? <img src={preview || avatar} alt="Avatar preview" className="h-20 w-20 rounded-full object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-full bg-ink text-2xl font-semibold" aria-label="Default avatar">{name.trim().charAt(0).toUpperCase() || "?"}</span>}
              <label className="text-sm">
                <span className="underline underline-offset-4">Choose image</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} className="mt-2 block max-w-full" onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (!selected) return;
                  if (!["image/png", "image/jpeg", "image/webp"].includes(selected.type) || selected.size > 2 * 1024 * 1024) {
                    notify("Choose a PNG, JPG, or WebP image up to 2 MB.");
                    e.target.value = "";
                    return;
                  }
                  setFile(selected);
                }} />
              </label>
            </div>
            {(avatar || file) && <button type="button" className="text-sm underline underline-offset-4" disabled={busy} onClick={() => { setAvatar(""); setFile(null); }}>Remove avatar</button>}
            <p className="text-xs muted">Avatar images are public. PNG, JPG, or WebP, up to 2 MB. Save your profile to apply changes.</p>
          </div>
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
          </fieldset>
        </form>
      )}
    </>
  );
}
