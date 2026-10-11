import type { PublicProblem, PracticeResult } from "@/types/problem";
export const CATEGORIES = [
  "Algebra",
  "Geometry",
  "Trigonometry and Precalculus",
  "Probability and Combinatorics",
  "Number Theory",
  "Functions and Graphs",
  "Sequences and Series",
  "Logic and Mathematical Reasoning",
  "Other / Mixed Topics",
];
export function difficulty(rating: number | null) {
  return rating === null
    ? "Unrated"
    : rating < 1400
      ? "Easy"
      : rating < 1800
        ? "Medium"
        : "Hard";
}
export function filterProblems(
  problems: PublicProblem[],
  filters: Record<string, string>,
  attempts: PracticeResult[] = [],
  bookmarks: string[] = [],
) {
  const status = (id: string) =>
    attempts.some((a) => a.problem_id === id && a.is_correct)
      ? "solved"
      : attempts.some((a) => a.problem_id === id)
        ? "attempted"
        : "unsolved";
  return problems
    .filter(
      (p) =>
        (!filters.q ||
          `${p.title} ${p.question_latex} ${p.topic_tags.join(" ")}`
            .toLowerCase()
            .includes(filters.q.toLowerCase())) &&
        (!filters.topic || p.category === filters.topic) &&
        (!filters.difficulty || p.difficulty === filters.difficulty) &&
        (!filters.source || p.contest_name === filters.source) &&
        (!filters.min || (p.difficulty_rating ?? 0) >= Number(filters.min)) &&
        (!filters.max || (p.difficulty_rating ?? 0) <= Number(filters.max)) &&
        (!filters.status || status(p.id) === filters.status) &&
        (!filters.bookmarked || bookmarks.includes(p.id)),
    )
    .sort((a, b) =>
      filters.sort === "title"
        ? a.title.localeCompare(b.title)
        : filters.sort === "source"
          ? a.contest_name.localeCompare(b.contest_name)
          : filters.sort === "difficulty"
            ? ["Easy", "Medium", "Hard"].indexOf(a.difficulty) -
              ["Easy", "Medium", "Hard"].indexOf(b.difficulty)
            : (a.difficulty_rating ?? 0) - (b.difficulty_rating ?? 0),
    );
}
export function remainingSeconds(deadline: string, now: number) {
  return Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
}

export function difficultyColor(level: string) {
  return level === "Easy" ? "difficulty-easy" : level === "Medium" ? "difficulty-medium" : level === "Hard" ? "difficulty-hard" : "text-zinc-400";
}
