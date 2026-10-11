import type { PublicProblem } from "@/types/problem";
import { INITIAL_RATING } from "@/lib/rating";

export const TRAINING_PRESETS = [
  { minutes: 15, questions: 5 },
  { minutes: 30, questions: 10 },
  { minutes: 60, questions: 20 },
] as const;

function shuffle<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type RatedProblem = Pick<PublicProblem, "difficulty" | "difficulty_rating">;

export function trainingRating(rating: number | null | undefined) {
  return typeof rating === "number" && Number.isFinite(rating) && rating > 0 ? rating : INITIAL_RATING;
}

export function trainingQuestionRating(problem: RatedProblem) {
  const rating = problem.difficulty_rating;
  return rating !== null && Number.isFinite(rating) && rating > 0
    ? rating
    : { Easy: 800, Medium: 1400, Hard: 1800 }[problem.difficulty];
}

/** Never fill a session with questions more than 300 points above the learner. */
export function trainingCandidates<T extends RatedProblem>(pool: T[], rating: number | null | undefined) {
  const ceiling = trainingRating(rating) + 300;
  return pool.filter(problem => trainingQuestionRating(problem) <= ceiling);
}

/** Aim for 20% warm-up, 60% at the learner's level, and 20% gentle stretch. */
export function ratingMatchedQuestions(pool: PublicProblem[], count: number, rating: number | null | undefined, random = Math.random) {
  const target = trainingRating(rating);
  const unique = [...new Map(trainingCandidates(pool, target).filter(p => p.options.length > 0).map(p => [p.id, p])).values()];
  // Randomness varies equally suitable questions without overriding their suitability.
  const ranked = unique.map(problem => ({ problem, rating: trainingQuestionRating(problem), jitter: random() * 100 }));
  const selected: PublicProblem[] = [];
  const ids = new Set<string>();
  function take(candidates: typeof ranked, amount: number, aim: number) {
    const ordered = candidates.filter(item => !ids.has(item.problem.id)).sort((a, b) =>
      Math.abs(a.rating - aim) + a.jitter - (Math.abs(b.rating - aim) + b.jitter));
    for (const { problem } of ordered.slice(0, amount)) {
      selected.push(problem);
      ids.add(problem.id);
    }
  }
  const warmup = Math.floor(count * 0.2);
  const stretch = Math.floor(count * 0.2);
  take(ranked.filter(item => item.rating < target - 100), warmup, target - 200);
  take(ranked.filter(item => item.rating >= target - 100 && item.rating <= target + 100), count - warmup - stretch, target);
  take(ranked.filter(item => item.rating > target + 100), stretch, target + 200);
  // If a band is scarce, use the remaining closest eligible questions.
  take(ranked, Math.max(0, count - selected.length), target);
  return shuffle(selected, random);
}
