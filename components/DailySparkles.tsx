import styles from "./DailyHighlight.module.css";

/** Small, decorative stars; CSS handles motion without timers or extra requests. */
export default function DailySparkles({ compact = false }: { compact?: boolean }) {
  return <span className={`${styles.sparkles} ${compact ? styles.compactSparkles : ""}`} aria-hidden="true">
    {[0, 1, 2].map(star => <svg key={star} viewBox="0 0 16 16" focusable="false"><path d="M8 0 10 6 16 8 10 10 8 16 6 10 0 8 6 6Z" fill="currentColor" /></svg>)}
  </span>;
}
