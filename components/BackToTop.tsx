"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setVisible(window.scrollY > 200);
    }
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      type="button"
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      title="Back to top"
      onClick={() => window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      })}
      className={`fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-edge bg-panel text-emerald-400 shadow-lg transition-[opacity,transform,filter] duration-500 ease-out hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 motion-reduce:transition-none sm:bottom-7 sm:right-7 ${visible ? "translate-y-0 opacity-100 blur-none" : "pointer-events-none translate-y-5 opacity-0 blur-[6px]"}`}
    >
      <ArrowUp size={22} aria-hidden="true" />
    </button>
  );
}
