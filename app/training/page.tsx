"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import ProblemArena from "@/components/ProblemArena";
import { ArrowLeft, ArrowRight, Clock3, RotateCcw } from "lucide-react";
import type { Answer, PracticeResult, PublicProblem } from "@/types/problem";
import { api } from "@/lib/client";
import SolutionRenderer from "@/components/SolutionRenderer";
import LeaveSessionGuard from "@/components/LeaveSessionGuard";

const durations = [15, 30, 60];
const counts = [5, 10, 20];
const difficultyOrder = ["Easy", "Medium", "Hard"] as const;
function solutionFor(result?: PracticeResult) {
  return result?.written_solution?.trim() || null;
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function balancedQuestions(pool: PublicProblem[], count: number) {
  const buckets = Object.fromEntries(
    difficultyOrder.map((level) => [level, shuffle(pool.filter((p) => p.difficulty === level))]),
  ) as Record<(typeof difficultyOrder)[number], PublicProblem[]>;
  const picked: PublicProblem[] = [];
  for (let i = 0; i < count; i++) {
    const preferred = buckets[difficultyOrder[i % difficultyOrder.length]];
    const next = preferred.find((p) => !picked.some((item) => item.id === p.id))
      ?? shuffle(pool.filter((p) => !picked.some((item) => item.id === p.id)))[0];
    if (!next) break;
    picked.push(next);
  }
  return picked;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function Training() {
  const { problems, loading, savePractice } = useApp();
  const [minutes, setMinutes] = useState(15);
  const [questionCount, setQuestionCount] = useState(5);
  const [session, setSession] = useState<PublicProblem[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer | null>>({});
  const [results, setResults] = useState<Record<string, PracticeResult>>({});
  const [index, setIndex] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submittingRef = useRef(false);

  const pool = useMemo(() => problems.filter((problem) => problem.options.length > 0), [problems]);
  const remaining = deadline === null ? minutes * 60 : Math.max(0, Math.ceil((deadline - now) / 1000));
  const current = session[index];

  useEffect(() => {
    if (deadline === null || finished || submitting) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [deadline, finished, submitting]);

  useEffect(() => {
    if (deadline !== null && !finished && !submitting && !submitError && now >= deadline) void gradeTest();
  }, [deadline, finished, submitting, submitError, now]);

  function start() {
    const selected = balancedQuestions(pool, questionCount);
    if (selected.length < questionCount) return;
    setSession(selected);
    setAnswers({});
    setResults({});
    setIndex(0);
    setNow(Date.now());
    setDeadline(Date.now() + minutes * 60_000);
    setFinished(false);
    setConfirmFinish(false);
    setSubmitError("");
  }

  async function gradeTest() {
    if (submittingRef.current || finished) return;
    submittingRef.current = true;
    setSubmitting(true);
    setConfirmFinish(false);
    setSubmitError("");
    const collected = { ...results };
    try {
      for (const problem of session) {
        if (collected[problem.id]) continue;
        const practice = await api<{ request_id: string }>(`practice/${problem.id}/start`, {});
        const result = await api<PracticeResult>(`practice/${problem.id}`, {
          answer: answers[problem.id] ?? null,
          request_id: practice.request_id,
        });
        collected[problem.id] = result;
        savePractice(result);
        setResults({ ...collected });
      }
      setFinished(true);
    } catch (error) {
      setSubmitError(`We couldn't grade the full set. Your saved answers are still here. ${(error as Error).message}`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function restart() {
    setSession([]);
    setDeadline(null);
    setFinished(false);
    setAnswers({});
    setResults({});
    setIndex(0);
  }

  if (loading) return <main className="mx-auto max-w-5xl px-5 py-10"><Loading /></main>;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <LeaveSessionGuard active={session.length > 0 && !finished} kind="training" />
      <PageTitle
        eyebrow="TIMED PRACTICE"
        title="Train under pressure."
        description="Choose a time limit and question set. Each session mixes easy, medium, and hard problems as evenly as your library allows."
      />

      {!session.length ? (
        <section className="panel p-5 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">1. Choose your time</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {durations.map((option) => (
                <button key={option} type="button" aria-pressed={minutes === option}
                  onClick={() => setMinutes(option)}
                  className={`rounded-xl border p-4 text-left transition-colors ${minutes === option ? "border-emerald-400 bg-emerald-400/10" : "border-edge hover:bg-panel"}`}>
                  <span className="block text-xl font-semibold">{option === 60 ? "1 hour" : `${option} minutes`}</span>
                  <span className="mt-1 block text-sm muted">Timed session</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-lg font-semibold">2. Choose your questions</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {counts.map((option) => (
                <button key={option} type="button" aria-pressed={questionCount === option}
                  disabled={pool.length < option}
                  onClick={() => setQuestionCount(option)}
                  className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${questionCount === option ? "border-emerald-400 bg-emerald-400/10" : "border-edge hover:bg-panel"}`}>
                  <span className="block text-xl font-semibold">{option} questions</span>
                  <span className="mt-1 block text-sm muted">Balanced difficulty mix</span>
                </button>
              ))}
            </div>
            {pool.length < 5 && <p className="mt-3 text-sm muted">There are not enough practice questions available to start training yet.</p>}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-edge pt-5">
            <p className="text-sm muted">{minutes === 60 ? "1 hour" : `${minutes} minutes`} · {questionCount} questions</p>
            <AccountGate requireAuth>
              <button type="button" className="btn" disabled={pool.length < questionCount} onClick={start}>
                Start training <ArrowRight size={16} />
              </button>
            </AccountGate>
          </div>
        </section>
      ) : finished ? (
        <section className="panel p-5 sm:p-8">
          <p className="text-sm font-semibold text-emerald-400">Session complete</p>
          <h2 className="mt-2 text-2xl font-semibold">Nice work staying with the clock.</h2>
          <p className="mt-2 muted">Training score: {session.filter((problem) => results[problem.id]?.is_correct).length} / {session.length} correct · {session.length ? Math.round(100 * session.filter((problem) => results[problem.id]?.is_correct).length / session.length) : 0}%</p>
          <p className="mt-1 text-sm muted">{Object.values(answers).filter(Boolean).length} questions answered. This practice score does not affect competitive rating.</p>
          <div className="mt-6 space-y-3">
            {session.map((problem, i) => (
              <details key={problem.id} className={`panel p-4 ${results[problem.id]?.is_correct ? "answer-correct" : ""}`}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <span><span className="mr-3 muted">{i + 1}.</span>{problem.title} <span className="ml-2 muted">{problem.difficulty}</span></span>
                  <span className={results[problem.id]?.is_correct ? "text-[var(--success)]" : "text-red-400"}>
                    {results[problem.id]?.is_correct ? "Correct" : "Incorrect"} · Your answer: {answers[problem.id] ?? "No answer"} · Correct: {results[problem.id]?.correct_answer ?? "—"}
                  </span>
                </summary>
                <div className="mt-4 border-t border-edge pt-4 text-sm">
                  <p className="font-medium">Solution</p>
                  <div className="mt-2 leading-7"><SolutionRenderer text={solutionFor(results[problem.id]) ?? "The answer key has been checked, but a written explanation is not available for this question yet."} /></div>
                </div>
              </details>
            ))}
          </div>
          <button type="button" className="btn mt-6" onClick={restart}><RotateCcw size={16} /> Set up another session</button>
        </section>
      ) : current ? (
        <>
          <section className="panel mb-5 flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
            <div>
              <p className="text-sm muted">Question {index + 1} of {session.length}</p>
              <p className="mt-1 text-xs muted">{current.difficulty} difficulty · Mixed set</p>
            </div>
            <div role="timer" aria-live="off" className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xl font-semibold tabular-nums ${remaining <= 60 ? "border-red-400/50 text-red-400" : "border-edge"}`}>
              <Clock3 size={19} aria-hidden="true" />{formatTime(remaining)}
            </div>
          </section>
          <AccountGate requireAuth>
            <ProblemArena key={current.id} problem={current} exam answer={answers[current.id] ?? null}
              hideKeyboardHelp locked={submitting}
              onAnswer={(answer) => setAnswers((previous) => ({ ...previous, [current.id]: answer }))} />
          </AccountGate>
          <div className="mx-auto mt-5 flex max-w-4xl items-center justify-between gap-3">
            <button type="button" className="btn-secondary" disabled={index === 0 || submitting} onClick={() => setIndex((i) => i - 1)}><ArrowLeft size={16} /> Previous</button>
            <span className="text-sm muted">{Object.values(answers).filter(Boolean).length} answered</span>
            <button type="button" className={index + 1 === session.length ? "btn" : "btn-secondary"} disabled={submitting}
              onClick={() => index + 1 < session.length ? setIndex((i) => i + 1) : setConfirmFinish(true)}>
              {index + 1 === session.length ? "Submit test" : "Next"} <ArrowRight size={16} />
            </button>
          </div>
          {submitError && <div role="alert" className="mx-auto mt-4 max-w-4xl rounded-lg border border-red-400/40 p-3 text-sm text-red-400">{submitError} <button className="ml-2 underline" onClick={() => void gradeTest()}>Retry grading</button></div>}
          {submitting && <p role="status" className="mx-auto mt-4 max-w-4xl text-center text-sm muted">Grading your answers…</p>}
          {confirmFinish && <div role="dialog" aria-modal="true" aria-labelledby="finish-title" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <div className="panel w-full max-w-md p-6">
              <h2 id="finish-title" className="text-lg font-semibold">Submit this training test?</h2>
              <p className="mt-2 text-sm muted">All {session.length} questions will be graded, including unanswered questions. You can review the correct answers and solutions afterward.</p>
              <div className="mt-5 flex justify-end gap-3"><button className="btn-secondary" onClick={() => setConfirmFinish(false)}>Keep training</button><button className="btn" onClick={() => void gradeTest()}>Submit test</button></div>
            </div>
          </div>}
        </>
      ) : null}
    </main>
  );
}
