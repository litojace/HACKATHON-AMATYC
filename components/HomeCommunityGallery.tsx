"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "./Providers";
import { carouselSchema, type CarouselPhoto } from "@/lib/carousel";



function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <path d="M19.7 5.2a18 18 0 0 0-4.4-1.4l-.5 1a16.7 16.7 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.4C1.5 9.3.7 13.3 1.1 17.3a18 18 0 0 0 5.4 2.7l1.2-2a11 11 0 0 1-1.9-.9l.5-.4a12.8 12.8 0 0 0 11.4 0l.5.4a11 11 0 0 1-1.9.9l1.2 2a18 18 0 0 0 5.4-2.7c.5-4.7-.8-8.6-3.2-12.1ZM8.8 14.7c-1.1 0-2-.9-2-2.1s.9-2.1 2-2.1 2 .9 2 2.1-.9 2.1-2 2.1Zm6.4 0c-1.1 0-2-.9-2-2.1s.9-2.1 2-2.1 2 .9 2 2.1-.9 2.1-2 2.1Z" />
    </svg>
  );
}

export default function HomeCommunityGallery() {
  const { user, authLoading } = useApp();
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [previousPhoto, setPreviousPhoto] = useState<number | null>(null);
  const [activePhoto, setActivePhoto] = useState(0);
  const [readyPhotos, setReadyPhotos] = useState<Set<number>>(new Set());
  const [galleryError, setGalleryError] = useState(false);
  const [reload, setReload] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [photos, setPhotos] = useState<CarouselPhoto[]>([]);
  const thumbnailStrip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    setGalleryError(false);
    api<CarouselPhoto[]>("carousel").then(data => {
      const parsed = carouselSchema.safeParse(data);
      if (!parsed.success) throw new Error("Invalid carousel");
      if (active) { setPhotos(parsed.data); setReadyPhotos(new Set()); setActivePhoto(0); }
    }).catch(() => { if (active) setGalleryError(true); });
    return () => { active = false; };
  }, [reload]);
  useEffect(() => {
    if (!user || authLoading || !supabase) return;
    let active = true;
    Promise.resolve(supabase.rpc("is_site_admin")).then(({ data, error }) => {
      if (active) setAdminUserId(!error && data === true ? user.id : null);
    }).catch(() => { if (active) setAdminUserId(null); });
    return () => { active = false; setAdminUserId(null); };
  }, [user, authLoading]);
  const photo = photos[activePhoto];
  useEffect(() => {
    if (photos.length < 2 || !readyPhotos.has(activePhoto) || paused || hovered || focused) return;
    const timer = window.setInterval(() => {
      if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const next = (activePhoto + 1) % photos.length;
      if (readyPhotos.has(next)) { setPreviousPhoto(activePhoto); setActivePhoto(next); }
    }, (photo?.duration_seconds ?? 2.5) * 1000);
    return () => window.clearInterval(timer);
  }, [activePhoto, photos.length, paused, hovered, focused, readyPhotos, photo?.duration_seconds]);
  useEffect(() => {
    const strip = thumbnailStrip.current;
    const selected = strip?.children[activePhoto] as HTMLElement | undefined;
    if (!strip || !selected) return;
    const left = selected.offsetLeft;
    const right = left + selected.offsetWidth;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    if (left < strip.scrollLeft) strip.scrollTo({ left, behavior });
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: right - strip.clientWidth, behavior });
  }, [activePhoto, photos.length]);

  useEffect(() => {
    if (previousPhoto === null) return;
    const timer = window.setTimeout(() => setPreviousPhoto(null), 800);
    return () => window.clearTimeout(timer);
  }, [previousPhoto, activePhoto]);

  function showPhoto(index: number) {
    const next = (index + photos.length) % photos.length;
    if (next === activePhoto || !readyPhotos.has(next)) return;
    setPreviousPhoto(activePhoto);
    setActivePhoto(next);
  }

  return (
    <aside className="panel min-w-0 overflow-hidden p-4 sm:p-5" aria-label="AMATYC community"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/images/amatyc-logo.png"
            alt="AMATYC logo"
            width={58}
            height={64}
            className="h-14 w-auto rounded-md"
          />
          <div>
            <p className="text-sm font-semibold">AMATYC community</p>
            <p className="mt-1 text-xs muted">Math, friends, and competition</p>
          </div>
        </div>
        <nav aria-label="AMATYC social links" className="flex gap-2">
          <a
            href="https://www.instagram.com/mat_occ/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit AMATYC on Instagram"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-edge bg-ink transition hover:border-emerald-500"
          >
            <InstagramIcon />
          </a>
          <a
            href="https://discord.gg/8xN546mwQ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join the AMATYC Discord"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-edge bg-ink transition hover:border-emerald-500"
          >
            <DiscordIcon />
          </a>
        </nav>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink">
        {!authLoading && user && adminUserId === user.id && (
          <Link
            href="/admin/carousel"
            aria-label="Edit carousel"
            className="absolute right-3 top-3 z-10 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/30 bg-black/70 px-3 py-2 text-sm font-medium text-white backdrop-blur hover:bg-black/90"
          >
            <Pencil size={16} aria-hidden="true" />
            Edit
          </Link>
        )}
        {photos.map((item, index) => <div
          key={`${index}-${item.src}`}
          aria-hidden={index !== activePhoto}
          className={`absolute inset-0 ${previousPhoto !== null ? index === activePhoto ? "carousel-slide-in" : index === previousPhoto ? "carousel-slide-out" : "" : ""}`}
          style={{ visibility: readyPhotos.has(index) && (index === activePhoto || index === previousPhoto) ? "visible" : "hidden", transform: `translateX(${index === activePhoto ? 0 : -100}%)`, zIndex: index === activePhoto ? 2 : 1 }}
        >
          <Image unoptimized loading="eager" onLoad={async (event) => {
            const image = event.currentTarget;
            try { await image.decode(); } catch { /* onLoad confirms the image is available. */ }
            setReadyPhotos(current => new Set(current).add(index));
          }} src={item.src} alt={item.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className={item.fit === "contain" ? "object-contain" : "object-cover"} />
        </div>)}
        {!readyPhotos.has(activePhoto) && <div className="absolute inset-0 flex items-center justify-center text-sm muted" role="status">{galleryError ? <div className="text-center"><p>Photos could not be loaded.</p><button type="button" className="btn-secondary mt-3" onClick={() => setReload(value => value + 1)}>Retry photos</button></div> : "Loading community photos…"}</div>}
        {photo && <div className="absolute z-[3] inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-10 text-white">
          <p className="text-sm font-semibold">{photo.label}</p>
          <p className="text-xs text-white/80" aria-live={paused || focused ? "polite" : "off"}>
            {activePhoto + 1} of {photos.length}
          </p>
        </div>}
        <button
          type="button"
          disabled={!photo || !readyPhotos.has((activePhoto - 1 + photos.length) % photos.length)}
          onClick={() => showPhoto(activePhoto - 1)}
          aria-label="Show previous photo"
          className="absolute z-[3] left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-xl text-white backdrop-blur hover:bg-black/75"
        >
          ‹
        </button>
        <button
          type="button"
          disabled={!photo || !readyPhotos.has((activePhoto + 1) % photos.length)}
          onClick={() => showPhoto(activePhoto + 1)}
          aria-label="Show next photo"
          className="absolute z-[3] right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-xl text-white backdrop-blur hover:bg-black/75"
        >
          ›
        </button>
      </div>

      {photos.length > 1 && <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Play slideshow" : "Pause slideshow"} className="mt-3 inline-flex min-h-10 items-center gap-2 text-xs muted hover:text-emerald-400">
        {paused ? <Play size={14} /> : <Pause size={14} />}
        {paused ? "Play slideshow" : "Pause slideshow"}
      </button>}

      <div ref={thumbnailStrip} className="carousel-thumbnails relative mt-3 flex w-full gap-2 overflow-x-auto pb-3" aria-label="Choose a photo">
        {photos.map((item, index) => (
          <button
            key={index}
            type="button"
            disabled={!readyPhotos.has(index)}
            onClick={() => showPhoto(index)}
            aria-label={`Show photo ${index + 1}: ${item.label}`}
            aria-pressed={activePhoto === index}
            className={`relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-md border-2 bg-ink ${activePhoto === index ? "border-emerald-400" : "border-transparent opacity-65 hover:opacity-100"}`}
          >
            <Image unoptimized src={item.src} alt="" fill sizes="100px" className="object-cover" />
          </button>
        ))}
      </div>
    </aside>
  );
}
