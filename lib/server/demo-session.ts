import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Answer } from "@/types/problem";
export interface DemoSession {
  id: string;
  contest_id?: string;
  started_at: string;
  deadline: string;
  answers: Record<string, Answer | null>;
  flags: string[];
  finalized_at: string | null;
}
const secret =
  process.env.DEMO_SESSION_SECRET || randomBytes(32).toString("hex");
export function signSession(s: DemoSession) {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  return (
    body + "." + createHmac("sha256", secret).update(body).digest("base64url")
  );
}
export function readSession(token: string | undefined): DemoSession | null {
  if (!token) return null;
  try {
    const [body, sig] = token.split(".");
    const expected = createHmac("sha256", secret).update(body).digest();
    const actual = Buffer.from(sig, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return null;
    return JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
}
