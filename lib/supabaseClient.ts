"use client";
import { createClient } from "@supabase/supabase-js";
import { createAuthStorage } from "./auth-storage";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const storageKey = url ? `sb-${new URL(url).hostname.split(".")[0]}-auth-token` : "amatyc-auth-token";
const authStorage = createAuthStorage(storageKey);
export const setRememberMe = authStorage.setRememberMe;
export const supabase = url && key ? createClient(url, key, {
  auth: { storageKey, storage: authStorage.storage, persistSession: true },
}) : null;
// Session storage is isolated per tab; clear it when another tab broadcasts logout.
supabase?.auth.onAuthStateChange(event => {
  if (event !== "SIGNED_OUT") return;
  for (const suffix of ["", "-user", "-code-verifier"])
    authStorage.storage.removeItem(storageKey + suffix);
});

export const supabaseConfigured = !!(url || key);
