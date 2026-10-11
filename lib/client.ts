"use client";
import { supabase } from "./supabaseClient";
import { inFlightReads } from "./in-flight";
const read = inFlightReads();
export async function api<T>(
  path: string,
  body?: unknown,
  method?: string,
  signal?: AbortSignal,
): Promise<T> {
  const { data } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } };
  const request = async () => {
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
  };
  // Scope sharing to the exact session. Abortable reads and writes stay independent.
  const verb = method ?? (body === undefined ? "GET" : "POST");
  return verb === "GET" && body === undefined && !signal
    ? read<T>(JSON.stringify([path, data.session?.access_token ?? null]), request)
    : request();
}
