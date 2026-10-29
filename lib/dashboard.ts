import type { Activity, ExamAttempt, PracticeResult } from "@/types/problem";

export interface DashboardActivity {
  daily?: {id:string;completed_at:string;rating_delta:number}[];
  practice: (Pick<PracticeResult, "id" | "problem_id" | "is_correct" | "score" | "created_at"> & { answered: boolean })[];
  contests: Pick<ExamAttempt, "id" | "contest_id" | "status" | "score" | "started_at" | "finalized_at">[];
}

export function dashboardActivity(activity: Activity): DashboardActivity {
  return {
    daily: activity.ratings.filter(item=>item.daily_challenge_id).map(item=>({id:item.daily_challenge_id!,completed_at:item.created_at,rating_delta:item.new_rating-item.old_rating})),
    practice: activity.practice.map(({ id, problem_id, is_correct, score, created_at, selected_answer }) => ({ id, problem_id, is_correct, score, created_at, answered: !!selected_answer })),
    contests: activity.contests.map(({ id, contest_id, status, score, started_at, finalized_at }) => ({ id, contest_id, status, score, started_at, finalized_at })),
  };
}
