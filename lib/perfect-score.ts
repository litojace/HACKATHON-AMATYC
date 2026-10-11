interface GradedAnswer {
  selected_answer: string | null;
  is_correct: boolean;
  grading_policy?: string;
  explanation?: { grading_policy?: string } | null;
}

/** Require a complete, graded set; points alone can include correction credits. */
export function isPerfectScore(answers: readonly GradedAnswer[], total: number) {
  return total > 0 && answers.length === total && answers.every(
    answer => !!answer.selected_answer?.trim() && answer.is_correct === true &&
      (answer.grading_policy ?? answer.explanation?.grading_policy) !== "credit_all",
  );
}
