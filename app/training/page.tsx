"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import ProblemArena from "@/components/ProblemArena";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Clock3, RotateCcw } from "lucide-react";
import type { Answer, PracticeResult, Profile, PublicProblem } from "@/types/problem";
import { api } from "@/lib/client";
import SolutionRenderer from "@/components/SolutionRenderer";
import MathRenderer from "@/components/MathRenderer";
import LeaveSessionGuard from "@/components/LeaveSessionGuard";
import { ratingMatchedQuestions, trainingCandidates, trainingRating, TRAINING_PRESETS } from "@/lib/training";
import PerfectScoreCelebration from "@/components/PerfectScoreCelebration";
import { isPerfectScore } from "@/lib/perfect-score";
import { TRAINING_RESULT_KEY } from "@/components/TrainingResultReset";

function solutionFor(result?: PracticeResult) {
  return result?.written_solution?.trim() || null;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function Training() {
  const { problems, profile, demo, loading, savePractice, user, authLoading } = useApp();
  const rating = trainingRating(profile?.rating);
  const [preset, setPreset] = useState(0);
  const { minutes, questions: questionCount } = TRAINING_PRESETS[preset];
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [session, setSession] = useState<PublicProblem[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer | null>>({});
  const [results, setResults] = useState<Record<string, PracticeResult>>({});
  const [index, setIndex] = useState(0);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const submissionStarted = useRef(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submittingRef = useRef(false);
  const restoredFor = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || restoredFor.current === user.id) return;
    restoredFor.current = user.id;
    try {
      const raw = sessionStorage.getItem(TRAINING_RESULT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.userId !== user.id || !Array.isArray(saved.session) || !saved.session.length ||
        !saved.session.every((p: PublicProblem) => p && typeof p.id === "string" && Array.isArray(p.options) && saved.results?.[p.id]) ||
        !saved.answers || typeof saved.answers !== "object" || typeof saved.timedOut !== "boolean" ||
        !Number.isFinite(saved.deadline)) {
        sessionStorage.removeItem(TRAINING_RESULT_KEY);
        return;
      }
      setSession(saved.session);
      setAnswers(saved.answers);
      setResults(saved.results);
      setDeadline(saved.deadline);
      setTimedOut(saved.timedOut);
      setFinished(true);
      submissionStarted.current = true;
    } catch {
      // A missing or damaged snapshot falls back to session setup.
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!finished || !user) return;
    try {
      sessionStorage.setItem(TRAINING_RESULT_KEY, JSON.stringify({ userId: user.id, session, answers, results, deadline, timedOut }));
    } catch { /* Results remain readable when browser storage is unavailable. */ }
  }, [finished, user, session, answers, results, deadline, timedOut]);

  const pool = useMemo(() => trainingCandidates(problems, rating).filter((problem) => problem.option_count > 0), [problems, rating]);
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

  async function start() {
    if (starting) return;
    setStarting(true);
    setStartError("");
    try {
      const [freshPool, freshProfile] = await Promise.all([
        api<PublicProblem[]>("problems"),
        demo ? Promise.resolve(profile) : api<Profile>("me"),
      ]);
      const selected = ratingMatchedQuestions(freshPool, questionCount, trainingRating(freshProfile?.rating));
      if (selected.length < questionCount) throw new Error("There are not enough questions near your rating for this session. Choose a smaller session or try again later.");
      setSession(selected);
      setAnswers({});
      setResults({});
      setIndex(0);
      setNow(Date.now());
      setDeadline(Date.now() + minutes * 60_000);
      setFinished(false);
      setTimedOut(false);
      submissionStarted.current = false;
      setConfirmFinish(false);
      setSubmitError("");
    } catch (error) {
      setStartError((error as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function gradeTest() {
    if (submittingRef.current || finished) return;
    if (!submissionStarted.current) {
      setTimedOut(deadline !== null && Date.now() >= deadline);
      submissionStarted.current = true;
    }
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
    try { sessionStorage.removeItem(TRAINING_RESULT_KEY); } catch { /* Storage may be disabled. */ }
    setSession([]);
    setDeadline(null);
    setFinished(false);
    setAnswers({});
    setResults({});
    setIndex(0);
  }

  if (loading) return <main className="mx-auto max-w-5xl px-5 py-10"><Loading /></main>;

  return (
    <main className={`mx-auto px-5 py-10 ${session.length > 0 && !finished ? "max-w-6xl" : "max-w-5xl"}`}>
      <LeaveSessionGuard active={session.length > 0 && !finished} kind="training" />
      <PageTitle
        eyebrow="TIMED PRACTICE"
        title="Train under pressure."
        description="Build confidence with questions matched to your rating, plus a few gentle challenges to help you improve. Every session draws a fresh set."
      />

      {!session.length ? (
        <section className="panel p-5 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Choose your session</h2>
            <p className="mt-2 text-sm muted">Your training level: {rating}. Mostly questions around your level, with warm-ups and challenges up to {rating + 300}. The mix adapts to available questions.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {TRAINING_PRESETS.map((option, i) => (
                <button key={option.minutes} type="button" aria-pressed={preset === i}
                  disabled={starting || pool.length < option.questions}
                  onClick={() => { setPreset(i); setStartError(""); }}
                  className={`motion-card rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${preset === i ? "border-emerald-400 bg-emerald-400/10" : "border-edge hover:bg-panel"}`}>
                  <span className="block text-xl font-semibold">{option.minutes === 60 ? "1 hour" : `${option.minutes} minutes`}</span>
                  <span className="mt-1 block text-sm muted">{option.questions} questions · Matched to your rating</span>
                </button>
              ))}
            </div>
            {pool.length < questionCount && <p className="mt-3 text-sm muted">Only {pool.length} questions are available near your rating. {pool.length >= 5 ? "Choose a shorter session to start training." : "There are not enough suitable questions to start training yet."}</p>}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-edge pt-5">
            <p className="text-sm muted">{minutes === 60 ? "1 hour" : `${minutes} minutes`} · {questionCount} questions</p>
            <AccountGate requireAuth>
              <button type="button" className="btn" disabled={starting || pool.length < questionCount} onClick={() => void start()}>
                {starting ? "Preparing session…" : "Start training"} <ArrowRight size={16} />
              </button>
            </AccountGate>
          </div>
          {startError && <p role="alert" className="motion-feedback mt-4 text-sm text-red-400">{startError}</p>}
        </section>
      ) : finished ? (
        <section className="panel p-5 sm:p-8" data-motion="none">
          {isPerfectScore(Object.values(results), session.length) && (
            <PerfectScoreCelebration attemptId={`training-${deadline}`} total={session.length} />
          )}
          <p className="text-sm font-semibold text-emerald-400">Session complete</p>
          <h2 className="mt-2 text-2xl font-semibold">{timedOut ? "Time's up! Your training session has ended." : "Nice work staying with the clock."}</h2>
          <p className="mt-2 muted">Training score: {session.filter((problem) => results[problem.id]?.is_correct).length} / {session.length} correct · {session.length ? Math.round(100 * session.filter((problem) => results[problem.id]?.is_correct).length / session.length) : 0}%</p>
          <p className="mt-1 text-sm muted">{Object.values(answers).filter(Boolean).length} questions answered. This practice score does not affect competitive rating.</p>
          <div className="mt-6 space-y-3">
            {session.map((problem, i) => (
              <details key={problem.id} className={`group/result panel p-4 ${results[problem.id]?.is_correct ? "answer-correct" : ""}`}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                  <span><span className="mr-3 muted">{i + 1}.</span>{problem.title} <span className="ml-2 muted">{problem.difficulty}</span></span>
                  <span className="ml-auto flex items-center gap-3">
                  <span className={results[problem.id]?.is_correct ? "text-[var(--success)]" : "text-red-400"}>
                    {results[problem.id]?.is_correct ? "Correct" : "Incorrect"} · Your answer: {answers[problem.id] ?? "No answer"} · Correct: {results[problem.id]?.correct_answer ?? "—"}
                  </span>
                  <ChevronDown size={18} aria-hidden="true" className="shrink-0 muted transition-transform duration-200 ease-in-out group-open/result:rotate-180 motion-reduce:transition-none" />
                  </span>
                </summary>
                <div className="mt-4 border-t border-edge pt-4 text-sm">
                  <p className="font-medium">Question</p>
                  {problem.source_image_path ? (
                    <div className="mt-2 rounded-xl border border-edge bg-white p-2">
                      <img src={problem.source_image_path} loading="lazy"
                        alt={`Original question ${problem.question_number} from ${problem.contest_name}, including notation and answer choices`}
                        className="h-auto w-full" />
                    </div>
                  ) : (
                    <div className="mt-2 rounded-xl bg-white p-4 text-zinc-900">
                      <div className="whitespace-pre-wrap leading-7"><MathRenderer text={problem.question_latex} /></div>
                      {problem.figure_required && problem.figure_image_path && (
                        <img src={problem.figure_image_path} loading="lazy" alt={`Diagram for ${problem.title}`}
                          className="mx-auto mt-4 max-h-64 max-w-full" />
                      )}
                    </div>
                  )}
                  {problem.options.length > 0 && !(problem.source_image_path && problem.options.every(option => option.text.trim() === `Printed option ${option.label}`)) && (
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      {problem.options.map(option => (
                        <div key={option.label} className="flex gap-3 rounded-lg border border-edge p-3">
                          <dt className="shrink-0 font-semibold">{option.label}.</dt>
                          <dd className="min-w-0 leading-7"><MathRenderer text={option.text} /></dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <p className="mt-5 border-t border-edge pt-4 font-medium">Solution</p>
                  <div className="mt-2 leading-7"><SolutionRenderer text={solutionFor(results[problem.id]) ?? "The answer key has been checked, but a written explanation is not available for this question yet."} /></div>
                </div>
              </details>
            ))}
          </div>
          <button type="button" className="btn mt-6" onClick={restart}><RotateCcw size={16} /> Set up another session</button>
        </section>
      ) : current ? (
        <>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <section className="panel mb-5 flex flex-wrap items-center justify-between gap-4 p-4 sm:px-6">
              <div>
                <p className="text-sm muted">Question {index + 1} of {session.length}</p>
                <p className="mt-1 text-xs muted">{current.difficulty} difficulty · Rating-matched practice</p>
              </div>
              <div role="timer" aria-live="off" className={`flex items-center gap-2 rounded-lg border px-4 py-2 font-mono text-xl font-semibold tabular-nums ${remaining <= 60 ? "border-red-400/50 text-red-400" : "border-edge"}`}>
                <Clock3 size={19} aria-hidden="true" />{formatTime(remaining)}
              </div>
            </section>
            <AccountGate requireAuth>
              <ProblemArena key={current.id} problem={current} exam answer={answers[current.id] ?? null}
                locked={submitting}
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
            </div>
          <aside className="panel order-first p-4 lg:sticky lg:top-24 lg:order-last" aria-labelledby="training-questions-title">
            <h2 id="training-questions-title" className="font-semibold">Questions ({session.length})</h2>
            <p className="mt-1 text-sm muted">{Object.values(answers).filter(Boolean).length} of {session.length} answered</p>
            <nav aria-label="Training questions" className="mt-4 max-h-64 overflow-y-auto lg:max-h-[calc(100dvh-14rem)]">
              <ol className="space-y-2">
                {session.map((problem, i) => {
                  const answered = !!answers[problem.id];
                  return (
                    <li key={problem.id}>
                      <button type="button" disabled={submitting}
                        aria-current={i === index ? "step" : undefined}
                        aria-label={`Go to question ${i + 1}, ${answered ? "answered" : "unanswered"}`}
                        onClick={() => setIndex(i)}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${i === index ? "border-emerald-400 bg-emerald-400/10" : answered ? "border-emerald-400/30 hover:bg-emerald-400/10" : "border-edge hover:bg-panel"}`}>
                        <span className="font-medium">Question {i + 1}</span>
                        {answered ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={14} aria-hidden="true" /> Answered</span> : <span className="text-xs muted">Unanswered</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </aside>
          </div>
          {confirmFinish && <div role="dialog" aria-modal="true" aria-labelledby="finish-title" className="motion-overlay fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
            <div className="motion-dialog panel w-full max-w-md p-6">
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
