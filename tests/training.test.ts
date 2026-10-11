import { test } from "node:test";
import assert from "node:assert/strict";
import { balancedQuestions, TRAINING_PRESETS } from "../lib/training";
import type { PublicProblem } from "../types/problem";

function pool(counts: number[]) {
  return (["Easy", "Medium", "Hard"] as const).flatMap((difficulty, level) =>
    Array.from({ length: counts[level] }, (_, index): PublicProblem => ({
      id: `${difficulty}-${index}`, difficulty, title: "Practice question",
      contest_name: "Test", question_number: index + 1, category: "Algebra",
      topic_tags: [], difficulty_rating: 800 + level * 500,
      question_latex: "1 + 1", options: [{ label: "A", text: "2" }],
      figure_required: false, figure_image_path: null, verification_status: "verified",
    })),
  );
}
function random(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

test("training presets draw unique balanced sets with varied questions and order", () => {
  const questions = pool([30, 30, 30]);
  const original = structuredClone(questions);
  for (const { minutes, questions: count } of TRAINING_PRESETS) {
    assert.equal(minutes, count * 3);
    const sets = [42, 99].map(seed => balancedQuestions(questions, count, random(seed)));
    for (const selected of sets) {
      assert.equal(selected.length, count);
      assert.equal(new Set(selected.map(p => p.id)).size, count);
      const counts = ["Easy", "Medium", "Hard"].map(level => selected.filter(p => p.difficulty === level).length);
      assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
    }
    assert.notDeepEqual(sets[0].map(p => p.id), sets[1].map(p => p.id));
  }
  assert.deepEqual(questions, original);
});

test("training fills scarce difficulties without duplicates or unusable questions", () => {
  const questions = pool([20, 1, 1]);
  const selected = balancedQuestions([...questions, questions[0], { ...questions[1], id: "unusable", options: [] }], 20, random(10));
  assert.equal(selected.length, 20);
  assert.equal(new Set(selected.map(p => p.id)).size, 20);
  assert.equal(selected.filter(p => p.difficulty === "Medium").length, 1);
  assert.equal(selected.filter(p => p.difficulty === "Hard").length, 1);
  assert.ok(selected.every(p => p.id !== "unusable"));
  assert.equal(balancedQuestions(pool([1, 1, 1]), 5).length, 3);
});
