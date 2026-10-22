"use client";

import MobileDisclosure from "./MobileDisclosure";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { INITIAL_RATING } from "@/lib/rating";

export default function HomeContestNews({ compact = false }: {compact?: boolean}) {
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);
  const [slide, setSlide] = useState(0);
  const nextAdvance = useRef(0);
  function stopAutoplay() {
    nextAdvance.current = Date.now() + 60000;
  }
  const show = useCallback((index: number) => {
    const element = strip.current;
    if (!element) return;
    element.scrollTo({ left: ((index + 2) % 2) * element.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, []);
  useEffect(() => {
    if (compact) return;
    nextAdvance.current = Date.now() + 15000;
    const timer = window.setInterval(() => {
      const element = strip.current;
      if (!element || element.clientWidth === 0 || document.hidden || drag.current || Date.now() < nextAdvance.current) return;
      show(Math.round(element.scrollLeft / element.clientWidth) + 1);
      nextAdvance.current = Date.now() + 15000;
    }, 250);
    return () => window.clearInterval(timer);
  }, [show, compact]);
  if (compact) return <section className="compact-contest-news" aria-label="Contest news">
    <CalendarDays size={30} strokeWidth={1.6} aria-hidden="true" className="text-emerald-400" />
    <h2>Contest news</h2>
    <p className="compact-event-name">Round One · Nov 6</p>
    <p>10:00–11:30 am</p>
    <MobileDisclosure label="Details">
      <h3 className="mt-3 font-semibold">OCC Student Math League · Friday, November 6</h3>
      <RoundOneDetails />
      <h3 className="mt-5 border-t border-edge pt-4 font-semibold">Every Saturday</h3>
      <SaturdayDetails />
    </MobileDisclosure>
  </section>;
  return (
    <section data-home-entrance className="panel min-w-0 overflow-hidden border-emerald-400/30" aria-label="Contest news" aria-roledescription="carousel" onPointerDownCapture={stopAutoplay} onKeyDownCapture={stopAutoplay} onWheelCapture={stopAutoplay}>
      <div className="flex items-center justify-between gap-3 border-b border-edge px-6 py-4">
        <h2 className="text-sm font-semibold">Contest news</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs muted" aria-live="polite">{slide + 1} / 2</span>
          <button type="button" aria-label="Previous contest news" className="btn-secondary !min-h-10 !p-2" onClick={() => show(slide - 1)}><ChevronLeft size={18} /></button>
          <button type="button" aria-label="Next contest news" className="btn-secondary !min-h-10 !p-2" onClick={() => show(slide + 1)}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div ref={strip} className="grid auto-cols-[100%] grid-flow-col snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={event => setSlide(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))}
        onPointerDown={event => {
          if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as Element).closest("a,button")) return;
          drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft };
          event.currentTarget.style.scrollSnapType = "none";
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (!drag.current) return;
          event.currentTarget.scrollLeft = drag.current.left + drag.current.x - event.clientX;
        }}
        onPointerUp={event => {
          if (!drag.current) return;
          const shift = drag.current.x - event.clientX;
          const original = Math.round(drag.current.left / event.currentTarget.clientWidth);
          drag.current = null;
          stopAutoplay();
          event.currentTarget.style.scrollSnapType = "";
          event.currentTarget.releasePointerCapture(event.pointerId);
          show(Math.max(0, Math.min(1, original + (Math.abs(shift) > 40 ? Math.sign(shift) : 0))));
        }}
        onPointerCancel={event => {
          drag.current = null;
          event.currentTarget.style.scrollSnapType = "";
          show(slide);
        }}>
        <div className="min-w-0 snap-start select-none p-6 sm:p-8" role="group" aria-label="OCC Round One" aria-roledescription="slide" inert={slide !== 0}>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">OCC Student Math League</p>
          <h3 className="mt-4 text-2xl font-bold sm:text-3xl">Round One · Friday, November 6</h3>
          <RoundOneDetails />
        </div>
        <div className="flex min-w-0 snap-start select-none flex-col items-start p-6 sm:p-8" role="group" aria-label="Every Saturday" aria-roledescription="slide" inert={slide !== 1}>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400"><CalendarDays size={16} aria-hidden="true" /> Every Saturday</p>
          <h3 className="mt-4 text-2xl font-semibold sm:text-3xl">Solve together. Aim for your next title.</h3>
          <SaturdayDetails />
        </div>
      </div>
      <div className="flex justify-center gap-2 px-6 py-4" aria-label="Choose contest news">
        {["OCC Round One", "Every Saturday"].map((name, index) => <button key={name} type="button" aria-label={`Show ${name}`} aria-pressed={slide === index} onClick={() => show(index)} className="flex h-8 w-8 items-center justify-center"><span className={`h-2 rounded-full transition-all ${slide === index ? "w-5 bg-emerald-400" : "w-2 bg-edge"}`} /></button>)}
      </div>
    </section>
  );
}

function RoundOneDetails() { return <>
<dl className="mt-5 space-y-4">
            <div><dt className="text-sm muted">Time</dt><dd className="mt-1 text-lg font-semibold">10:00 am to 11:30 am <span className="block text-sm font-normal muted">1-hour test block</span></dd></div>
            <div><dt className="text-sm muted">Place</dt><dd className="mt-1 text-lg font-semibold">MBCC 318</dd></div>
          </dl>
          <h4 className="mt-5 border-t border-edge pt-4 text-lg font-semibold">Cash prizes</h4>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["1st place", "$100"], ["2nd place", "$75"], ["3rd place", "$50"], ["4th place", "$25"]].map(([place, prize]) => <div key={place} className="rounded-xl border border-edge bg-ink p-3 text-center"><dt className="text-xs muted">{place}</dt><dd className="mt-2 text-2xl font-bold text-emerald-400 sm:text-3xl">{prize}</dd></div>)}
          </dl>
</>; }

function SaturdayDetails() { return <>
<p className="mt-4 leading-7 muted">Join our Saturday contests to tackle math problems, challenge yourself alongside other students, and earn a competitive rating. Every contest is a chance to learn and improve.</p>
          <p className="mt-4 text-sm leading-6 muted">Start at {INITIAL_RATING}. Your performance in rated contests shapes your rating and title. Practice during the week, then put your skills to the test on Saturday.</p>
          <div className="mt-auto pt-6"><Link href="/contests" className="btn">Join a Saturday contest <ArrowRight size={16} /></Link></div>
</>; }
