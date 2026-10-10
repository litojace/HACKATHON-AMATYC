"use client";

import Image from "next/image";
import { useState } from "react";

const photos = [
  {
    src: "/images/community/student-math-league.png",
    alt: "AMATYC Student Math League competition flyer",
    label: "Math League",
    fit: "contain",
  },
  {
    src: "/images/community/practice-session.png",
    alt: "Students working together during a math practice session",
    label: "Practice",
    fit: "cover",
  },
  {
    src: "/images/community/pizza.png",
    alt: "Two pizzas",
    label: "Pizza",
    fit: "cover",
  },
  {
    src: "/images/community/whiteboard.png",
    alt: "A student solving math problems on a whiteboard",
    label: "Problem solving",
    fit: "cover",
  },
  {
    src: "/images/community/team.png",
    alt: "Students gathered after a math practice session",
    label: "Our team",
    fit: "cover",
  },
] as const;

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
  const [activePhoto, setActivePhoto] = useState(0);
  const photo = photos[activePhoto];

  function showPhoto(index: number) {
    setActivePhoto((index + photos.length) % photos.length);
  }

  return (
    <aside className="panel overflow-hidden p-4 sm:p-5" aria-label="AMATYC community">
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
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          fill
          priority={activePhoto === 0}
          sizes="(min-width: 1024px) 40vw, 100vw"
          className={photo.fit === "contain" ? "object-contain" : "object-cover"}
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-10 text-white">
          <p className="text-sm font-semibold">{photo.label}</p>
          <p className="text-xs text-white/80" aria-live="polite">
            {activePhoto + 1} of {photos.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => showPhoto(activePhoto - 1)}
          aria-label="Show previous photo"
          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-xl text-white backdrop-blur hover:bg-black/75"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => showPhoto(activePhoto + 1)}
          aria-label="Show next photo"
          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/55 text-xl text-white backdrop-blur hover:bg-black/75"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2" aria-label="Choose a photo">
        {photos.map((item, index) => (
          <button
            key={item.src}
            type="button"
            onClick={() => showPhoto(index)}
            aria-label={`Show photo ${index + 1}: ${item.label}`}
            aria-pressed={activePhoto === index}
            className={`relative aspect-[4/3] overflow-hidden rounded-md border-2 bg-ink ${activePhoto === index ? "border-emerald-400" : "border-transparent opacity-65 hover:opacity-100"}`}
          >
            <Image src={item.src} alt="" fill sizes="100px" className="object-cover" />
          </button>
        ))}
      </div>
    </aside>
  );
}
