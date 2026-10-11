import { getCodeforcesTitle } from "@/lib/rating";
import type { ReactNode } from "react";

/** Legendary Grandmaster names sparkle; profiles also show the crown and symbols. */
export default function RankedName({ name, rating, featured = false }: {
  name: string;
  rating: number;
  featured?: boolean;
}) {
  return <RankText rating={rating} featured={featured}>{name.trim() || "Competitor"}</RankText>;
}

/** Names, rating values, and titles share one palette and animation treatment. */
export function RankText({ children, rating, featured = false }: {
  children: ReactNode;
  rating: number;
  featured?: boolean;
}) {
  const tier = getCodeforcesTitle(rating);
  const effect = "effect" in tier ? tier.effect : "none";
  return (
    <span className={`ranked-name rank-${effect} ${tier.color} ${featured ? "rank-featured" : ""}`} title={`${tier.title} · ${rating}`}>
      {featured && effect === "legend" && (
        <svg className="rank-crown" aria-hidden="true" viewBox="0 0 28 22">
          <path d="M3 6 9 11 14 2 19 11 25 6 23 18H5Z" /><rect x="5" y="20" width="18" height="2" rx="1" />
        </svg>
      )}
      <span className="rank-name-text">{children}</span>
      {effect === "legend" && (
        <span className="rank-sparkles" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((sparkle) => (
            <svg key={sparkle} viewBox="0 0 16 16" focusable="false">
              <path d="M8 0 10 6 16 8 10 10 8 16 6 10 0 8 6 6Z" />
            </svg>
          ))}
        </span>
      )}
      {featured && (effect === "grandmaster" || effect === "legend") && (
        <span className={`rank-symbols ${effect === "legend" ? "rank-orbit" : ""}`} aria-hidden="true">
          <span>π</span><span>✦</span><span>Σ</span>
        </span>
      )}
    </span>
  );
}
