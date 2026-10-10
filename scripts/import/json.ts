import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { importProblemSchema } from "../../lib/validation";
async function main() {
  const file = process.argv[2];
  if (!file)
    throw Error(
      "Usage: npm run import:json -- /path/to/reviewed.json [--publish] [--validate-only]",
    );
  const raw = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(raw)) throw Error("Expected an array of records.");
  const records = raw.map((p) => importProblemSchema.parse(p));
  if (new Set(records.map((p) => p.id)).size !== records.length)
    throw Error("Duplicate problem IDs.");
  const publish = process.argv.includes("--publish");
  if (
    publish &&
    records.some(
      (p) => !(p.verification_status === "fully_verified" && p.written_solution) && !(p.verification_status === "answer_verified" && p.source_image_path && p.source_answer_key_file),
    )
  )
    throw Error("Publication requires a verified source statement and official key, or a fully verified worked solution.");
  if (process.argv.includes("--validate-only")) {
    console.log(
      `Validated ${records.length} records. No database writes performed.`,
    );
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw Error(
      "Import needs the project URL and server-only service-role key.",
    );
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("import_problem_records", {
    records,
    publish,
  });
  if (error) throw Error(error.message);
  console.log(
    `Imported ${data} records as ${publish ? "published" : "unpublished drafts"}.`,
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
