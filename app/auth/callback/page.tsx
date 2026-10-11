"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { safeReturnPath } from "@/lib/auth";
import { Loading } from "@/components/Shared";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function complete() {
      try {
        const params = new URLSearchParams(location.search);
        const hash = new URLSearchParams(location.hash.slice(1));
        const failure = params.get("error_description") || hash.get("error_description") || params.get("error") || hash.get("error");
        if (failure) throw new Error(failure);
        if (!supabase) throw new Error("Sign-in is unavailable. Supabase has not been configured.");
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error("Sign-in did not finish. Please try again.");
        if (active) router.replace(safeReturnPath(params.get("next")));
      } catch (error) {
        if (active) setError((error as Error).message);
      }
    }
    complete();
    return () => { active = false; };
  }, [router]);
  return <main className="mx-auto max-w-md px-5 py-12"><section className="panel p-8">
    <h1 className="text-2xl font-semibold">Completing sign-in</h1>
    {error ? <><p role="alert" className="my-5">{error}</p><Link className="btn" href="/login">Back to sign in</Link></> : <Loading />}
  </section></main>;
}
