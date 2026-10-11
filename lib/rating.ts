import type { Answer } from "@/types/problem";
export const SCORE = { correct: 2, incorrect: -0.5, blank: 0 } as const;
export const INITIAL_RATING = 800;
export function normalizeAnswer(answer: string | null | undefined) {
  return answer?.trim().toUpperCase().replace(/[\s,]/g, "") ?? "";
}
export function isCorrectAnswer(answer: Answer | null | undefined, correct: string, accepted?: string[], policy = "standard") {
  return policy === "credit_all" || !!answer && (accepted ?? [correct]).some(a => normalizeAnswer(a) === normalizeAnswer(answer));
}
export function scoreAnswer(
  answer: Answer | null | undefined,
  correct: string,
  accepted?: string[],
  policy = "standard",
): number {
  return isCorrectAnswer(answer, correct, accepted, policy) ? SCORE.correct : !answer
    ? SCORE.blank
    : policy === "no_penalty" ? SCORE.blank : SCORE.incorrect;
}
export interface Participant {
  id: string;
  rating: number;
  score: number;
}
// Prompt-specified Codeforces-inspired variant; not the complete official algorithm.
export function calculateRatings(participants: Participant[]) {
  if (new Set(participants.map((p) => p.id)).size !== participants.length)
    throw new Error("Participant IDs must be unique");
  if (
    participants.some(
      (p) =>
        !Number.isFinite(p.rating) || p.rating < 1 || !Number.isFinite(p.score),
    )
  )
    throw new Error("Invalid participant");
  if (participants.length < 2)
    return participants.map((p) => ({
      ...p,
      rank: 1,
      delta: 0,
      newRating: p.rating,
    }));
  const raw = participants.map((p) => {
    // Shared last-place rank for ties: no arbitrary ordering by ID.
    const rank = participants.filter((q) => q.score >= p.score).length;
    const opponents = participants.filter((q) => q.id !== p.id);
    const seed = (rating: number) =>
      1 +
      opponents.reduce(
        (sum, q) => sum + 1 / (1 + 10 ** ((rating - q.rating) / 400)),
        0,
      );
    const target = Math.sqrt(rank * seed(p.rating));
    let low = -10000,
      high = 10000;
    for (let i = 0; i < 80; i++) {
      const mid = (low + high) / 2;
      if (seed(mid) > target) low = mid;
      else high = mid;
    }
    return {
      ...p,
      rank,
      rawDelta: Math.floor(((low + high) / 2 - p.rating) / 2),
    };
  });
  const shift =
    -Math.floor(raw.reduce((sum, p) => sum + p.rawDelta, 0) / raw.length) - 1;
  return raw.map(({ rawDelta, ...p }) => {
    const newRating = Math.max(1, p.rating + rawDelta + shift);
    return { ...p, newRating, delta: newRating - p.rating };
  });
}
export const RANK_TIERS = [
  { min: 2200, title: "Legend", color: "text-amber-400", effect: "legend" },
  { min: 2000, title: "Grandmaster", color: "text-red-400", effect: "grandmaster" },
  { min: 1800, title: "Master", color: "text-orange-400", effect: "master" },
  { min: 1600, title: "Expert", color: "text-violet-400", effect: "expert" },
  { min: 1400, title: "Specialist", color: "text-cyan-400" },
  { min: 1200, title: "Pupil", color: "text-green-400" },
  { min: 0, title: "Newbie", color: "text-zinc-400" },
] as const;
export function getCodeforcesTitle(rating: number) {
  return (
    RANK_TIERS.find((t) => rating >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1]
  );
}
