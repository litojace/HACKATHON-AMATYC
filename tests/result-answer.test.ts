import { test } from "node:test";
import assert from "node:assert/strict";
import { answerText } from "../lib/result-answer";

test("result answers use option content and preserve math", () => {
  assert.equal(answerText({ options: [{ label: "A", text: "$\\frac{1}{2}$" }], question_latex: "" }, "A"), "$\\frac{1}{2}$");
});
test("printed answers are extracted only with a complete ordered set", () => {
  const options = ["A", "B", "C", "D", "E"].map(label => ({ label, text: `Printed option ${label}` }));
  assert.equal(answerText({ options, question_latex: "Find x. A. -1 B. 0 C. 1 D. 3 E. 5" }, "D"), "3");
  assert.equal(answerText({ options, question_latex: "See the figure." }, "D"), null);
  assert.equal(answerText({ options, question_latex: "A. 1 C. 2 B. 3 D. 4 E. 5" }, "B"), null);
  assert.equal(answerText({ options, question_latex: "" }, "42"), null);
});
