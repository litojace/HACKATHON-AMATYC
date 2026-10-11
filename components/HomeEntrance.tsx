"use client";
import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function HomeEntrance({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (pathname !== "/") return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motion.matches) return;
    const animations: Animation[] = [];
    const played = new Set<HTMLElement>();
    function reveal(element: HTMLElement, delay = 0) {
      if (played.has(element) || motion.matches) return;
      played.add(element);
      // CSS starts the hero entrance before hydration; avoid restarting it.
      if (element.getAnimations().some(animation => animation.playState === "running")) return;
      animations.push(element.animate([
        { opacity: 0, transform: "translateY(14px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 650, delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }));
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.1 });
    let visibleIndex = 0;
    root.current?.querySelectorAll<HTMLElement>("[data-home-entrance]").forEach(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight && bounds.bottom > 0) reveal(element, Math.min(visibleIndex++ * 60, 240));
      else observer.observe(element);
    });
    function stopMotion() {
      if (motion.matches) {
        observer.disconnect();
        animations.forEach(animation => animation.cancel());
      }
    }
    motion.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", stopMotion);
      animations.forEach(animation => animation.cancel());
    };
  }, [pathname]);
  return <div ref={root} className="home-entrance">{children}</div>;
}
