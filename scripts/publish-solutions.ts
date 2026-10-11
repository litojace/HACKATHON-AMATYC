import { createClient } from "@supabase/supabase-js";
import questions from "../data/historical/questions.json";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Export the Supabase URL and server-only service-role key before publishing explanations.");
  const db = createClient(url, key, { auth: { persistSession: false } });
  let published = 0;
  for (const question of questions) {
    if (!question.written_solution?.trim()) throw new Error(`Missing explanation: ${question.id}`);
    const { data, error } = await db.from("problem_solutions")
      .update({ written_solution: question.written_solution })
      .eq("problem_id", question.id)
      .eq("correct_answer", question.correct_answer)
      .select("problem_id");
    if (error) throw new Error(`${question.id}: ${error.message}`);
    if (data?.length !== 1) throw new Error(`${question.id}: missing solution record or changed answer key. Review this record before publishing.`);
    published++;
    if (published % 100 === 0) console.log(`Published ${published}/${questions.length} explanations.`);
  }
  console.log(`Published ${published} explanations. Statements, answer keys, ratings, and contest mappings were preserved.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
