"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase, setRememberMe } from "@/lib/supabaseClient";
import { useApp } from "./Providers";

function authSiteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return configured ? new URL(configured).origin : location.origin;
}

export default function AuthForm({
  mode,
}: {
  mode: "login" | "signup" | "forgot" | "reset";
}) {
  const { user, notify } = useApp(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [messageIsError, setMessageIsError] = useState(false),
    [showPassword, setShowPassword] = useState(false),
    [rememberMe, setRemember] = useState(false),
    [showConfirmation, setShowConfirmation] = useState(false),
    [confirmationError, setConfirmationError] = useState(false);
  const confirmationInput = useRef<HTMLInputElement>(null);
  const titles = {
    login: "Welcome back.",
    signup: "Start your next chapter.",
    forgot: "Reset your password.",
    reset: "Choose a new password.",
  };
  async function signInWithGoogle() {
    if (!supabase || busy) return;
    setBusy(true);
    setMessage("");
    setMessageIsError(false);
    try {
      if (mode === "login") setRememberMe(rememberMe);
      const callback = new URL("/auth/callback", authSiteOrigin());
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage((error as Error).message);
      setMessageIsError(true);
      setBusy(false);
    }
  }
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
    setMessageIsError(false);
    try {
      if (mode === "login") setRememberMe(rememberMe);
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: String(fields.get("full_name")),
                  school: String(fields.get("school") ?? ""),
                },
                emailRedirectTo: new URL("/email-confirmed", authSiteOrigin()).toString(),
              },
            })
          : mode === "login"
            ? await supabase.auth.signInWithPassword({ email, password })
            : mode === "forgot"
              ? await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: new URL("/reset-password", authSiteOrigin()).toString(),
                })
              : await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      if (mode === "login") {
        notify("Signed in successfully.");
        router.replace("/");
      } else
        setMessage(
          mode === "signup"
            ? "Check your email to confirm registration, then sign in."
            : mode === "forgot"
              ? "If this email has an account, you’ll receive a reset link."
              : "Password updated.",
        );
    } catch (e) {
      const error = e as Error & { code?: string };
      const incorrectCredentials = mode === "login" && (
        error.code === "invalid_credentials" || /invalid login credentials/i.test(error.message)
      );
      setMessage(incorrectCredentials ? "Incorrect email/password" : error.message);
      setMessageIsError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <section className="panel p-8">
        <p className="mb-3 text-xs tracking-widest text-emerald-400">
          AMATYC ARENA
        </p>
        <h1 className="text-2xl font-semibold">{titles[mode]}</h1>
        {!supabase ? (
          <>
            <p className="my-5 leading-7 muted">
              Sign-in is not available yet. Connect Supabase to enable Google
              and email accounts. You can browse the problem library; practice
              and contests require an account.
            </p>
            <Link className="btn" href="/problems">
              Browse problems
            </Link>
          </>
        ) : mode === "reset" && !user ? (
          <p className="my-5 muted">
            Open the recovery link from your email first.
          </p>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={submit}>
            {(mode === "login" || mode === "signup") && <>
              <button type="button" onClick={signInWithGoogle} disabled={busy} className="btn-secondary w-full">
                <span aria-hidden="true" className="font-bold text-blue-500">G</span>
                Continue with Google
              </button>
              <p className="text-center text-xs muted">or continue with email</p>
            </>}
            {mode === "signup" && (
              <>
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
                    minLength={mode === "login" ? undefined : 8}
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
            {mode === "login" && (
              <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" name="remember_me" checked={rememberMe}
                  onChange={e => setRemember(e.target.checked)} disabled={busy}
                  className="h-4 w-4 accent-emerald-500" />
                Remember me
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
          <p key={message} role={messageIsError ? "alert" : "status"} className={`motion-feedback mt-5 text-sm ${messageIsError ? "text-red-400" : ""}`}>
            {message}
          </p>
        )}
        <div className="mt-6 space-y-3 text-xs muted">
          {mode !== "login" && (
            <p>Already registered? <Link className="text-emerald-400 hover:text-emerald-300" href="/login">Log in</Link></p>
          )}
          {mode === "login" && (
            <>
              <p>New here? <Link className="text-emerald-400 hover:text-emerald-300" href="/signup">Sign up</Link></p>
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
