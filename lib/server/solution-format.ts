import { createHash } from "node:crypto";
import revisions from "@/data/editorials/format-revisions.json";
import editorials from "@/data/editorials/detailed-solutions.json";

/** Upgrade known old formatting, preserving custom explanations saved by admins. */
export function correctedWrittenSolution(problemId: string, text: string): string {
  const before = revisions[problemId as keyof typeof revisions];
  if (!before || createHash("sha256").update(text).digest("hex") !== before) return text;
  return editorials[problemId as keyof typeof editorials] ?? text;
}
