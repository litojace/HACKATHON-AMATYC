"use client";
import { useEffect, useRef, useState } from "react";
import { BookOpen, FileText, Database, CalendarDays } from "lucide-react";
import { api } from "@/lib/client";
export default function Statistics({ yearRange }: { yearRange: string }) {
  const [data, setData] = useState<{
      problems: number;
      contests: number;
      competitors: number;
      attempts: number;
      demo: boolean;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<typeof data>("stats")
      .then(setData)
      .catch(() => setError("Statistics unavailable"));
  }, []);
  return (
    <section className="library-statistics" aria-label="Platform statistics">
      <div className="library-bar panel">
        <h2><BookOpen size={38} strokeWidth={1.6} aria-hidden="true" /><span className="hidden sm:inline">Historical </span>exam library</h2>
        <div className="library-stat"><FileText aria-hidden="true" /><p><strong><AnimatedCount value={data?.problems} /></strong><span>questions</span></p></div>
        <div className="library-stat"><Database aria-hidden="true" /><p><strong><AnimatedCount value={data?.contests} /></strong><span>exams</span></p></div>
        <div className="library-stat"><CalendarDays aria-hidden="true" /><p><strong>{yearRange}</strong><span className="lg:hidden">years</span></p></div>
      </div>
      <p className="sr-only" aria-live="polite">{error || (data ? `${data.competitors.toLocaleString()} public competitors · ${data.attempts.toLocaleString()} practice attempts` : "Loading library statistics…")}</p>
    </section>
  );
}

function AnimatedCount({ value }: { value?: number }) {
  const element = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === undefined) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting) || started) return;
      started = true;
      observer.disconnect();
      if (motion.matches) { setDisplay(value); return; }
      const start = performance.now();
      function tick(now: number) {
        const progress = Math.min(1, (now - start) / 850);
        setDisplay(Math.round(value! * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      }
      frame = requestAnimationFrame(tick);
    }, {threshold: 0.1});
    if (element.current) observer.observe(element.current);
    function stopMotion() {
      if (motion.matches) { cancelAnimationFrame(frame); setDisplay(value!); }
    }
    motion.addEventListener("change", stopMotion);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); motion.removeEventListener("change", stopMotion); };
  }, [value]);
  return <span ref={element} aria-label={value?.toLocaleString() ?? "Loading"}><span aria-hidden="true">{value === undefined ? "—" : display.toLocaleString()}</span></span>;
}
