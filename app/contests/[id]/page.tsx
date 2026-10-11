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
    { user, authLoading, notify } = useApp();
  const [contest, setContest] = useState<Contest | null>(null),
    [error, setError] = useState(""),
    [attemptState, setAttemptState] = useState<{ key: string; resumable: boolean; failed?: boolean } | null>(null),
    [statusRetry, setStatusRetry] = useState(0),
    [busy, setBusy] = useState(false);
  const attemptKey = `${id}:${user?.id ?? ""}:${statusRetry}`;
  const attemptReady = attemptState?.key === attemptKey;
  const resuming = attemptReady && attemptState.resumable;
  useEffect(() => {
    api<Contest>("contests/" + id)
      .then(setContest)
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    if (!user || authLoading) return;
    let cancelled = false;
    api<{ resumable: boolean }>(`attempts/${id}/status`)
      .then(({ resumable }) => {
        if (!cancelled) setAttemptState({ key: attemptKey, resumable });
      })
      .catch((e) => { if (!cancelled) { setAttemptState({ key: attemptKey, resumable: false, failed: true }); notify(e.message); } });
    return () => { cancelled = true; };
  }, [id, user, authLoading, attemptKey, notify]);
  async function start() {
    if (!user || authLoading) return;
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
              {contest.rating_enabled ? "Ratings update 15 minutes after this event closes." : "This event does not update ratings."}
              {" "}Solutions unlock at {contest.review_at ? new Date(contest.review_at).toLocaleString() : "the configured review time"}.
            </p>
          )}
          {authLoading ? <Loading /> : !user ? (
            <Link className="btn" href={"/login?next=" + encodeURIComponent(`/contests/${id}`)}>
              Sign in to begin
            </Link>
          ) : (
            <button disabled={busy || !attemptReady} onClick={attemptState?.failed ? () => setStatusRetry((n) => n + 1) : start} className="btn w-full">
              {!attemptReady ? "Checking exam…" : attemptState.failed ? "Retry exam check" : busy ? resuming ? "Resuming…" : "Starting…" : resuming ? "Resume exam" : "Start exam"}
            </button>
          )}
        </section>
      )}
    </main>
  );
}
