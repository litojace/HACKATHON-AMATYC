import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_RATING,
  calculateRatings,
  scoreAnswer,
  getCodeforcesTitle,
} from "../lib/rating";
import { difficulty, filterProblems, remainingSeconds } from "../lib/domain";
import {
  importProblemSchema,
  practiceSchema,
  profileSchema,
} from "../lib/validation";
import raw from "../data/demo/questions.json";
import type { PublicProblem, PracticeResult } from "../types/problem";
const questions = raw.map((p) => importProblemSchema.parse(p));
test("AMATYC correct, wrong, blank, and minimum exam score", () => {
  assert.equal(scoreAnswer("A", "A"), 2);
  assert.equal(scoreAnswer("B", "A"), -0.5);
  assert.equal(scoreAnswer(null, "A"), 0);
  assert.equal(
    Array.from({ length: 20 }, () => scoreAnswer("B", "A")).reduce(
      (a, b) => a + b,
    ),
    -10,
  );
});
test("20 complete original demo records pass validation", () => {
  assert.equal(questions.length, 20);
  assert.equal(new Set(questions.map((p) => p.id)).size, 20);
  assert.ok(
    questions.every(
      (p) =>
        p.contest_name === "Original Demonstration Set" &&
        p.verification_status === "fully_verified",
    ),
  );
  assert.equal(questions[0].correct_answer, "D");
  assert.equal(questions[1].correct_answer, "E");
  for (const p of questions)
    assert.ok(p.options.some((o) => o.label === p.correct_answer));
});
test("rating fixtures, ties, first competition policy, and floor", () => {
  const r = calculateRatings([
    { id: "a", rating: 1500, score: 40 },
    { id: "b", rating: 1500, score: 20 },
    { id: "c", rating: 1500, score: 0 },
  ]);
  assert.deepEqual(
    r.map((p) => p.rank),
    [1, 2, 3],
  );
  assert.ok(r[0].delta > 0 && r[2].delta < 0);
  const tied = calculateRatings([
    { id: "a", rating: 1500, score: 10 },
    { id: "b", rating: 1500, score: 10 },
  ]);
  assert.equal(tied[0].delta, tied[1].delta);
  assert.equal(
    calculateRatings([{ id: "a", rating: 1500, score: 0 }])[0].delta,
    0,
  );
  assert.deepEqual(calculateRatings([]), []);
  assert.throws(() => calculateRatings([{ id: "a", rating: NaN, score: 0 }]));
  for (const p of calculateRatings([
    { id: "a", rating: 1, score: 40 },
    { id: "b", rating: 1, score: 0 },
  ]))
    assert.ok(p.newRating >= 1);
});
test("rating is deterministic independent of participant order", () => {
  const p = [
    { id: "a", rating: 1550, score: 38 },
    { id: "b", rating: 1300, score: 20 },
    { id: "c", rating: 1800, score: 20 },
  ];
  assert.deepEqual(
    calculateRatings(p).sort((a, b) => a.id.localeCompare(b.id)),
    calculateRatings([...p].reverse()).sort((a, b) => a.id.localeCompare(b.id)),
  );
});
test("product tier and difficulty boundaries", () => {
  assert.equal(INITIAL_RATING, 800);
  assert.equal(getCodeforcesTitle(1600).color, "text-violet-400");
  for (const [rating, title] of [[1599, "Specialist"], [1600, "Expert"], [1799, "Expert"], [1800, "Master"], [1999, "Master"], [2000, "Grandmaster"], [2199, "Grandmaster"], [2200, "Legend"], [3000, "Legend"]] as const) {
    assert.equal(getCodeforcesTitle(rating).title, title);
  }
  assert.equal(getCodeforcesTitle(1199).title, "Newbie");
  assert.equal(getCodeforcesTitle(1200).title, "Pupil");

  assert.equal(difficulty(1399), "Easy");
  assert.equal(difficulty(1400), "Medium");
  assert.equal(difficulty(1800), "Hard");
  assert.equal(difficulty(null), "Unrated");
});
test("combined topic, status, bookmark, difficulty and rating filters", () => {
  const publicQuestions = questions as PublicProblem[];
  const attempts = [
    { problem_id: "demo-01", is_correct: true },
    { problem_id: "demo-02", is_correct: false },
  ] as PracticeResult[];
  assert.equal(
    filterProblems(
      publicQuestions,
      {
        topic: "Algebra",
        status: "solved",
        bookmarked: "true",
        min: "800",
        max: "900",
      },
      attempts,
      ["demo-01"],
    ).length,
    1,
  );
  assert.equal(
    filterProblems(
      publicQuestions,
      { q: "Altitude", status: "attempted" },
      attempts,
    ).length,
    1,
  );
  assert.equal(
    filterProblems(publicQuestions, { difficulty: "Hard" }).length,
    0,
  );
});
test("deadline recovery and elapsed-time clamp", () => {
  assert.equal(
    remainingSeconds(
      "2026-01-01T01:00:00Z",
      Date.parse("2026-01-01T00:00:00Z"),
    ),
    3600,
  );
  assert.equal(
    remainingSeconds(
      "2026-01-01T01:00:00Z",
      Date.parse("2026-01-01T01:01:00Z"),
    ),
    0,
  );
});
test("validation rejects unsafe imports and privileged profile updates", () => {
  assert.throws(() =>
    importProblemSchema.parse({ ...raw[0], options: [raw[0].options[0]] }),
  );
  assert.throws(() =>
    importProblemSchema.parse({
      ...raw[0],
      figure_required: true,
      figure_image_path: null,
    }),
  );
  assert.throws(() => practiceSchema.parse({ answer: "💥", request_id: "bad" }));
  const p = profileSchema.parse({
    full_name: "Student",
    school: null,
    avatar_url: null,
    is_public: true,
    rating: 9999,
  });
  assert.ok(!("rating" in p));
  assert.throws(() =>
    profileSchema.parse({ ...p, avatar_url: "javascript:alert(1)" }),
  );
});
