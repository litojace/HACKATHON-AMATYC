import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import raw from "../data/historical/questions.json";
import exams from "../data/historical/contests.json";
import provenance from "../data/historical/provenance.json";
import { importProblemSchema } from "../lib/validation";
import { scoreAnswer } from "../lib/rating";
const questions = raw.map(p => importProblemSchema.parse(p));
test("every supplied exam has exactly its 20 numbered original statements and keyed responses", () => {
  assert.equal(questions.length, 820);
  assert.equal(exams.length, 41);
  assert.equal(provenance.questions.length, 820);
  assert.equal(new Set(questions.map(p => p.id)).size, 820);
  for (const exam of exams) {
    const rows = questions.filter(p => p.id.startsWith(exam.id + "-q"));
    assert.deepEqual(rows.map(p => p.question_number), Array.from({length: 20}, (_, i) => i + 1));
    for (const p of rows) {
      assert.ok(existsSync(join(process.cwd(), "public", p.source_image_path!)));
      assert.ok(p.source_question_file && p.source_answer_key_file);
      assert.ok(p.difficulty_rationale?.includes(p.title));
      assert.equal(scoreAnswer(p.correct_answer, p.correct_answer, p.accepted_answers, p.grading_policy), 2);
    }
  }
  assert.equal(questions.filter(p => p.answer_format === "short_answer").length, 15);
  assert.equal(questions.filter(p => p.grading_policy === "credit_all").length, 7);
  assert.equal(questions.filter(p => p.grading_policy === "no_penalty").length, 3);
});
test("key amendments, alternate choices, numeric separators, and written short answers", () => {
  const grade = (id: string, answer: string | null) => {
    const p = questions.find(p => p.id === id)!;
    return scoreAnswer(answer, p.correct_answer, p.accepted_answers, p.grading_policy);
  };
  assert.equal(grade("amatyc-2009-fall-q11", "A"), 2);
  assert.equal(grade("amatyc-2009-fall-q11", "E"), 2);
  assert.equal(grade("amatyc-2023-fall-q13", "D"), 2);
  assert.equal(grade("amatyc-2010-spring-q13", "4040100"), 2);
  assert.equal(grade("amatyc-2004-fall-q03", " ctayam "), 2);
  assert.equal(grade("amatyc-2005-spring-q06", null), 2);
  assert.equal(grade("amatyc-2014-fall-q11", "incorrect"), 0);
  assert.equal(grade("amatyc-2014-fall-q11", "322"), 2);
});
test("difficulty distinguishes a direct computation from interacting geometric constraints", () => {
  const simple = questions.find(p => p.id === "amatyc-2025-spring-q01")!;
  const hard = questions.find(p => p.id === "amatyc-2025-spring-q11")!;
  assert.ok(simple.difficulty_rating! <= 1000);
  assert.ok(hard.difficulty_rating! >= 1700);
  assert.ok(hard.difficulty_rationale?.includes("tangency") || hard.difficulty_rationale?.includes("Tangency"));
});
test("calculator procedures name solving functions and retain the independently derived outcome", () => {
  const p = questions.find(p => p.id === "amatyc-2025-spring-q14")!;
  assert.ok(p.calculator_trick?.functionality?.includes("EQN"));
  assert.ok(p.calculator_trick?.steps.some(s => s.includes("−38")));
  assert.ok(p.written_solution?.includes("2496"));
  const search = questions.find(p => p.id === "amatyc-2024-fall-q13")!;
  assert.ok(search.calculator_trick?.functionality?.includes("TABLE"));
  assert.ok(search.written_solution?.includes("3+7+40=50"));
});
