import { z } from "zod";
export const answerSchema = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9\s.,:+\-/]+$/).nullable();
export const practiceSchema = z.object({
  answer: answerSchema,
  request_id: z.uuid(),
});
export const saveAnswerSchema = z.object({
  problem_id: z.string().max(100),
  answer: answerSchema,
  flagged: z.boolean(),
});
export const profileSchema = z.object({
  full_name: z.string().trim().min(1).max(80),
  school: z.string().trim().max(100).nullable(),
  avatar_url: z.url().startsWith("https://").nullable(),
  is_public: z.boolean(),
});
export const importProblemSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(100),
    contest_name: z.string().min(1),
    question_number: z.number().int().positive(),
    title: z.string().min(1),
    category: z.string().min(1),
    topic_tags: z.array(z.string()),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    difficulty_rating: z.number().int().min(0).nullable(),
    question_latex: z.string().min(1),
    options: z
      .array(
        z.object({
          label: z.enum(["A", "B", "C", "D", "E"]),
          text: z.string().min(1),
        }),
      )
      .max(5)
      .refine(
        (o) => new Set(o.map((x) => x.label)).size === o.length && (o.length === 0 || o.length >= 2),
        "Options must be unique",
      ),
    figure_required: z.boolean(),
    figure_image_path: z
      .union([
        z
          .string()
          .startsWith("/images/")
          .refine(
            (value) => !value.includes(".."),
            "Invalid local figure path",
          ),
        z.url().startsWith("https://"),
      ])
      .nullable(),
    correct_answer: z.string().min(1).max(80),
    accepted_answers: z.array(z.string().min(1).max(80)).optional(),
    grading_policy: z.enum(["standard", "credit_all", "no_penalty"]).optional(),
    answer_format: z.enum(["multiple_choice", "short_answer"]).optional(),
    source_image_path: z.string().regex(/^\/images\/exams\/[a-z0-9-]+\.webp$/).nullable().optional(),
    difficulty_rationale: z.string().optional(),
    written_solution: z.string().nullable(),
    calculator_trick: z
      .object({
        model: z.string(),
        applicable: z.boolean(),
        summary: z.string(),
        steps: z.array(z.string()),
        functionality: z.string().optional(),
        key_sequences: z.array(z.array(z.string())).optional(),
        screen_states: z.array(z.string()).optional(),
      })
      .nullable()
      .optional(),
    verification_status: z.enum([
      "unreviewed",
      "answer_verified",
      "fully_verified",
    ]),
    source_question_file: z.string().nullable(),
    source_answer_key_file: z.string().nullable(),
  })
  .refine(
    (p) => !p.figure_required || !!p.figure_image_path,
    "Required figure missing",
  ).refine(p => p.options.length > 0 ? p.answer_format !== "short_answer" && (p.accepted_answers ?? [p.correct_answer]).every(a => p.options.some(o => o.label === a)) : p.answer_format === "short_answer", "Answer format or key does not match the printed options");
