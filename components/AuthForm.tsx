"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useApp } from "./Providers";
export default function AuthForm({
  mode,
}: {
  mode: "login" | "signup" | "forgot" | "reset";
}) {
  const { user, notify } = useApp(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const titles = {
    login: "Welcome back.",
    signup: "Start your next chapter.",
    forgot: "Reset your password.",
    reset: "Choose a new password.",
  };
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase) return;
    const fields = new FormData(e.currentTarget);
    const email = String(fields.get("email") ?? ""),
      password = String(fields.get("password") ?? "");
    setBusy(true);
    setMessage("");
    try {
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  username: String(fields.get("username")),
                  full_name: String(fields.get("full_name")),
                  school: String(fields.get("school") ?? ""),
                },
                emailRedirectTo: location.origin + "/login",
              },
            })
          : mode === "login"
            ? await supabase.auth.signInWithPassword({ email, password })
            : mode === "forgot"
              ? await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: location.origin + "/reset-password",
                })
              : await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      if (mode === "login") {
        notify("Signed in successfully.");
        router.push("/dashboard");
      } else
        setMessage(
          mode === "signup"
            ? "Check your email to confirm registration, then sign in."
            : mode === "forgot"
              ? "If this email has an account, you’ll receive a reset link."
              : "Password updated.",
        );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <section className="panel p-8">
        <p className="mb-3 text-xs tracking-widest text-emerald-400">
          AMATYC CODE
        </p>
        <h1 className="text-2xl font-semibold">{titles[mode]}</h1>
        {!supabase ? (
          <>
            <p className="my-5 leading-7 muted">
              Accounts need Supabase configuration. Demonstration practice,
              contests, bookmarks, and browser-local progress are available
              without signing in.
            </p>
            <Link className="btn" href="/problems">
              Try demonstration practice
            </Link>
          </>
        ) : mode === "reset" && !user ? (
          <p className="my-5 muted">
            Open the recovery link from your email first.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <>
                <label className="block text-xs muted">
                  Username
                  <input
                    name="username"
                    autoComplete="username"
                    className="field mt-2"
                    pattern="[A-Za-z0-9_]{3,30}"
                    title="3–30 letters, digits, or underscores"
                    required
                  />
                </label>
                <label className="block text-xs muted">
                  Display name
                  <input
                    name="full_name"
                    className="field mt-2"
                    maxLength={80}
                    required
                  />
                </label>
                <label className="block text-xs muted">
                  School (optional)
                  <input name="school" className="field mt-2" maxLength={100} />
                </label>
              </>
            )}
            {mode !== "reset" && (
              <label className="block text-xs muted">
                Email
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="field mt-2"
                  required
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label className="block text-xs muted">
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="field mt-2"
                  minLength={8}
                  required
                />
              </label>
            )}
            <button disabled={busy} className="btn w-full">
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? "Log in"
                  : mode === "signup"
                    ? "Create account"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"}
            </button>
          </form>
        )}
        {message && (
          <p role="status" className="mt-5 text-sm">
            {message}
          </p>
        )}
        <div className="mt-6 space-y-3 text-xs muted">
          {mode !== "login" && (
            <Link className="block" href="/login">
              Already registered? Log in
            </Link>
          )}
          {mode === "login" && (
            <>
              <Link className="block" href="/signup">
                New here? Sign up
              </Link>
              <Link className="block" href="/forgot-password">
                Forgot password?
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
