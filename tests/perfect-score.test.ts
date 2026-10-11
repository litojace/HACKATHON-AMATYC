import assert from "node:assert/strict";
import test from "node:test";
import { isPerfectScore } from "../lib/perfect-score";

const correct = { selected_answer: "A", is_correct: true };
test("celebrate only a complete set of correct answers", () => {
  assert.equal(isPerfectScore([correct, correct], 2), true);
  assert.equal(isPerfectScore([correct], 2), false);
  assert.equal(isPerfectScore([], 0), false);
  assert.equal(isPerfectScore([], 2), false); // Withheld contest review.
  assert.equal(isPerfectScore([correct, { selected_answer: "B", is_correct: false }], 2), false);
});
test("blank answers with correction credit are not a perfect result", () => {
  for (const selected_answer of [null, "", " "]) {
    assert.equal(isPerfectScore([{ selected_answer, is_correct: true }], 1), false);
  }
  assert.equal(isPerfectScore([{ ...correct, grading_policy: "credit_all" }], 1), false);
  assert.equal(isPerfectScore([{ ...correct, explanation: { grading_policy: "credit_all" } }], 1), false);
});
