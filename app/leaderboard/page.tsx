"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Profile } from "@/types/problem";
import { useApp } from "@/components/Providers";
import { Loading, PageTitle } from "@/components/Shared";
import LeaderboardTable from "@/components/LeaderboardTable";
export default function Leaderboard() {
  const { demo, user } = useApp();
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
        p.username.toLowerCase().includes(search.toLowerCase()) &&
        (!school || p.school === school),
    ),
    rank = user ? profiles.findIndex((p) => p.id === user.id) : -1;
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <PageTitle
        eyebrow="THE COMMUNITY"
        title="Learn together. Reach higher."
        description="AMATYC Code Rating — Beta. Automatic public rating updates are disabled pending algorithm verification."
      />
      {demo && (
        <p className="mb-5 text-sm text-emerald-400">
          Demonstration rankings · All displayed profiles are labeled samples,
          not real competitors.
        </p>
      )}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          className="field w-auto"
          aria-label="Search competitors"
          placeholder="Search username"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="field w-auto"
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
        </select>
        {rank >= 0 && (
          <p className="self-center text-sm muted">
            Your rank: #
            {profiles.filter((p) => p.rating > profiles[rank].rating).length +
              1}
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
