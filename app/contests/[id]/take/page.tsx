"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { Flag, Clock3 } from "lucide-react";
import { api } from "@/lib/client";
import type { ExamAttempt, Answer } from "@/types/problem";
import { remainingSeconds } from "@/lib/domain";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading } from "@/components/Shared";
import ProblemArena from "@/components/ProblemArena";
import Dialog from "@/components/ui/Dialog";
export default function Take() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <AccountGate requireAuth>
        <Exam />
      </AccountGate>
    </main>
  );
}
function Exam() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter(),
    { notify, saveExam, demo, user, authLoading } = useApp();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null),
    [index, setIndex] = useState(0),
    [now, setNow] = useState(() => Date.now()),
    [offset, setOffset] = useState(0),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    current = useRef<ExamAttempt | null>(null);
  const apply = useCallback(
    (a: ExamAttempt) => {
      current.current = a;
      setAttempt(a);
      setOffset(Date.parse(a.server_now) - Date.now());
      if (a.status === "finalized") {
        saveExam(a);
        router.replace(`/contests/${id}/results?attempt=${a.id}`);
      }
    },
    [id, router, saveExam],
  );
  const attemptId = attempt?.id,
    deadline = attempt?.deadline,
    status = attempt?.status;
  const retryAt = useRef(0);
  useEffect(() => {
    if (authLoading || (!demo && !user)) return;
    let active = true;
    const controller = new AbortController();
    const aid = new URLSearchParams(location.search).get("attempt");
    (aid
      ? api<ExamAttempt>(
          "attempts/" + aid,
          undefined,
          undefined,
          controller.signal,
        )
      : api<ExamAttempt>(
          "attempts/" + id + "/start",
          {},
          undefined,
          controller.signal,
        )
    )
      .then((a) => {
        if (active) {
          apply(a);
          history.replaceState(
            null,
            "",
            `/contests/${id}/take?attempt=${a.id}`,
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [id, demo, user, authLoading, apply]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!attemptId) return;
    const poll = setInterval(() => {
      if (pending.current) return;
      api<ExamAttempt>("attempts/" + attemptId)
        .then(apply)
        .catch((e) => notify(e.message));
    }, 15000);
    return () => clearInterval(poll);
  }, [attemptId, apply, notify]);
  useEffect(() => {
    if (
      attemptId &&
      deadline &&
      status === "active" &&
      now > retryAt.current &&
      remainingSeconds(deadline, now + offset) === 0 &&
      !pending.current
    ) {
      pending.current = true;
      api<ExamAttempt>("attempts/" + attemptId + "/finish", {})
        .then(apply)
        .catch((e) => {
          notify(e.message);
          retryAt.current = Date.now() + 10000;
        })
        .finally(() => {
          pending.current = false;
        });
    }
  }, [now, attemptId, deadline, status, offset, apply, notify]);
  useEffect(() => {
    if (status !== "active") return;
    function leave(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [status]);
  async function save(answer: Answer | null, flagged?: boolean) {
    const a = current.current;
    if (!a || pending.current) return;
    pending.current = true;
    setBusy(true);
    const pid = a.questions[index].id;
    try {
      apply(
        await api<ExamAttempt>(
          "attempts/" + a.id,
          {
            problem_id: pid,
            answer,
            flagged: flagged ?? a.flags.includes(pid),
          },
          "PATCH",
        ),
      );
    } catch (e) {
      notify("Answer was not saved. " + (e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function finish() {
    if (!attempt || pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      apply(await api<ExamAttempt>("attempts/" + attempt.id + "/finish", {}));
    } catch (e) {
      notify((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
      setConfirm(false);
    }
  }
  if (error)
    return (
      <div className="panel p-8" role="alert">
        {error}
        <button
          className="btn ml-4"
          onClick={() => router.push("/contests/" + id)}
        >
          Return to overview
        </button>
      </div>
    );
  if (!attempt) return <Loading />;
  const p = attempt.questions[index],
    answered = Object.values(attempt.answers).filter(Boolean).length,
    remaining = remainingSeconds(attempt.deadline, now + offset);
  return (
    <>
      <div className="mb-5 flex justify-between">
        <h1 className="text-xl font-semibold">
          Question {index + 1} / {attempt.questions.length}
        </h1>
        <p className="text-xs muted">
          {busy ? "Saving…" : "All changes saved"} · Server-timed exam
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
        <div>
          <ProblemArena
            key={p.id}
            problem={p}
            exam
            answer={attempt.answers[p.id]}
            onAnswer={(answer) => save(answer)}
            locked={busy || remaining === 0}
            onPrevious={index > 0 ? () => setIndex(index - 1) : undefined}
            onNext={
              index + 1 < attempt.questions.length
                ? () => setIndex(index + 1)
                : undefined
            }
          />
          <button
            className={`btn-secondary mt-4 ${attempt.flags.includes(p.id) ? "text-amber-400" : ""}`}
            onClick={() =>
              save(attempt.answers[p.id] ?? null, !attempt.flags.includes(p.id))
            }
            disabled={busy || remaining === 0}
          >
            <Flag size={16} />
            {attempt.flags.includes(p.id) ? "Remove flag" : "Flag for review"}
          </button>
        </div>
        <aside className="panel p-5 lg:sticky lg:top-28">
          <div
            role="timer"
            aria-label="Time remaining"
            className={`flex items-center gap-2 font-mono text-3xl ${remaining < 300 ? "text-red-400" : "text-emerald-400"}`}
          >
            <Clock3 size={22} />
            {Math.floor(remaining / 60)
              .toString()
              .padStart(2, "0")}
            :{(remaining % 60).toString().padStart(2, "0")}
          </div>
          <p className="my-4 text-xs muted">
            {answered} answered · {attempt.questions.length - answered} blank ·{" "}
            {attempt.flags.length} flagged
          </p>
          <div className="grid grid-cols-5 gap-2">
            {attempt.questions.map((q, i) => (
              <button
                key={q.id}
                disabled={busy}
                aria-label={`Question ${i + 1}${attempt.flags.includes(q.id) ? ", flagged" : ""}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => setIndex(i)}
                className={`min-h-11 rounded-lg border text-xs font-mono ${i === index ? "border-emerald-500 text-emerald-400" : attempt.flags.includes(q.id) ? "border-amber-400 text-amber-400" : attempt.answers[q.id] ? "border-emerald-500/30 bg-emerald-500/10" : "border-edge muted"}`}
              >
                {i + 1}
                {attempt.flags.includes(q.id) ? " ⚑" : ""}
              </button>
            ))}
          </div>
          <button
            className="btn mt-6 w-full"
            disabled={busy}
            onClick={() => setConfirm(true)}
          >
            Submit Exam
          </button>
          <p className="mt-4 text-xs muted">
            Green: answered · Amber: flagged. Answers remain editable until
            finalization.
          </p>
        </aside>
      </div>
      {confirm && (
        <Dialog title="Finalize your exam?" onClose={() => setConfirm(false)}>
          <p className="leading-7 muted">
            {answered} answered · {attempt.questions.length - answered}{" "}
            unanswered · {attempt.flags.length} flagged. You cannot change
            answers after submission.
          </p>
          <button disabled={busy} className="btn mt-6" onClick={finish}>
            Confirm submission
          </button>
        </Dialog>
      )}
    </>
  );
}
