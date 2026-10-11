"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Keyboard,
  ZoomIn,
} from "lucide-react";
import type {
  PublicProblem,
  Answer,
  PracticeResult,
  Explanation,
} from "@/types/problem";
import { useApp } from "./Providers";
import { api } from "@/lib/client";
import MathRenderer from "./MathRenderer";
import SolutionRenderer from "./SolutionRenderer";
import { difficultyColor } from "@/lib/domain";
import Dialog from "./ui/Dialog";
import { AccountGate, Loading } from "./Shared";
export default function ProblemArena({
  problem,
  onNext,
  onPrevious,
  exam = false,
  answer,
  onAnswer,
  locked = false,
  explanation,
}: {
  problem: PublicProblem;
  onNext?: () => void;
  onPrevious?: () => void;
  exam?: boolean;
  answer?: Answer | null;
  onAnswer?: (answer: Answer | null) => void;
  locked?: boolean;
  explanation?: Explanation | null;
}) {
  const { user, demo, authLoading, activity, bookmark, notify, savePractice } = useApp();
  const [selected, setSelected] = useState<Answer | null>(null),
    [result, setResult] = useState<PracticeResult | null>(null),
    [busy, setBusy] = useState(false),
    [session, setSession] = useState<{
      request_id: string;
      started_at: string;
    } | null>(null),
    [help, setHelp] = useState(false),
    [zoom, setZoom] = useState(false);
  const value = exam ? (answer ?? null) : selected,
    solution = exam ? explanation : result;
  const printedOptions = !!problem.source_image_path && problem.options.length > 0 &&
    problem.options.every((option) => option.text.trim() === `Printed option ${option.label}`);
  const attempts = activity.practice.filter((a) => a.problem_id === problem.id);
  const attemptCount = demo ? attempts.length : problem.attempt_count;
  const acceptedCount = demo ? attempts.filter((a) => a.is_correct).length : problem.accepted_count;
  const acceptanceRate = attemptCount != null && acceptedCount != null
    ? attemptCount ? (100 * acceptedCount / attemptCount).toFixed(1) + "%" : "—"
    : problem.acceptance_rate != null ? problem.acceptance_rate + "%" : "—";
  useEffect(() => {
    if (exam || !user || authLoading) return;
    let active = true;
    const controller = new AbortController();
    api<{ request_id: string; started_at: string }>(
      "practice/" + problem.id + "/start",
      {},
      undefined,
      controller.signal,
    )
      .then((s) => {
        if (active) setSession(s);
      })
      .catch((e) => {
        if (active) notify(e.message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [problem.id, user, authLoading, exam, notify]);
  function choose(a: Answer | null) {
    if (!user || locked || busy || (!exam && result)) return;
    if (exam) onAnswer?.(a);
    else setSelected(a);
  }
  async function submit() {
    if (!user || exam || busy || result || !session) return;
    setBusy(true);
    try {
      const r = await api<PracticeResult>("practice/" + problem.id, {
        answer: selected,
        request_id: session.request_id,
      });
      setResult(r);
      savePractice(r);
      notify("Answer submitted. Explanations are unlocked.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function retry() {
    if (!user) return;
    setBusy(true);
    try {
      const s = await api<{ request_id: string; started_at: string }>(
        "practice/" + problem.id + "/start",
        {},
      );
      setSession(s);
      setSelected(null);
      setResult(null);
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        help ||
        zoom ||
        el.closest(
          'input,textarea,select,[role="dialog"],[contenteditable="true"]',
        )
      )
        return;
      const k = e.key.toUpperCase(),
        choice = /^[1-5]$/.test(k)
          ? "ABCDE"[Number(k) - 1]
          : /^[A-E]$/.test(k)
            ? k
            : null;
      if (choice && problem.options.some(o => o.label === choice)) {
        e.preventDefault();
        choose(choice as Answer);
      } else if (
        k === "ENTER" &&
        !exam &&
        !result &&
        session &&
        el.tagName !== "A"
      ) {
        e.preventDefault();
        submit();
      } else if (k === "N" && onNext) {
        e.preventDefault();
        onNext();
      } else if (k === "P" && onPrevious) {
        e.preventDefault();
        onPrevious();
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  if (authLoading) return <Loading />;
  if (!user) return <AccountGate requireAuth>{null}</AccountGate>;
  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <span className="rounded-md bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
            {problem.category}
          </span>
          <span className={`rounded-md border border-edge px-3 py-1 text-xs font-semibold ${difficultyColor(problem.difficulty)}`}>
            {problem.difficulty} · {problem.difficulty_rating ?? "Unrated"}
          </span>
        </div>
        <div className="flex gap-2">
          {!exam && (
            <button
              aria-label="Bookmark problem"
              aria-pressed={activity.bookmarks.includes(problem.id)}
              onClick={() => bookmark(problem.id)}
              className="btn-secondary !p-3"
            >
              <Bookmark
                size={17}
                fill={
                  activity.bookmarks.includes(problem.id)
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
          )}
          <button
            aria-label="Keyboard shortcuts"
            onClick={() => setHelp(true)}
            className="btn-secondary !p-3"
          >
            <Keyboard size={17} />
          </button>
        </div>
      </div>
      <div className="panel p-5 sm:p-8">
        <p className="text-xs muted">
          {problem.contest_name} · Question {problem.question_number}
        </p>
        <h1 className="mt-3 text-2xl font-semibold">{problem.title}</h1>
        {!exam && (
          <div className="my-4">
            <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
              {[["Accepted", acceptedCount?.toLocaleString() ?? "—"], ["Attempts", attemptCount?.toLocaleString() ?? "—"], ["Acceptance rate", acceptanceRate]].map(([label, count]) => (
                <div key={label}>
                  <dt className="text-xs muted">{label}</dt>
                  <dd className="mt-1 font-semibold">{count}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      {problem.source_image_path ? <div className="my-7">
          <button className="block w-full rounded-xl border border-edge bg-white p-2" onClick={() => setZoom(true)} aria-label="Zoom original exam question">
            <img src={problem.source_image_path} alt={`Original printed question ${problem.question_number} from ${problem.contest_name}, including notation and answer choices`} className="w-full" />
          </button>
        </div> : <div className="my-7 rounded-xl bg-white p-5 text-lg leading-9 text-zinc-900 sm:p-6">
          <MathRenderer text={problem.question_latex} />
        </div>}
        {problem.figure_required && problem.figure_image_path && (
          <button
            className="relative mx-auto mb-7 block w-full max-w-md rounded-xl border border-edge p-3"
            onClick={() => setZoom(true)}
            aria-label="Zoom problem diagram"
          >
            <img
              src={problem.figure_image_path}
              alt={`Diagram for ${problem.title}`}
              className="max-h-64 w-full object-contain"
            />
            <ZoomIn size={16} className="absolute bottom-3 right-3" />
          </button>
        )}
        {problem.source_image_path && <p className="mb-3 text-sm muted">{problem.answer_format === "short_answer" ? "Enter your answer below." : "Select your answer from the choices in the image."}</p>}
        <div className={printedOptions ? "grid grid-cols-3 gap-3 sm:grid-cols-5" : "space-y-3"}>
          {problem.answer_format === "short_answer" && <label className="block text-sm">Your answer<input className="field mt-2 w-full" aria-label="Your answer" value={value ?? ""} maxLength={80} disabled={locked || busy || !!result} onChange={e => choose(e.target.value || null)} placeholder="Enter a number, time, or text response" /></label>}
          {problem.options.map((o, i) => (
            <button
              key={o.label}
              aria-label={printedOptions ? `Choose option ${o.label}` : undefined}
              aria-pressed={value === o.label}
              disabled={locked || busy || !!result}
              onClick={() => choose(o.label)}
              className={`flex min-h-14 w-full items-center ${printedOptions ? "justify-center" : "gap-4"} rounded-xl border p-4 text-left transition ${solution?.correct_answer === o.label ? "answer-correct" : result && value === o.label && !result.is_correct ? "border-red-400 bg-red-500/10" : value === o.label ? "border-emerald-500 bg-emerald-500/5" : "border-edge hover:border-emerald-500/40"}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink font-mono text-sm">
                {o.label}
              </span>
              {!printedOptions && <MathRenderer text={o.text} />}
              {!printedOptions && <span className="ml-auto text-xs muted">{i + 1}</span>}
            </button>
          ))}
        </div>
        {result && (
          <div
            role="status"
            className={`my-5 rounded-xl border p-4 text-sm ${result.is_correct ? "answer-correct-feedback" : "border-edge"}`}
          >
            <p>
              {selected
                ? result.is_correct
                  ? "Correct!"
                  : "Not quite."
                : "Blank answer."}{" "}
              You submitted {selected ?? "no answer"} · Correct answer:{" "}
              {result.correct_answer}
              <b className="float-right">
                {result.score > 0 ? "+" : ""}
                {result.score.toFixed(1)} pts
              </b>
            </p>
            {result.accepted_answers && result.accepted_answers.length > 1 && <p className="mt-2">Official key accepts: {result.accepted_answers.join(", ")}</p>}
            {result.grading_policy && result.grading_policy !== "standard" && <p className="mt-2">Official correction: {result.grading_policy === "credit_all" ? "credit awarded to everyone, including blank answers" : "correct answers earn credit; all other responses score as blank"}.</p>}
            <p className="mt-2 text-xs muted">
              Practice score only. Your competitive rating did not change.
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          {!exam && !result && !locked && (
            <button
              onClick={() => choose(null)}
              className="btn-secondary"
              disabled={busy || !value}
            >
              Clear selection
            </button>
          )}
          {!exam &&
            (!result ? (
              <button
                disabled={busy || !session || (!demo && !user)}
                onClick={submit}
                className="btn"
              >
                {busy
                  ? "Submitting…"
                  : !demo && !user
                    ? "Sign in to submit"
                    : "Submit Answer"}
              </button>
            ) : (
              <button onClick={retry} disabled={busy} className="btn">
                Try again
              </button>
            ))}
          {onPrevious && (
            <button
              onClick={onPrevious}
              className="btn-secondary"
              disabled={busy}
            >
              <ArrowLeft size={15} />
              Previous
            </button>
          )}
          {onNext && (
            <button onClick={onNext} className="btn-secondary" disabled={busy}>
              {exam ? "Next" : "Next problem"}
              <ArrowRight size={15} />
            </button>
          )}
        </div>
        {!exam && !demo && !user && (
          <a className="mt-4 block text-sm text-emerald-400" href="/login">
            Log in to record a practice attempt →
          </a>
        )}
      </div>
      {solution && (
        <div className="panel mt-5 p-6">
          <h2 className="mb-6 font-semibold">Mathematical Solution</h2>
              <div className="leading-8">
                <SolutionRenderer
                  text={
                    solution.written_solution ??
                    "A reviewed explanation is not yet available."
                  }
                />
              </div>
        </div>
      )}
      {(help || zoom) && (
        <Dialog
          title={help ? "Keyboard shortcut help" : problem.source_image_path ? "Original exam question" : "Diagram zoom"}
          onClose={() => {
            setHelp(false);
            setZoom(false);
          }}
        >
          {help ? (
            <p className="leading-8 muted">
              A–E or 1–5: select an answer
              <br />
              Enter: submit practice
              <br />
              N: next problem · P: previous problem
              <br />
              Shortcuts pause in fields and dialogs.
            </p>
          ) : (
            <img
              className="w-full"
              src={problem.source_image_path ?? problem.figure_image_path!}
              alt={`Enlarged diagram for ${problem.title}`}
            />
          )}
        </Dialog>
      )}
    </section>
  );
}
