"use client";
import Link from "next/link";
import RankedName from "@/components/RankedName";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import Chart from "@/components/Charts";
import { getCodeforcesTitle, INITIAL_RATING } from "@/lib/rating";
import { Flame } from "lucide-react";

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

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

  const practice = activity.practice;
  const finalizedMocks = activity.contests.filter(
    (attempt) => attempt.status === "finalized" && attempt.score !== null,
  );
  const rank = getCodeforcesTitle(profile?.rating ?? INITIAL_RATING);
  const topicData = [...new Set(problems.map((problem) => problem.category))]
    .map((name) => {
      const ids = new Set(
        problems.filter((problem) => problem.category === name).map((problem) => problem.id),
      );
      const attempts = practice.filter((attempt) => ids.has(attempt.problem_id));
      return {
        name,
        value: attempts.length
          ? Math.round((100 * attempts.filter((attempt) => attempt.is_correct).length) / attempts.length)
          : 0,
        count: attempts.length,
      };
    });

  // A practice attempt or a finalized mock test counts as a study day.
  const activeDays = new Set<string>();
  for (const attempt of practice) activeDays.add(dayKey(new Date(attempt.created_at)));
  for (const attempt of finalizedMocks) {
    const date = attempt.finalized_at ?? attempt.started_at;
    if (date) activeDays.add(dayKey(new Date(date)));
  }

  const today = new Date();
  const todayKey = dayKey(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const anchor = activeDays.has(todayKey) ? today : yesterday;
  let currentStreak = 0;
  const cursor = new Date(anchor);
  while (activeDays.has(dayKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const sortedDays = [...activeDays].sort();
  let bestStreak = 0;
  let runningStreak = 0;
  let previousDay: Date | null = null;
  for (const key of sortedDays) {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const consecutive = previousDay !== null && Math.round((date.getTime() - previousDay.getTime()) / 86_400_000) === 1;
    runningStreak = consecutive ? runningStreak + 1 : 1;
    bestStreak = Math.max(bestStreak, runningStreak);
    previousDay = date;
  }

  const calendar = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() - (27 - index));
    const active = activeDays.has(dayKey(date));
    return { date, active };
  });
  const weekDays = calendar.slice(-7);
  const milestones = [7, 14, 30, 60, 100];
  const nextMilestone = milestones.find((milestone) => milestone > currentStreak)
    ?? Math.ceil((currentStreak + 1) / 100) * 100;
  const milestoneProgress = Math.min(100, (currentStreak / nextMilestone) * 100);
  const bestMockScore = finalizedMocks.length
    ? Math.max(...finalizedMocks.map((attempt) => Number(attempt.score)))
    : null;

  const recent = [
    ...practice.map((attempt) => ({
      id: `practice-${attempt.id}`,
      date: attempt.created_at,
      label: `${problems.find((problem) => problem.id === attempt.problem_id)?.title ?? attempt.problem_id} · ${attempt.is_correct ? "Correct" : attempt.selected_answer ? "Incorrect" : "Blank"}`,
      href: `/problems/${attempt.problem_id}`,
      detail: `${attempt.score} pts`,
    })),
    ...finalizedMocks.map((attempt) => ({
      id: `mock-${attempt.id}`,
      date: attempt.finalized_at ?? attempt.started_at,
      label: "Mock test completed",
      href: `/contests/${attempt.contest_id}/results?attempt=${attempt.id}`,
      detail: `${attempt.score} points · View results →`,
    })),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 8);

  return (
    <>
      <PageTitle
        eyebrow={demo ? "BROWSER-LOCAL DEMONSTRATION PROGRESS" : "YOUR PERSONAL DASHBOARD"}
        title={profile ? <>Keep growing, <RankedName name={profile.full_name} rating={profile.rating} />.</> : "Your progress, one problem at a time."}
        description={demo
          ? "A focused view of your saved practice and mock test progress."
          : "Your rating, topic accuracy, study streak, and recent activity."}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="panel p-5">
          <p className={`font-mono text-3xl ${rank.color}`}>{profile?.rating ?? INITIAL_RATING}</p>
          <p className="mt-2 text-sm muted">Rating · {rank.title}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-3xl text-emerald-400">{bestMockScore ?? "—"}</p>
          <p className="mt-2 text-sm muted">Best mock test score</p>
        </div>
      </div>

      <section className="panel mb-5 overflow-hidden p-5 sm:p-6" aria-labelledby="streak-title">
        <div className="rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-orange-500/15 text-orange-400">
                <Flame aria-hidden="true" className="size-8" strokeWidth={2.25} />
              </div>
              <div>
                <p className="text-sm font-semibold text-orange-400">Study streak</p>
                <h2 id="streak-title" className="mt-0.5 text-3xl font-bold tracking-tight">
                  {currentStreak} <span className="text-lg font-semibold">{currentStreak === 1 ? "day" : "days"} in a row</span>
                </h2>
              </div>
            </div>
            <p className="rounded-full border border-edge bg-panel px-4 py-2 text-sm muted">
              Personal best <strong className="ml-1 text-[var(--text)]">{bestStreak} {bestStreak === 1 ? "day" : "days"}</strong>
            </p>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-3" aria-label="Practice activity for the last seven days">
            {weekDays.map(({ date, active }) => (
              <div key={dayKey(date)} className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium muted">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>
                <div
                  title={`${dayLabel(date)}: ${active ? "activity recorded" : "no activity"}`}
                  aria-label={`${dayLabel(date)}: ${active ? "activity recorded" : "no activity"}`}
                  className={`grid size-10 place-items-center rounded-full border sm:size-12 ${active ? "border-orange-400 bg-orange-500 text-white shadow-sm shadow-orange-500/20" : "border-edge bg-panel muted"}`}
                >
                  {active ? <Flame aria-hidden="true" className="size-5" /> : <span className="text-xs">{date.getDate()}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-orange-400/15 bg-orange-500/10 px-4 py-3 text-center">
            <Flame aria-hidden="true" className="mx-auto mb-1 size-5 text-orange-400" />
            <p className="text-sm font-semibold">{currentStreak === 0 ? "Ready to start a streak?" : milestones.includes(currentStreak) ? "Milestone reached—keep it going!" : "Nice work. Keep the momentum going!"}</p>
            <p className="mt-0.5 text-xs muted">{currentStreak === 0 ? "Try a problem today to light your first flame." : "A little practice each day adds up."}</p>
          </div>
        </div>

        <div className="mt-5 px-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold">Next milestone · {nextMilestone} days</span>
            <span className="muted">{Math.min(currentStreak, nextMilestone)} / {nextMilestone}</span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-edge/70"
            role="progressbar"
            aria-label={`Progress toward ${nextMilestone}-day streak milestone`}
            aria-valuemin={0}
            aria-valuemax={nextMilestone}
            aria-valuenow={Math.min(currentStreak, nextMilestone)}
          >
            <div className="h-full rounded-full bg-orange-500 transition-[width]" style={{ width: `${milestoneProgress}%` }} />
          </div>
          <p className="mt-2 text-xs muted">Practice a problem or finish a mock test to count the day.</p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Chart id="topic-accuracy" label="Topic accuracy (%)" data={topicData} />
        <section className="panel min-w-0 p-5" aria-labelledby="recent-activity-title">
          <h2 id="recent-activity-title" className="mb-5 font-semibold">Recent activity</h2>
          {!recent.length ? (
            <p className="py-10 text-center text-sm muted">No activity yet. Try a problem or take a mock test to start your record.</p>
          ) : (
            <ul className="divide-y divide-edge">
              {recent.map((item) => (
                <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={item.href} className="text-sm hover:text-emerald-400">{item.label}</Link>
                    <p className="mt-1 text-xs muted">{item.detail}</p>
                  </div>
                  <time className="text-xs muted" dateTime={item.date}>{new Date(item.date).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
