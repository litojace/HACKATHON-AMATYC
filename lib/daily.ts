import { RANK_TIERS, getCodeforcesTitle } from "./rating";
import type { Explanation, PublicProblem } from "@/types/problem";

export const DAILY_QUESTION_COUNT = 10;
export const DAILY_DURATION_MINUTES = 40;
export const DAILY_RATING_CHANGES = [-8, -6, -5, -3, -2, 0, 6, 15, 24, 32, 40] as const;
export const LEGACY_DAILY_RATING_CHANGES = [-8, -5, -2, 3, 12, 20] as const;
export const DAILY_TIME_ZONE = "America/Los_Angeles";
export interface DailyChallenge {
  id: string;
  challenge_date: string;
  started_at: string;
  expires_at?: string | null;
  timed_out?: boolean;
  status: "active" | "completed";
  rating_at_start: number;
  answers: Record<string, string | null>;
  questions: PublicProblem[];
  completed_at: string | null;
  correct_count: number | null;
  old_rating: number | null;
  new_rating: number | null;
  rating_delta: number | null;
  breakdown?: { problem_id: string; selected_answer: string | null; is_correct: boolean; explanation: Explanation }[];
}
export interface DailyStatus {
  challenge_date: string;
  resets_at: string;
  server_now: string;
  challenge: DailyChallenge | null;
}
export function ratingMilestone(rating: number) {
  const current = getCodeforcesTitle(rating);
  const next = [...RANK_TIERS].reverse().find(tier => tier.min > rating);
  return {
    current, next,
    remaining: next ? next.min - rating : 0,
    progress: next ? Math.max(0, Math.min(100, 100 * (rating - current.min) / (next.min - current.min))) : 100,
  };
}
