"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { ExamAttempt } from "@/types/problem";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import ProblemArena from "@/components/ProblemArena";
import { ChevronDown } from "lucide-react";
import Chart from "@/components/Charts";
export default function Results() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <AccountGate requireAuth>
        <Content />
      </AccountGate>
    </main>
  );
}
function Content() {
  const { id } = useParams<{ id: string }>(),
    { activity, demo } = useApp();
  const [result, setResult] = useState<ExamAttempt | null>(null),
    [error, setError] = useState(""),
    [review, setReview] = useState<number | null>(null);
  useEffect(() => {
    const aid = new URLSearchParams(location.search).get("attempt");
    if (!aid) {
      setError("No attempt was selected.");
      return;
    }
    const local = demo
      ? activity.contests.find((a) => a.id === aid && a.status === "finalized")
      : undefined;
    if (local) setResult(local);
    // Keep archived local results readable, but refresh available server review
    // content so improved explanations appear on the current attempt too.
    api<ExamAttempt>("attempts/" + aid)
      .then((a) => {
        if (a.status !== "finalized")
          setError("This exam is still active. Return to the exam to finish.");
        else setResult(a);
      })
      .catch((e) => { if (!local) setError(e.message); });
  }, [demo, activity.contests]);
  if (error)
    return (
      <div className="panel p-8">
        <p role="alert">{error}</p>
        <Link className="btn mt-5" href={"/contests/" + id}>
          Contest overview
        </Link>
      </div>
    );
  if (!result) return <Loading />;
  const breakdown = result.breakdown ?? [],
    correct = breakdown.filter((q) => q.is_correct).length,
    blank = breakdown.filter((q) => !q.selected_answer).length,
    incorrect = breakdown.length - correct - blank;
  const topics = [...new Set(breakdown.map((q) => q.category))].map((name) => ({
    name,
    value: Math.round(
      (100 *
        breakdown.filter((q) => q.category === name && q.is_correct).length) /
        breakdown.filter((q) => q.category === name).length,
    ),
  }));
  return (
    <>
      <PageTitle
        eyebrow={demo ? "DEMONSTRATION RESULTS · UNRATED" : "YOUR EXAM RESULTS"}
        title="Every attempt is a step forward."
        description="Your examination score and competitive rating are separate."
      />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-6">
        {[
          [result.score, "Score"],
          [correct, "Correct"],
          [incorrect, "Incorrect"],
          [blank, "Blank"],
          [
            breakdown.length
              ? Math.round((correct / breakdown.length) * 100) + "%"
              : "Hidden",
            "Accuracy",
          ],
          [
            Math.round((result.time_spent_seconds ?? 0) / 60) + " min",
            "Time spent",
          ],
        ].map(([v, l]) => (
          <div key={l} className="panel p-5">
            <p className="font-mono text-2xl text-emerald-400">{v}</p>
            <p className="mt-2 text-xs muted">{l}</p>
          </div>
        ))}
      </div>
      {!breakdown.length ? (
        <p className="panel p-8 muted">
          Solutions and the detailed breakdown are withheld until this event’s
          review period begins.
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-5 md:grid-cols-2">
            <Chart
              label="Answer outcomes"
              data={[
                { name: "Correct", value: correct },
                { name: "Incorrect", value: incorrect },
                { name: "Blank", value: blank },
              ]}
            />
            <Chart label="Topic accuracy (%)" data={topics} />
          </div>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-edge muted">
                <tr>
                  {[
                    "Question",
                    "Your answer",
                    "Correct",
                    "Points",
                    "Review",
                  ].map((t) => (
                    <th key={t} className="p-4">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {breakdown.map((q, i) => (
                  <Fragment key={q.id}>
                  <tr className="border-b border-edge">
                    <td className="p-4">
                      {i + 1}. {q.title}
                    </td>
                    <td className="p-4">{q.selected_answer ?? "Blank"}</td>
                    <td className="p-4">
                      {q.explanation?.correct_answer ?? "Hidden"}
                    </td>
                    <td className="p-4 font-mono">{q.points}</td>
                    <td className="p-4">
                      <button
                        className="btn-secondary whitespace-nowrap !px-3 !py-2"
                        aria-expanded={review === i}
                        aria-controls={`solution-${q.id}`}
                        disabled={!q.explanation}
                        onClick={() => setReview(review === i ? null : i)}
                      >
                        {review === i ? "Hide solution" : "View solution"}
                        <ChevronDown size={16} className={review === i ? "rotate-180" : ""} />
                      </button>
                    </td>
                  </tr>
                  {review === i && (
                    <tr>
                      <td colSpan={5} className="border-b border-edge bg-ink/40 p-4 sm:p-6">
                        <div id={`solution-${q.id}`} role="region" aria-label={`Solution for question ${i + 1}`}>
                          <ProblemArena problem={q} exam locked answer={q.selected_answer} explanation={q.explanation} />
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

        </>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <Link className="btn" href="/dashboard">
          View your progress
        </Link>
        <Link className="btn-secondary" href={"/contests/" + id}>
          Try another exam
        </Link>
      </div>
    </>
  );
}
