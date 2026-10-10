"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Search, CheckCircle2, RotateCw } from "lucide-react";
import { useApp } from "@/components/Providers";
import { Loading, PageTitle, ServiceError } from "@/components/Shared";
import { filterProblems } from "@/lib/domain";
export default function Problems() {
  const { problems, activity, bookmark, loading, error } = useApp();
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [page, setPage] = useState(1);
  useEffect(() => {
    setFilters(Object.fromEntries(new URLSearchParams(location.search)));
  }, []);
  function change(key: string, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    const params = new URLSearchParams(
      Object.entries(next).filter(([, v]) => v),
    );
    history.replaceState(
      null,
      "",
      "/problems" + (params.size ? "?" + params.toString() : ""),
    );
  }
  const visible = filterProblems(
    problems,
    filters,
    activity.practice,
    activity.bookmarks,
  );
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <PageTitle
        eyebrow="THE PROBLEM LIBRARY"
        title="Find your next breakthrough."
        description="Browse by topic, difficulty, and source. Build understanding one problem at a time."
      />
      <div className="panel mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center gap-2">
          <Search size={16} />
          <input
            className="field"
            aria-label="Search problems"
            placeholder="Title or keywords"
            value={filters.q ?? ""}
            onChange={(e) => change("q", e.target.value)}
          />
        </label>
        {[
          ["topic", "Topic", [...new Set(problems.map((p) => p.category))]],
          ["difficulty", "Difficulty", ["Easy", "Medium", "Hard"]],
          [
            "source",
            "Source",
            [...new Set(problems.map((p) => p.contest_name))],
          ],
          ["status", "Status", ["solved", "attempted", "unsolved"]],
          ["sort", "Sort", ["rating", "difficulty", "title", "source"]],
        ].map(([key, label, options]) => (
          <select
            key={key as string}
            aria-label={label as string}
            className="field"
            value={filters[key as string] ?? ""}
            onChange={(e) => change(key as string, e.target.value)}
          >
            <option value="">
              {key === "sort"
                ? "Sort by rating"
                : key === "difficulty"
                  ? "All difficulties"
                  : key === "status"
                    ? "All statuses"
                    : "All " + (label as string).toLowerCase() + "s"}
            </option>
            {(options as string[]).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            className="field"
            aria-label="Minimum rating"
            placeholder="Min rating"
            value={filters.min ?? ""}
            onChange={(e) => change("min", e.target.value)}
          />
          <input
            type="number"
            min="0"
            className="field"
            aria-label="Maximum rating"
            placeholder="Max rating"
            value={filters.max ?? ""}
            onChange={(e) => change("max", e.target.value)}
          />
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={!!filters.bookmarked}
            onChange={(e) =>
              change("bookmarked", e.target.checked ? "true" : "")
            }
          />
          Bookmarked only
        </label>
      </div>
      {loading ? (
        <Loading />
      ) : error ? (
        <ServiceError />
      ) : (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-edge text-xs muted">
                <tr>
                  {[
                    "Status",
                    "Problem",
                    "Topic",
                    "Difficulty",
                    "Rating",
                    "Acceptance",
                    "Source",
                    "Save",
                  ].map((h) => (
                    <th key={h} className="p-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.slice((page - 1) * 12, page * 12).map((p) => {
                  const attempted = activity.practice.filter(
                      (a) => a.problem_id === p.id,
                    ),
                    solved = attempted.some((a) => a.is_correct);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-edge last:border-0 hover:bg-emerald-500/5"
                    >
                      <td
                        className="p-4"
                        aria-label={
                          solved
                            ? "Solved"
                            : attempted.length
                              ? "Attempted"
                              : "Unsolved"
                        }
                      >
                        {solved ? (
                          <CheckCircle2
                            size={18}
                            className="text-emerald-400"
                          />
                        ) : attempted.length ? (
                          <RotateCw size={18} className="text-amber-400" />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Link
                          className="font-medium hover:text-emerald-400"
                          href={"/problems/" + p.id}
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="p-4 text-xs muted">{p.category}</td>
                      <td className="p-4 text-xs">{p.difficulty}</td>
                      <td className="p-4 font-mono text-emerald-400">
                        {p.difficulty_rating ?? "—"}
                      </td>
                      <td className="p-4 text-xs muted">
                        {p.acceptance_rate != null
                          ? p.acceptance_rate + "%"
                          : "—"}
                      </td>
                      <td className="p-4 text-xs muted">{p.contest_name}</td>
                      <td className="p-4">
                        <button
                          aria-label={"Bookmark " + p.title}
                          aria-pressed={activity.bookmarks.includes(p.id)}
                          onClick={() => bookmark(p.id)}
                          className="p-2"
                        >
                          <Bookmark
                            size={17}
                            fill={
                              activity.bookmarks.includes(p.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!visible.length && (
              <p className="p-10 text-center muted">
                No matching problems. Try changing your filters.
              </p>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs muted">
              {visible.length} problems · Product-defined difficulty bands
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span className="self-center text-xs muted">
                {page} / {Math.max(1, Math.ceil(visible.length / 12))}
              </span>
              <button
                className="btn-secondary"
                disabled={page * 12 >= visible.length}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
