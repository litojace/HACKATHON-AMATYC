import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
export const databaseConfigured = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
export function database(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      ...(authorization
        ? { global: { headers: { Authorization: authorization } } }
        : {}),
    },
  );
}
