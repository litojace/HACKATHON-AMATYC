"use client";
import AnimatedSelect from "@/components/AnimatedSelect";
import { Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Profile } from "@/types/problem";
import { useApp } from "@/components/Providers";
import { Loading, PageTitle } from "@/components/Shared";
import LeaderboardTable from "@/components/LeaderboardTable";
import useAdminOnlineUsers from "@/components/AdminOnlineUsers";
export default function Leaderboard() {
  const { demo, user } = useApp();
  const onlineUserIds = useAdminOnlineUsers();
  const [profiles, setProfiles] = useState<Profile[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [school, setSchool] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    const load = () =>
      api<Profile[]>("leaderboard")
        .then((p) => {
          setProfiles(
            p.sort(
              (a, b) =>
                b.rating - a.rating ||
                (a.username < b.username
                  ? -1
                  : a.username > b.username
                    ? 1
                    : 0),
            ),
          );
          setError("");
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  const filtered = profiles.filter(
      (p) =>
        `${p.full_name ?? ""} ${p.username}`.toLowerCase().includes(search.toLowerCase()) &&
        (!school || p.school === school),
    ),
    rank = user ? profiles.findIndex((p) => p.id === user.id) : -1;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <PageTitle
        eyebrow="THE COMMUNITY"
        title="Learn together. Reach higher."
        description="AMATYC Arena Rating — Beta. Rated contest results update after the event review period."
      />
      {demo && (
        <p className="mb-5 text-sm text-emerald-400">
          Demonstration rankings · All displayed profiles are labeled samples,
          not real competitors.
        </p>
      )}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          className="field h-12 min-w-0 sm:w-64"
          aria-label="Search competitors"
          placeholder="Search name or username"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <AnimatedSelect
          className="field h-12 min-w-0 sm:w-64"
          aria-label="Filter by school"
          value={school}
          onChange={(e) => {
            setSchool(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All schools</option>
          {[...new Set(profiles.map((p) => p.school).filter(Boolean))].map(
            (s) => (
              <option key={s!}>{s}</option>
            ),
          )}
        </AnimatedSelect>
        {rank >= 0 && (
          <p className="flex min-h-12 items-center gap-3 self-center rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 shadow-[0_0_20px_rgba(251,191,36,0.08)]">
            <Trophy size={22} className="shrink-0 text-amber-400" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-200">Your rank</span>
            <span className="text-2xl font-bold tabular-nums text-amber-300">#
            {profiles.filter((p) => p.rating > profiles[rank].rating).length +
              1}
            </span>
          </p>
        )}
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <p role="alert" className="panel p-8">
          {error}
        </p>
      ) : (
        <LeaderboardTable
          profiles={filtered.slice((page - 1) * 20, page * 20)}
          all={profiles}
          userId={user?.id}
          onlineUserIds={onlineUserIds ?? undefined}
        />
      )}
      <div className="mt-5 flex justify-end gap-3">
        <button
          disabled={page === 1}
          className="btn-secondary"
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <button
          disabled={page * 20 >= filtered.length}
          className="btn-secondary"
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
