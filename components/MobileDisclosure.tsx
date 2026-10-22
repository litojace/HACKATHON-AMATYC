"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Compact on mobile; its contents remain visible on desktop. */
export default function MobileDisclosure({ label, children, anchorId, className = "" }: {
  label: string;
  children: ReactNode;
  anchorId?: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const root = useRef<HTMLDivElement>(null);
  const scrollRequested = useRef(false);
  useEffect(() => {
    if (!anchorId) return;
    function openFromAnchor(event?: MouseEvent) {
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      const anchor = event?.target instanceof Element ? event.target.closest("a") : null;
      if ((event ? anchor?.getAttribute("href") : window.location.hash) !== `#${anchorId}`) return;
      event?.preventDefault();
      scrollRequested.current = true;
      setExpanded(true);
      requestAnimationFrame(() => root.current?.scrollIntoView({ block: "start" }));
    }
    openFromAnchor();
    document.addEventListener("click", openFromAnchor);
    return () => document.removeEventListener("click", openFromAnchor);
  }, [anchorId]);
  useLayoutEffect(() => {
    if (expanded && scrollRequested.current) {
      root.current?.scrollIntoView({ block: "start" });
      scrollRequested.current = false;
    }
  }, [expanded]);
  return <div ref={root} className={`mobile-disclosure ${className}`} data-expanded={expanded}>
    <button type="button" className="mobile-disclosure-toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={() => setExpanded(value => !value)}>
      {label}<ChevronDown size={17} aria-hidden="true" className={expanded ? "rotate-180" : ""} />
    </button>
    <div id={bodyId} className="mobile-disclosure-body">{children}</div>
  </div>;
}
