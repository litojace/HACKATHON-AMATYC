"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Star } from "lucide-react";
import RankMedal from "./RankMedal";

const anchorId = "rating-titles-heading";

export default function RatingsPanel({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const root = useRef<HTMLElement>(null);
  const scrollRequested = useRef(false);

  // Preserve links to the old rank-guide anchor on both desktop and mobile.
  useEffect(() => {
    function openFromHash() {
      if (window.location.hash !== `#${anchorId}`) return;
      scrollRequested.current = true;
      setExpanded(true);
      requestAnimationFrame(() => {
        root.current?.scrollIntoView({ block: "start" });
        scrollRequested.current = false;
      });
    }
    function openFromLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (link?.getAttribute("href") !== `#${anchorId}`) return;
      event.preventDefault();
      scrollRequested.current = true;
      setExpanded(true);
      requestAnimationFrame(() => {
        root.current?.scrollIntoView({ block: "start" });
        scrollRequested.current = false;
      });
    }
    const initial = requestAnimationFrame(openFromHash);
    window.addEventListener("hashchange", openFromHash);
    document.addEventListener("click", openFromLink);
    return () => {
      cancelAnimationFrame(initial);
      window.removeEventListener("hashchange", openFromHash);
      document.removeEventListener("click", openFromLink);
    };
  }, []);

  useLayoutEffect(() => {
    if (expanded && scrollRequested.current) {
      root.current?.scrollIntoView({ block: "start" });
      scrollRequested.current = false;
    }
  }, [expanded]);

  return <section ref={root} id={anchorId} className="home-highlights ratings-panel panel" aria-label="Rating milestones" data-expanded={expanded}>
    <h2>
      <button type="button" className="rating-highlight" aria-label="Ratings & titles" aria-expanded={expanded} aria-controls={bodyId} onClick={() => setExpanded(value => !value)}>
        <Star size={34} strokeWidth={1.6} aria-hidden="true" />
        <span className="rating-summary-copy"><span>Ratings &amp; titles</span><span className="rating-summary-description"><span>{expanded ? "Hide rank guide" : "See your next milestone"}</span><ChevronDown size={16} aria-hidden="true" className="rating-summary-chevron" /></span></span>
        <span className="rank-medals" aria-hidden="true">{(["bronze", "silver", "gold"] as const).map(metal => <RankMedal key={metal} metal={metal} />)}</span>
      </button>
    </h2>
    <div id={bodyId} className="ratings-table-body" hidden={!expanded}>{children}</div>
  </section>;
}
