"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { supabase } from "@/lib/supabaseClient";
import { carouselSchema, type CarouselPhoto } from "@/lib/carousel";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import Dialog from "@/components/ui/Dialog";

export default function CarouselAdmin() {
  return <main className="mx-auto max-w-4xl px-5 py-10"><AccountGate requireAuth title="Sign in to manage the carousel." description="Only approved administrators can edit homepage photos."><Editor /></AccountGate></main>;
}
function Editor() {
  const [photos, setPhotos] = useState<CarouselPhoto[]>([]);
  const [baseline, setBaseline] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    api<CarouselPhoto[]>("admin/carousel").then(data => {
      if (active) { const normalized = carouselSchema.parse(data); setPhotos(normalized); setBaseline(JSON.stringify(normalized)); }
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  function update(index: number, patch: Partial<CarouselPhoto>) {
    setPhotos(previous => previous.map((photo, i) => i === index ? { ...photo, ...patch } : photo));
    setMessage("");
  }
  function move(index: number, direction: number) {
    setPhotos(previous => {
      const next = [...previous];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
    setMessage("");
  }
  async function upload(index: number, file?: File) {
    if (!file || !supabase || busy) return;
    const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[file.type];
    if (!extension || file.size > 10 * 1024 * 1024) { setMessage("Choose a PNG, JPG, or WebP image up to 10 MB."); return; }
    setBusy(true); setMessage("");
    try {
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("carousel-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      update(index, { src: supabase.storage.from("carousel-images").getPublicUrl(path).data.publicUrl });
      setMessage("Image uploaded. Save changes to publish it.");
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  async function save() {
    const parsed = carouselSchema.safeParse(photos);
    if (!parsed.success) { setMessage("Use valid image URLs and a time between 1 and 30 seconds. Captions are optional. Keep 1–10 images."); return; }
    setBusy(true); setMessage("");
    try {
      const saved = await api<CarouselPhoto[]>("admin/carousel", parsed.data, "PUT");
      setPhotos(saved); setBaseline(JSON.stringify(saved)); setMessage("Carousel published. The homepage now uses these images.");
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  if (loading) return <Loading />;
  if (error) return <section className="panel p-8"><h1 className="text-2xl">Carousel management</h1><p role="alert" className="mt-4">{error}</p><Link href="/" className="btn-secondary mt-5">Back to home</Link></section>;
  const changed = baseline !== JSON.stringify(photos);
  return <>
    <PageTitle eyebrow="ADMINISTRATION" title="Edit homepage carousel" description="Upload or replace photos, edit captions, and arrange their order. Save changes to publish." />
    <fieldset disabled={busy} className="space-y-5">
      <section className="panel p-5">
        <label className="block text-sm">Time between slides (seconds)
          <input type="number" min="1" max="30" step="0.5" className="field mt-2 sm:max-w-48" value={photos[0]?.duration_seconds ?? 2.5} onChange={e => {
            const duration = e.target.valueAsNumber;
            setPhotos(previous => previous.map(photo => ({...photo, duration_seconds: duration})));
            setMessage("");
          }} />
        </label>
        <p className="mt-2 text-xs muted">Applies to the whole carousel. Save changes to publish.</p>
      </section>
      {photos.map((photo, index) => <section key={index} className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Image {index + 1}</h2><div className="flex gap-2">
          <button type="button" className="btn-secondary" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move image ${index + 1} up`}>↑</button>
          <button type="button" className="btn-secondary" disabled={index === photos.length - 1} onClick={() => move(index, 1)} aria-label={`Move image ${index + 1} down`}>↓</button>
          <button type="button" className="btn-secondary" disabled={photos.length === 1} onClick={() => setRemoveIndex(index)}>Remove image {index + 1}</button>
        </div></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-ink">{photo.src && <img src={photo.src} alt={photo.alt || "Image preview"} className={`h-full w-full ${photo.fit === "contain" ? "object-contain" : "object-cover"}`} />}</div>
          <div className="space-y-3">
            <label className="block text-sm">Upload / replace image<input type="file" accept="image/png,image/jpeg,image/webp" className="field mt-2" onChange={e => { void upload(index, e.target.files?.[0]); e.target.value = ""; }} /></label>
            <label className="block text-sm">Image URL<input className="field mt-2" value={photo.src} onChange={e => update(index, {src: e.target.value})} /></label>
            <label className="block text-sm">Caption (optional)<input className="field mt-2" maxLength={80} value={photo.label} onChange={e => update(index, {label: e.target.value})} /></label>
            <label className="block text-sm">Display<select className="field mt-2" value={photo.fit} onChange={e => update(index, {fit: e.target.value as CarouselPhoto["fit"]})}><option value="cover">Fill frame</option><option value="contain">Show whole image</option></select></label>
          </div>
        </div>
      </section>)}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary" disabled={photos.length >= 10} onClick={() => setPhotos(previous => [...previous, {src: "", label: "", alt: "", fit: "cover", duration_seconds: previous[0]?.duration_seconds ?? 2.5}])}>Add image</button>
        <button type="button" className="btn" disabled={!changed} onClick={save}>Save changes</button>
        <button type="button" className="btn-secondary" disabled={!changed} onClick={() => { setPhotos(JSON.parse(baseline)); setMessage(""); }}>Discard changes</button>
        <Link className="btn-secondary" href="/" target="_blank">View homepage</Link>
      </div>
    </fieldset>
    {busy && <p role="status" className="mt-4">Please wait…</p>}
    {message && <p role="status" className="mt-4">{message}</p>}
    {removeIndex !== null && <Dialog title="Remove this image?" onClose={() => setRemoveIndex(null)}>
      <p className="muted">Remove “{photos[removeIndex]?.label || `Image ${removeIndex + 1}`}” from the carousel? This change is published when you save.</p>
      <div className="mt-5 flex gap-3">
        <button type="button" className="btn-secondary" onClick={() => setRemoveIndex(null)}>Cancel</button>
        <button type="button" className="btn" onClick={() => {
          setPhotos(previous => previous.filter((_, i) => i !== removeIndex));
          setRemoveIndex(null);
          setMessage("");
        }}>Confirm removal</button>
      </div>
    </Dialog>}
  </>;
}
