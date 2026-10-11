"use client";
import { useEffect, useRef } from "react";
import { Trophy } from "lucide-react";

const colors = ["#f15a29", "#ffdb7a", "#86efac", "#8791ff", "#ff9b71"];

export default function PerfectScoreCelebration({ attemptId, total }: { attemptId: string; total: number }) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const key = "amatyc-perfect-score:" + attemptId;
    const animations: Animation[] = [];
    // Defer recording the celebration until it actually starts. This also
    // survives React development Strict Mode's setup/cleanup rehearsal.
    const play = () => {
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "celebrated");
      } catch { /* A blocked storage preference should not hide congratulations. */ }
      if (motion.matches || !root.current) return;
      animations.push(root.current.animate([
        { opacity: 0 }, { opacity: 1 },
      ], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" }));
      const trophy = root.current.querySelector("[data-victory-trophy]");
      if (trophy) animations.push(trophy.animate([
        { transform: "scale(.5) rotate(-18deg)", opacity: 0 },
        { transform: "scale(1.15) rotate(8deg)", opacity: 1, offset: .65 },
        { transform: "scale(1) rotate(0deg)", opacity: 1 },
      ], { duration: 850, easing: "cubic-bezier(.22,1,.36,1)" }));
      root.current.querySelectorAll<HTMLElement>("[data-confetti]").forEach((piece, i) => {
        animations.push(piece.animate([
          { opacity: 0, transform: "translate3d(0,-24px,0) rotate(0deg)" },
          { opacity: 1, offset: .08 },
          { opacity: 1, offset: .75 },
          { opacity: 0, transform: `translate3d(${(i % 2 ? 1 : -1) * (30 + i % 7 * 12)}px,105vh,0) rotate(${(i % 2 ? 1 : -1) * (240 + i * 19)}deg)` },
        ], { duration: 2400 + i % 5 * 180, delay: i % 8 * 85, easing: "cubic-bezier(.2,.5,.6,1)" }));
      });
      root.current.querySelectorAll<HTMLElement>("[data-victory-spark]").forEach((spark, i) => {
        const angle = (i % 12) / 12 * Math.PI * 2;
        const x = Math.cos(angle) * 170, y = Math.sin(angle) * 130;
        animations.push(spark.animate([
          { opacity: 0, transform: "translate3d(0,0,0) scale(.2)" },
          { opacity: 1, offset: .2 },
          { opacity: 0, transform: `translate3d(${x}px,${y}px,0) scale(1.1) rotate(120deg)` },
        ], { duration: 1300, delay: i < 12 ? 100 : 650, easing: "cubic-bezier(.15,.6,.4,1)" }));
      });
    };
    const frame = requestAnimationFrame(play);
    const stop = () => { if (motion.matches) animations.forEach(animation => animation.cancel()); };
    motion.addEventListener("change", stop);
    return () => {
      cancelAnimationFrame(frame);
      animations.forEach(animation => animation.cancel());
      motion.removeEventListener("change", stop);
    };
  }, [attemptId]);

  return (
    <section ref={root} role="status" aria-live="polite" data-motion="none"
      className="mb-6 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 rounded-2xl border border-[var(--gold)]/60 bg-gradient-to-br from-[var(--gold)]/20 via-panel to-emerald-500/10 p-6 shadow-[0_0_45px_rgba(230,190,86,0.12)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-8">
      <div data-victory-trophy aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/15 text-[var(--gold)] shadow-[0_0_28px_rgba(230,190,86,0.25)]">
        <Trophy size={42} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-semibold tracking-widest text-emerald-400">FLAWLESS FINISH</p>
        <h2 className="text-3xl font-bold text-[var(--gold)] sm:text-4xl">Perfect score!</h2>
        <p className="mt-2 text-sm">Congratulations! All {total} answers correct.</p>
        <p className="mt-1 text-sm muted">You nailed every question. Keep pushing your limits!</p>
      </div>
      <span className="col-span-2 text-center font-mono text-4xl font-bold text-[var(--gold)] sm:col-span-1 sm:text-5xl" aria-hidden="true">100%</span>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {Array.from({ length: 36 }, (_, i) => (
          <span key={i} data-confetti className="absolute -top-3 h-3 w-2 opacity-0"
            style={{ left: `${(i * 37 + 11) % 100}%`, backgroundColor: colors[i % colors.length], borderRadius: i % 3 === 0 ? "50%" : "2px" }} />
        ))}
        {Array.from({ length: 24 }, (_, i) => (
          <span key={`spark-${i}`} data-victory-spark className="absolute text-2xl opacity-0"
            style={{ left: i < 12 ? "30%" : "70%", top: i < 12 ? "28%" : "22%", color: colors[i % colors.length] }}>✦</span>
        ))}
      </div>
    </section>
  );
}
