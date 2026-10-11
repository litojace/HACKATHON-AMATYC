import type { PublicProblem } from "@/types/problem";

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

/** Take equally from available difficulties, then shuffle the question order. */
export function balancedQuestions(pool: PublicProblem[], count: number, random = Math.random) {
  const unique = [...new Map(pool.filter(p => p.options.length > 0).map(p => [p.id, p])).values()];
  const levels = shuffle(["Easy", "Medium", "Hard"] as const, random);
  const buckets = levels.map(level => ({
    questions: shuffle(unique.filter(p => p.difficulty === level), random),
    picked: 0,
  }));
  const selected: PublicProblem[] = [];
  while (selected.length < count) {
    const available = buckets.filter(bucket => bucket.questions.length);
    const next = available.reduce<(typeof buckets)[number] | undefined>((best, bucket) =>
      !best || bucket.picked < best.picked ? bucket : best, undefined);
    if (!next) break;
    selected.push(next.questions.pop()!);
    next.picked++;
  }
  if (selected.length < count) {
    const ids = new Set(selected.map(p => p.id));
    selected.push(...shuffle(unique.filter(p => !ids.has(p.id)), random).slice(0, count - selected.length));
  }
  return shuffle(selected, random);
}
