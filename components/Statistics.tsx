"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
export default function Statistics() {
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
    <section className="panel my-9 p-6" aria-label="Platform statistics">
      {error ? (
        <p className="muted">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              ["Available problems", data?.problems],
              ["Available contests", data?.contests],
              ["Public competitors", data?.competitors],
              ["Practice attempts", data?.attempts],
            ].map(([label, value]) => (
              <div data-home-entrance className="home-stat rounded-xl p-2" key={label}>
                <p className="font-mono text-2xl text-emerald-400">
                  <AnimatedCount value={typeof value === "number" ? value : undefined} />
                </p>
                <p className="mt-2 text-xs muted">{label}</p>
              </div>
            ))}
          </div>
          {data?.demo && (
            <p className="mt-5 text-center text-xs muted">
              Historical and sample library counts. No real competitor or submission totals are
              claimed.
            </p>
          )}
        </>
      )}
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
