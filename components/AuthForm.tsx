"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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
    [message, setMessage] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [showConfirmation, setShowConfirmation] = useState(false),
    [confirmationError, setConfirmationError] = useState(false);
  const confirmationInput = useRef<HTMLInputElement>(null);
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
    if ((mode === "signup" || mode === "reset") && password !== String(fields.get("confirm_password") ?? "")) {
      setConfirmationError(true);
      setMessage("");
      confirmationInput.current?.focus();
      return;
    }
    setConfirmationError(false);
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
              <div>
                <label htmlFor={`${mode}-password`} className="block text-xs muted">Password</label>
                <div className="relative mt-2">
                  <input
                    id={`${mode}-password`}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    onChange={() => setConfirmationError(false)}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="field pr-12"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    aria-controls={`${mode}-password`}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg muted hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-400"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>
            )}
            {(mode === "signup" || mode === "reset") && (
              <div>
                <label htmlFor={`${mode}-confirm-password`} className="block text-xs muted">Confirm password</label>
                <div className="relative mt-2">
                  <input
                    ref={confirmationInput}
                    id={`${mode}-confirm-password`}
                    name="confirm_password"
                    type={showConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    className="field pr-12"
                    minLength={8}
                    required
                    aria-invalid={confirmationError}
                    aria-describedby={confirmationError ? "password-match-error" : undefined}
                    onChange={() => setConfirmationError(false)}
                  />
                  <button type="button"
                    aria-label={showConfirmation ? "Hide confirm password" : "Show confirm password"}
                    aria-pressed={showConfirmation}
                    aria-controls={`${mode}-confirm-password`}
                    onClick={() => setShowConfirmation(!showConfirmation)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg muted hover:text-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-400">
                    {showConfirmation ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
                {confirmationError && <p id="password-match-error" role="alert" className="mt-2 text-xs text-red-500">Passwords do not match. Enter the same password in both fields.</p>}
              </div>
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
            <p>Already registered? <Link className="underline underline-offset-4 hover:text-emerald-400" href="/login">Log in</Link></p>
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
