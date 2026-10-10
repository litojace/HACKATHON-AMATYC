"use client";
import { supabase } from "./supabaseClient";
export async function api<T>(
  path: string,
  body?: unknown,
  method?: string,
  signal?: AbortSignal,
): Promise<T> {
  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const res = await fetch("/api/" + path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(data.session
        ? { Authorization: "Bearer " + data.session.access_token }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal,
  });
  const value = await res.json();
  if (!res.ok) throw new Error(value.error?.message ?? "Service unavailable");
  return value;
}
