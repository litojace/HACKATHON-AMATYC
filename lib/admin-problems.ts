import { z } from "zod";
import { importProblemSchema } from "./validation";
import { carouselPhotoSchema } from "./carousel";

export const adminProblemSchema = importProblemSchema.safeExtend({
  id: z.string().regex(/^[a-z0-9-]+$/).max(100).refine(id => !id.startsWith("demo-"), "Choose a non-demo problem ID"),
  title: z.string().trim().min(1).max(160),
  contest_name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(100),
  question_latex: z.string().trim().min(1).max(30000),
  written_solution: z.string().trim().max(30000).nullable(),
  source_image_path: carouselPhotoSchema.shape.src.nullable().optional(),
  publication_status: z.enum(["draft", "published"]),
}).refine(p => p.answer_format === "short_answer" || p.options.some(o => o.label === p.correct_answer), "Correct answer must match an option")
  .refine(p => p.answer_format !== "short_answer" || [p.correct_answer,...(p.accepted_answers ?? [])].every(a => /^[A-Za-z0-9\s.,:+\-/]+$/.test(a)), "Use an answer supported by the grading system, such as 1/2 or -3.5")
  .refine(p => !p.accepted_answers?.length || p.accepted_answers.includes(p.correct_answer), "Accepted answers must include the correct answer")
  .refine(p => p.publication_status === "draft" ||
    p.verification_status === "fully_verified" && !!p.written_solution?.trim() ||
    p.verification_status === "answer_verified" && !!p.source_image_path && !!p.source_answer_key_file,
  "Publishing requires a reviewed solution or a verified source image and answer key");
export type AdminProblem = z.infer<typeof adminProblemSchema>;
export type AdminProblemSummary = Pick<AdminProblem, "id" | "title" | "difficulty" | "publication_status" | "category">;
export function emptyAdminProblem(): AdminProblem {
  return {
    id: "", title: "", contest_name: "Community problems", question_number: 1,
    category: "Algebra", topic_tags: [], difficulty: "Easy", difficulty_rating: 800,
    question_latex: "", options: "ABCDE".split("").map(label => ({label: label as "A" | "B" | "C" | "D" | "E", text: ""})),
    correct_answer: "A", accepted_answers: ["A"], grading_policy: "standard", answer_format: "multiple_choice",
    figure_required: false, figure_image_path: null, source_image_path: null,
    written_solution: null, calculator_trick: null, verification_status: "unreviewed",
    source_question_file: null, source_answer_key_file: null, publication_status: "draft", difficulty_rationale: "",
  };
}
