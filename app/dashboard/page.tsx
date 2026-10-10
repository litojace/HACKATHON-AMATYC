"use client";
import Link from "next/link";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import Chart from "@/components/Charts";
import { getCodeforcesTitle, INITIAL_RATING } from "@/lib/rating";
export default function Dashboard() {
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <AccountGate>
        <Content />
      </AccountGate>
    </main>
  );
}
function Content() {
  const { activity, problems, profile, demo, loading } = useApp();
  if (loading) return <Loading />;
  const practice = activity.practice,
    solved = new Set(
      practice.filter((a) => a.is_correct).map((a) => a.problem_id),
    ),
    attempted = new Set(practice.map((a) => a.problem_id)),
    accuracy = practice.length
      ? Math.round(
          (100 * practice.filter((a) => a.is_correct).length) / practice.length,
        )
      : 0,
    rank = getCodeforcesTitle(profile?.rating ?? INITIAL_RATING);
  const topicData = [...new Set(problems.map((p) => p.category))]
    .map((name) => {
      const ids = problems.filter((p) => p.category === name).map((p) => p.id),
        attempts = practice.filter((a) => ids.includes(a.problem_id));
      return {
        name,
        value: attempts.length
          ? Math.round(
              (100 * attempts.filter((a) => a.is_correct).length) /
                attempts.length,
            )
          : 0,
        count: attempts.length,
      };
    })
    .filter((p) => p.count);
  const recentDays = [
    ...new Set(
      practice.map((a) => new Date(a.created_at).toLocaleDateString()),
    ),
  ]
    .slice(0, 14)
    .reverse();
  const finals = activity.contests.filter((a) => a.status === "finalized");
  const weak = [...topicData].sort((a, b) => a.value - b.value)[0];
  const recommendation =
    problems.find(
      (p) => !solved.has(p.id) && (!weak || p.category === weak.name),
    ) ?? problems.find((p) => !solved.has(p.id));
  return (
    <>
      <PageTitle
        eyebrow={
          demo
            ? "BROWSER-LOCAL DEMONSTRATION PROGRESS"
            : "YOUR PERSONAL DASHBOARD"
        }
        title={
          profile
            ? `Keep growing, ${profile.full_name}.`
            : "Your progress, one problem at a time."
        }
        description={
          demo
            ? "These charts use your actual demonstration activity in this browser, not invented student statistics."
            : "Private analytics from your stored practice and contest history."
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [profile?.rating ?? INITIAL_RATING, "Rating · " + rank.title],
          [attempted.size, "Problems attempted"],
          [solved.size, "Problems solved"],
          [accuracy + "%", "Practice accuracy"],
          [profile?.contests_attended ?? 0, "Rated contests"],
          [
            finals.length
              ? Math.max(...finals.map((a) => Number(a.score)))
              : "—",
            "Best mock score",
          ],
        ].map(([v, l]) => (
          <div key={l} className="panel p-5">
            <p className={`font-mono text-2xl ${String(l).startsWith("Rating") ? rank.color : "text-emerald-400"}`}>{v}</p>
            <p className="mt-2 text-xs muted">{l}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Chart
          label="Rating history · Beta"
          line
          data={activity.ratings.map((r) => ({
            name: new Date(r.created_at).toLocaleDateString(),
            value: r.new_rating,
          }))}
        />
        <Chart label="Topic accuracy (%)" data={topicData} />
        <Chart
          label="Practice activity"
          data={recentDays.map((name) => ({
            name,
            value: practice.filter(
              (a) => new Date(a.created_at).toLocaleDateString() === name,
            ).length,
          }))}
        />
        <Chart
          label="Solved difficulty distribution"
          data={["Easy", "Medium", "Hard"].map((name) => ({
            name,
            value: problems.filter(
              (p) => p.difficulty === name && solved.has(p.id),
            ).length,
          }))}
        />
      </div>
      <section className="panel mt-6 p-6">
        <h2 className="text-lg font-semibold">Your next useful step</h2>
        {recommendation ? (
          <>
            <p className="my-3 text-sm muted">
              {weak
                ? `${weak.name} has your lowest recorded topic accuracy (${weak.value}%). Try an unsolved problem in this topic.`
                : "Begin with an unsolved problem, then review the explanation."}{" "}
              This is a simple rule based on your recorded attempts.
            </p>
            <Link className="btn" href={"/problems/" + recommendation.id}>
              {recommendation.title} →
            </Link>
          </>
        ) : (
          <p className="mt-3 muted">
            You’ve solved the current library. Review prior attempts or try a
            mock contest.
          </p>
        )}
      </section>
      <section className="panel mt-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
        {!practice.length && !finals.length ? (
          <p className="muted">
            No activity yet. Your first attempt starts here.
          </p>
        ) : (
          <ul className="space-y-4">
            {practice.slice(0, 6).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap justify-between gap-2 border-b border-edge pb-3 text-sm"
              >
                <Link
                  href={"/problems/" + a.problem_id}
                  className="hover:text-emerald-400"
                >
                  {problems.find((p) => p.id === a.problem_id)?.title ??
                    a.problem_id}{" "}
                  ·{" "}
                  {a.is_correct
                    ? "Solved"
                    : a.selected_answer
                      ? "Incorrect"
                      : "Blank"}{" "}
                  · {a.score} pts
                </Link>
                <time className="text-xs muted">
                  {new Date(a.created_at).toLocaleString()}
                </time>
              </li>
            ))}
            {finals.slice(0, 3).map((a) => (
              <li key={a.id} className="text-sm">
                <Link
                  href={`/contests/${a.contest_id}/results?attempt=${a.id}`}
                >
                  Mock exam · {a.score} points · View results →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
