import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ratingMatchedQuestions, trainingCandidates, trainingQuestionRating, trainingRating, TRAINING_PRESETS } from "../lib/training";
import type { PublicProblem } from "../types/problem";

function pool(ratings: number[], copies = 30) {
  return ratings.flatMap(rating => Array.from({ length: copies }, (_, index): PublicProblem => ({
    id: `${rating}-${index}`, difficulty: rating < 1200 ? "Easy" : rating < 1600 ? "Medium" : "Hard",
    title: "Practice question", contest_name: "Test", question_number: index + 1, category: "Algebra",
    topic_tags: [], difficulty_rating: rating,
    question_latex: "1 + 1", options: [{ label: "A", text: "2" }],
    figure_required: false, figure_image_path: null, verification_status: "verified",
  })));
}
function random(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

test("training targets warm-up, current level and gentle stretch for every preset", () => {
  const questions = pool([600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200]);
  const original = structuredClone(questions);
  for (const rating of [800, 1400, 2000]) {
    for (const { minutes, questions: count } of TRAINING_PRESETS) {
      assert.equal(minutes, count * 3);
      const sets = [42, 99].map(seed => ratingMatchedQuestions(questions, count, rating, random(seed)));
      for (const selected of sets) {
        assert.equal(selected.length, count);
        assert.equal(new Set(selected.map(p => p.id)).size, count);
        assert.equal(selected.filter(p => p.difficulty_rating === rating - 200).length, count * 0.2);
        assert.equal(selected.filter(p => p.difficulty_rating === rating).length, count * 0.6);
        assert.equal(selected.filter(p => p.difficulty_rating === rating + 200).length, count * 0.2);
        assert.ok(selected.every(p => p.difficulty_rating! <= rating + 300));
      }
      assert.notDeepEqual(sets[0].map(p => p.id), sets[1].map(p => p.id));
    }
  }
  assert.deepEqual(questions, original);
});

test("scarce bands use nearby questions without duplicates or excessively hard fillers", () => {
  const questions = pool([800, 1000, 1800], 3);
  const selected = ratingMatchedQuestions([...questions, questions[0], { ...questions[1], id: "unusable", options: [] }], 20, 800, random(10));
  assert.equal(selected.length, 6);
  assert.equal(new Set(selected.map(p => p.id)).size, 6);
  assert.ok(selected.every(p => p.difficulty_rating! <= 1100 && p.id !== "unusable"));
  assert.equal(ratingMatchedQuestions(pool([1800]), 5, 800).length, 0);
  assert.equal(ratingMatchedQuestions(pool([800]), 20, 800).length, 20);
});

test("missing ratings use beginner level and conservative difficulty estimates", () => {
  for (const value of [null, undefined, NaN, Infinity, -10, 0]) assert.equal(trainingRating(value), 800);
  const unrated = pool([800, 1400, 1800], 1).map(p => ({ ...p, difficulty_rating: null }));
  assert.deepEqual(unrated.map(trainingQuestionRating), [800, 1400, 1800]);
  assert.deepEqual(trainingCandidates(unrated, undefined).map(p => p.difficulty), ["Easy"]);
  assert.deepEqual(trainingCandidates(unrated, 1400).map(p => p.difficulty), ["Easy", "Medium"]);
});

test("the rating ceiling includes its boundary and selection follows numeric rating over labels", () => {
  const questions = pool([700, 900, 1100, 1101], 1).map(p => ({ ...p, difficulty: "Hard" as const }));
  assert.deepEqual(trainingCandidates(questions, 800).map(p => p.difficulty_rating), [700, 900, 1100]);
  assert.equal(ratingMatchedQuestions(questions, 5, 800).length, 3);
});

test("real historical library supports all beginner presets without overwhelming questions", () => {
  const questions = JSON.parse(readFileSync(new URL("../data/historical/questions.json", import.meta.url), "utf8")) as PublicProblem[];
  for (const { questions: count } of TRAINING_PRESETS) {
    const selected = ratingMatchedQuestions(questions, count, 800, random(count));
    assert.equal(selected.length, count);
    assert.ok(selected.every(p => p.difficulty_rating! <= 1100));
    assert.ok(selected.filter(p => p.difficulty_rating! <= 900).length >= count * 0.6);
  }
});
