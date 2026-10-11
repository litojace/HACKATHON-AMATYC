import "server-only";
import raw from "@/data/demo/questions.json";
import historical from "@/data/historical/questions.json";
import exams from "@/data/historical/contests.json";
import type { AMATYCProblem, PublicProblem, PublicProblemSummary, Contest } from "@/types/problem";
export const demoQuestions = raw as AMATYCProblem[];
export const libraryQuestions = [...historical] as AMATYCProblem[];
export function problemSummary(p: PublicProblem): PublicProblemSummary {
  return {
    id: p.id, contest_name: p.contest_name, question_number: p.question_number,
    title: p.title, category: p.category, topic_tags: p.topic_tags,
    difficulty: p.difficulty, difficulty_rating: p.difficulty_rating,
    question_latex: p.question_latex, verification_status: p.verification_status,
    ...(p.accepted_count !== undefined ? { accepted_count: p.accepted_count } : {}),
    ...(p.attempt_count !== undefined ? { attempt_count: p.attempt_count } : {}),
    ...(p.acceptance_rate !== undefined ? { acceptance_rate: p.acceptance_rate } : {}),
    option_count: p.options.length,
  };
}
export function publicProblem(p: AMATYCProblem): PublicProblem {
  const {
    id,
    contest_name,
    question_number,
    title,
    category,
    topic_tags,
    difficulty,
    difficulty_rating,
    question_latex,
    options,
    figure_required,
    figure_image_path,
    verification_status,
    answer_format, source_image_path, difficulty_rationale,
  } = p;
  return {
    id,
    contest_name,
    question_number,
    title,
    category,
    topic_tags,
    difficulty,
    difficulty_rating,
    question_latex,
    options,
    figure_required,
    figure_image_path,
    verification_status,
    answer_format, source_image_path, difficulty_rationale,
  };
}
export const demoContest: Contest = {
  id: "demo-challenge",
  name: "The Mathematics Challenge",
  description:
    "20 original demonstration problems across multiple topics. Unrated practice; no official historical source.",
  year: 2026,
  semester: "Demo",
  kind: "historical_mock",
  duration_seconds: 3600,
  question_count: 20,
  correct_points: 2,
  incorrect_points: -0.5,
  blank_points: 0,
  starts_at: null,
  ends_at: null,
  review_at: null,
  rating_enabled: false,
};

export const sampleProfiles = [
  {
    id: "sample-1",
    username: "sample_integral",
    full_name: "Sample competitor",
    school: "Demonstration College",
    rating: 1842,
    contests_attended: 0,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
    is_public: true,
    last_delta: 0,
    rating_history: [],
  },
  {
    id: "sample-2",
    username: "sample_prime",
    full_name: "Sample competitor",
    school: "Example Institute",
    rating: 1635,
    contests_attended: 0,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
    is_public: true,
    last_delta: 0,
    rating_history: [],
  },
  {
    id: "sample-3",
    username: "sample_limit",
    full_name: "Sample competitor",
    school: "Demonstration College",
    rating: 1500,
    contests_attended: 0,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00Z",
    is_public: true,
    last_delta: 0,
    rating_history: [],
  },
];

export const libraryContests = [...exams] as Contest[];
export function questionsForContest(id: string) { return id === demoContest.id ? demoQuestions : libraryQuestions.filter(p => p.id.startsWith(id + "-q")); }
