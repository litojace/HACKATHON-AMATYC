"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
export default function Dialog({
  title,
  onClose,
  children,
  closeLabel = "Close",
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  closeLabel?: string;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    el?.querySelector<HTMLElement>("button,a,input")?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const nodes = el?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);
  return createPortal(
    <div
      className="motion-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`motion-dialog panel max-h-[90dvh] w-full ${wide ? "max-w-7xl" : "max-w-2xl"} overflow-auto p-5 sm:p-6`}
      >
        <h2 className="mb-5 text-xl font-semibold">{title}</h2>
        {children}
        <button className="btn-secondary mt-5" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
    </div>, document.body
  );
}
