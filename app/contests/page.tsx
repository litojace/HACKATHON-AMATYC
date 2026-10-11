"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock3, ArrowRight, Trophy } from "lucide-react";
import { api } from "@/lib/client";
import type { Contest } from "@/types/problem";
import { useApp } from "@/components/Providers";
import { Loading, PageTitle } from "@/components/Shared";
import AdminProblemActions from "@/components/AdminProblemActions";
export default function Contests() {
  const { activity } = useApp();
  const [contests, setContests] = useState<Contest[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    api<Contest[]>("contests")
      .then(setContests)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <PageTitle
        eyebrow="THE CONTEST ROOM"
        title="Practice with purpose."
        description="Historical exams and original mocks are unrated. Competitive events follow their own schedule and rules."
      />
      <AdminProblemActions contests />
      {loading ? (
        <Loading />
      ) : error ? (
        <p role="alert" className="panel p-8">
          {error}
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {contests.map((c) => {
            const done = activity.contests.filter(
              (a) => a.contest_id === c.id && a.status === "finalized",
            );
            return (
              <article key={c.id} className="motion-card panel p-6">
                <Trophy size={24} className="text-emerald-400" />
                <p className="mt-5 text-xs muted">
                  {c.semester} {c.year} ·{" "}
                  {c.kind === "rated"
                    ? "Scheduled event · Rating Beta"
                    : "Unrated mock"}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{c.name}</h2>
                <p className="my-4 text-sm leading-6 muted">{c.description}</p>
                <p className="flex items-center gap-2 text-xs muted">
                  <Clock3 size={14} />
                  {c.question_count} questions · {c.duration_seconds / 60}{" "}
                  minutes
                </p>
                <p className="my-5 text-sm">
                  {done.length
                    ? "Completed · Best score " +
                      Math.max(...done.map((a) => Number(a.score)))
                    : "Not completed"}
                </p>
                <Link href={"/contests/" + c.id} className="btn w-full">
                  View contest <ArrowRight size={15} />
                </Link>
              </article>
            );
          })}
          {!contests.length && (
            <p className="muted">No published contests yet.</p>
          )}
        </div>
      )}
    </main>
  );
}
