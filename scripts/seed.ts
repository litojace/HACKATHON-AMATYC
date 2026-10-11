import { createClient } from "@supabase/supabase-js";
import historical from "../data/historical/questions.json";
import historicalContests from "../data/historical/contests.json";
const questions = [...historical];
import { importProblemSchema } from "../lib/validation";
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw Error(
      "Export the Supabase URL and server-only service-role key before seeding.",
    );
  const records = questions.map((p) => importProblemSchema.parse(p));
  const db = createClient(url, key, { auth: { persistSession: false } });
  for (let offset = 0; offset < records.length; offset += 100) {
    const { error } = await db.rpc("import_problem_records", {
      records: records.slice(offset, offset + 100),
      publish: true,
    });
    if (error) throw Error(error.message);
  }
  // Published imports are immutable. Apply only the reviewed rating metadata
  // to pre-existing records, so a v2 installation receives recalibration too.
  for (const p of records) {
    const updated = await db.from("problems").update({
      difficulty_rating: p.difficulty_rating,
      difficulty: p.difficulty,
      difficulty_rationale: p.difficulty_rationale ?? null,
    }).eq("id", p.id);
    if (updated.error) throw Error(updated.error.message);
  }
  for (const p of questions.filter(p => p.written_solution)) {
    const updated = await db.from("problem_solutions").update({
      written_solution: p.written_solution,
      calculator_trick: p.calculator_trick,
    }).eq("problem_id", p.id).eq("correct_answer", p.correct_answer);
    if (updated.error) throw Error(updated.error.message);
  }
  const contests = historicalContests.map(p => ({ ...p, published: true }));
  const result = await db.from("contests").upsert(contests);
  if (result.error) throw Error(result.error.message);
  const mappings = contests.flatMap(contest => {
    const problems = historical.filter(p => p.id.startsWith(contest.id + "-q"));
    return problems.map((p, i) => ({ contest_id: contest.id, problem_id: p.id, position: i + 1 }));
  });
  const mapping = await db.from("contest_problems").upsert(mappings);
  if (mapping.error) throw Error(mapping.error.message);
  console.log(`Seeded ${records.length} problems and ${contests.length} unrated contests.`);

}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
