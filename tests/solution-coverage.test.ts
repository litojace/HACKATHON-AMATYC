import { test } from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import questions from "../data/historical/questions.json";
import editorials from "../data/editorials/detailed-solutions.json";
import { stackedFractions } from "../lib/math";

test("all historical explanations contain sequential steps and valid math", () => {
  assert.equal(questions.length, 820);
  for (const question of questions) {
    const text = question.written_solution;
    assert.ok(text?.trim(), `Missing explanation: ${question.id}`);
    const steps = text.split(/\n\s*\n/);
    assert.ok(steps.length >= 2, `Missing separate steps: ${question.id}`);
    steps.forEach((step, index) => assert.ok(step.startsWith(`${index + 1}. `), `Out-of-order step: ${question.id}`));
    assert.equal(text, editorials[question.id as keyof typeof editorials]);
    for (const match of text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$]+)\$/g)) {
      assert.doesNotThrow(() => katex.renderToString(stackedFractions(match[1] ?? match[2]), { throwOnError: true }), question.id);
    }
  }
});
