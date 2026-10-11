"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Contest, ExamAttempt } from "@/types/problem";
import { useApp } from "@/components/Providers";
import { Loading } from "@/components/Shared";
export default function Overview() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter(),
    { demo, user, notify } = useApp();
  const [contest, setContest] = useState<Contest | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Contest>("contests/" + id)
      .then(setContest)
      .catch((e) => setError(e.message));
  }, [id]);
  async function start() {
    setBusy(true);
    try {
      const a = await api<ExamAttempt>("attempts/" + id + "/start", {});
      router.push(
        `/contests/${id}/${a.status === "finalized" ? "results" : "take"}?attempt=${a.id}`,
      );
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      {error ? (
        <p className="panel p-8">{error}</p>
      ) : !contest ? (
        <Loading />
      ) : (
        <section className="panel p-8">
          <Link href="/contests" className="text-sm muted">
            ← Contest directory
          </Link>
          <p className="mt-8 text-xs tracking-widest text-emerald-400">
            {contest.kind === "rated"
              ? "SCHEDULED COMPETITION"
              : "UNRATED MOCK EXAM"}
          </p>
          <h1 className="my-3 text-3xl font-semibold">{contest.name}</h1>
          <p className="leading-7 muted">{contest.description}</p>
          <div className="my-8 grid grid-cols-3 gap-3 border-y border-edge py-5 text-center">
            {[
              [contest.question_count, "Questions"],
              [contest.duration_seconds / 60, "Minutes"],
              [contest.question_count * contest.correct_points, "Max score"],
            ].map(([n, t]) => (
              <div key={t}>
                <b className="text-2xl">{n}</b>
                <p className="mt-2 text-xs muted">{t}</p>
              </div>
            ))}
          </div>
          <p className="mb-5 text-sm leading-7 muted">
            Correct: +{contest.correct_points} · Incorrect:{" "}
            {contest.incorrect_points} · Blank: {contest.blank_points}. Your
            server deadline continues when you close this page. Answers
            auto-save; an exam is immutable after submission.
          </p>
          {contest.starts_at && (
            <p className="mb-4 text-sm muted">
              Event: {new Date(contest.starts_at).toLocaleString()} –{" "}
              {new Date(contest.ends_at!).toLocaleString()}
            </p>
          )}
          {contest.kind === "rated" && (
            <p className="mb-5 text-amber-400">
              AMATYC Arena Rating — Beta. Automatic rating updates are disabled.
              Solutions unlock at the configured review time.
            </p>
          )}
          {demo && (
            <p className="mb-5 text-xs muted">
              Demo sessions use signed browser cookies. A server restart can
              invalidate them unless a persistent demo signing key is
              configured. These results are not competitive records.
            </p>
          )}
          {!demo && !user ? (
            <Link className="btn" href="/login">
              Sign in to begin
            </Link>
          ) : (
            <button disabled={busy} onClick={start} className="btn w-full">
              {busy ? "Starting…" : "Start / resume exam"}
            </button>
          )}
        </section>
      )}
    </main>
  );
}
