/** Choice letter or the original exam's short response. */
export type Answer = string;
export interface ProblemOption {
  label: Answer;
  text: string;
}
export interface CalculatorTrick {
  model: string;
  applicable: boolean;
  summary: string;
  steps: string[];
  functionality?: string;
  key_sequences?: string[][];
  screen_states?: string[];
}
export interface PublicProblem {
  id: string;
  contest_name: string;
  question_number: number;
  title: string;
  category: string;
  topic_tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  difficulty_rating: number | null;
  question_latex: string;
  options: ProblemOption[];
  figure_required: boolean;
  figure_image_path: string | null;
  verification_status: string;
  acceptance_rate?: number | null;
  accepted_count?: number;
  attempt_count?: number;
  answer_format?: "multiple_choice" | "short_answer";
  source_image_path?: string | null;
  difficulty_rationale?: string;
}
/** Lightweight directory data. Full question details are fetched on demand. */
export type PublicProblemSummary = Omit<PublicProblem,
  "options" | "figure_required" | "figure_image_path" | "source_image_path" |
  "answer_format" | "difficulty_rationale"> & { option_count: number };
/** Privileged import model. Never return this object in public API responses. */
export interface AMATYCProblem extends PublicProblem {
  correct_answer: Answer;
  written_solution: string | null;
  calculator_trick?: CalculatorTrick | null;
  source_question_file?: string | null;
  source_answer_key_file?: string | null;
  publication_status?: string;
  accepted_answers?: string[];
  grading_policy?: "standard" | "credit_all" | "no_penalty";
}
export interface Explanation {
  correct_answer: Answer;
  written_solution: string | null;
  calculator_trick?: CalculatorTrick | null;
  accepted_answers?: string[];
  grading_policy?: "standard" | "credit_all" | "no_penalty";
}
export interface PracticeResult extends Explanation {
  id: string;
  problem_id: string;
  selected_answer: Answer | null;
  is_correct: boolean;
  score: number;
  time_spent_seconds: number;
  created_at: string;
}
export interface Profile {
  id: string;
  username: string;
  full_name: string;
  school: string | null;
  rating: number;
  contests_attended: number;
  avatar_url: string | null;
  created_at: string;
  is_public: boolean;
  last_delta?: number;
}
export interface Contest {
  id: string;
  name: string;
  description: string;
  year: number;
  semester: string;
  kind: "historical_mock" | "rated";
  duration_seconds: number;
  question_count: number;
  correct_points: number;
  incorrect_points: number;
  blank_points: number;
  starts_at: string | null;
  ends_at: string | null;
  review_at: string | null;
  rating_enabled: boolean;
  ratings_processed_at?: string | null;
}
export interface ExamAttempt {
  id: string;
  contest_id: string;
  started_at: string;
  deadline: string;
  finalized_at: string | null;
  status: "active" | "finalized";
  answers: Record<string, Answer | null>;
  flags: string[];
  score: number | null;
  questions: PublicProblem[];
  server_now: string;
  breakdown?: (PublicProblem & {
    selected_answer: Answer | null;
    is_correct: boolean;
    points: number;
    explanation: Explanation | null;
  })[];
  time_spent_seconds?: number;
}
export interface Activity {
  practice: PracticeResult[];
  contests: ExamAttempt[];
  ratings: {
    new_rating: number;
    old_rating: number;
    created_at: string;
    contest_name?: string;
  }[];
  bookmarks: string[];
}
