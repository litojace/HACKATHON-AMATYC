import { getCodeforcesTitle } from "@/lib/rating";

/** Compact names keep the shimmer; profile names add the decorative symbols. */
export default function RankedName({ name, rating, featured = false }: {
  name: string;
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
      <span className="rank-name-text">{name.trim() || "Competitor"}</span>
      {featured && (effect === "grandmaster" || effect === "legend") && (
        <span className={`rank-symbols ${effect === "legend" ? "rank-orbit" : ""}`} aria-hidden="true">
          <span>π</span><span>✦</span><span>Σ</span>
        </span>
      )}
    </span>
  );
}
