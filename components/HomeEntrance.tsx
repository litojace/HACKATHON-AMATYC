"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function HomeEntrance({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-home-entrance]") ?? []).map((element, index) =>
      element.animate([
        { opacity: 0, transform: "translateY(18px) scale(0.98)" },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ], { duration: 700, delay: Math.min(index * 70, 420), easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }),
    );
    return () => animations.forEach(animation => animation.cancel());
  }, [pathname]);
  return <div ref={root} className="home-entrance">{children}</div>;
}
