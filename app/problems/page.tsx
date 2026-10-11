"use client";
import AnimatedSelect from "@/components/AnimatedSelect";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Search, CheckCircle2, RotateCw } from "lucide-react";
import { useApp } from "@/components/Providers";
import { Loading, PageTitle, ServiceError } from "@/components/Shared";
import { difficultyColor, filterProblems } from "@/lib/domain";
import AdminProblemActions from "@/components/AdminProblemActions";

function compareSourcesNewestFirst(a: string, b: string) {
  const parse = (source: string) => {
    const match = source.match(/\b(Spring|Fall)\s+(\d{4})\b/i);
    return match
      ? { season: match[1].toLowerCase(), year: Number(match[2]) }
      : null;
  };
  const left = parse(a);
  const right = parse(b);
  if (left && right) {
    return (
      right.year - left.year ||
      Number(right.season === "fall") - Number(left.season === "fall")
    );
  }
  if (left) return -1;
  if (right) return 1;
  return a.localeCompare(b);
}

export default function Problems() {
  const { problems, activity, bookmark, loading, error } = useApp();
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [page, setPage] = useState(1);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setFilters(Object.fromEntries(params));
    const number = Number(params.get("page"));
    setPage(Number.isSafeInteger(number) && number > 0 ? number : 1);
  }, []);
  function change(key: string, value: string) {
    const next = { ...filters, [key]: value, page: "" };
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
  function navigatePage(number: number) {
    setPage(number);
    const params = new URLSearchParams(location.search);
    params.set("page", String(number));
    history.replaceState(null, "", "/problems?" + params.toString());
  }
  const returnParams = new URLSearchParams(Object.entries(filters).filter(([key, value]) => key !== "page" && value));
  returnParams.set("page", String(page));
  const returnTo = "/problems?" + returnParams.toString();
  const visible = filterProblems(
    problems,
    filters,
    activity.practice,
    activity.bookmarks,
  );
  const ratings = [...new Set(problems.flatMap(p => typeof p.difficulty_rating === "number" ? [p.difficulty_rating] : []))].sort((a, b) => a - b);
  const sources = [...new Set(problems.map((p) => p.contest_name))]
    .filter((source) => source !== "Original Demonstration Set")
    .sort(compareSourcesNewestFirst);
  const topics = [...new Set(problems.map((p) => p.category))].sort((a, b) =>
    a.localeCompare(b, "en", { sensitivity: "base" }),
  );
  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <PageTitle
        eyebrow="THE PROBLEM LIBRARY"
        title="Find your next breakthrough."
        description="Browse by topic, difficulty, and source. Build understanding one problem at a time."
      />
      <AdminProblemActions />
      <div className="panel mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative block">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 muted" />
          <input
            className="field pl-10"
            aria-label="Search problems"
            placeholder="Title or keywords"
            value={filters.q ?? ""}
            onChange={(e) => change("q", e.target.value)}
          />
        </label>
        {[
          ["topic", "Topic", topics],
          ["difficulty", "Difficulty", ["Easy", "Medium", "Hard"]],
          [
            "source",
            "Source",
            sources,
          ],
          ["status", "Status", ["solved", "attempted", "unsolved"]],
          ["sort", "Sort", ["rating", "difficulty", "title", "source"]],
        ].map(([key, label, options]) => (
          <AnimatedSelect
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
              <option key={v} value={v}>
                {key === "status" || key === "sort"
                  ? v.charAt(0).toUpperCase() + v.slice(1)
                  : v}
              </option>
            ))}
          </AnimatedSelect>
        ))}
        <div className="flex gap-2">
          {(["min", "max"] as const).map(key => (
            <AnimatedSelect
              key={key}
              className="field min-w-0"
              aria-label={key === "min" ? "Minimum rating" : "Maximum rating"}
              value={filters[key] ?? ""}
              onChange={e => change(key, e.target.value)}
            >
              <option value="">{key === "min" ? "Min rating" : "Max rating"}</option>
              {filters[key] && !ratings.includes(Number(filters[key])) && <option value={filters[key]} hidden>{key === "min" ? "Min" : "Max"}: {filters[key]}</option>}
              {ratings.map(rating => <option key={rating} value={rating}>{rating}</option>)}
            </AnimatedSelect>
          ))}
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
          <div className="space-y-3 md:hidden" aria-label="Problem cards">
            {visible.slice((page - 1) * 12, page * 12).map(p => {
              const attempts = activity.practice.filter(a => a.problem_id === p.id);
              const status = attempts.some(a => a.is_correct) ? "Solved" : attempts.length ? "Attempted" : "Unsolved";
              return <article key={p.id} className="motion-card panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link className="min-w-0 break-words font-semibold hover:text-emerald-400" href={"/problems/" + p.id + "?returnTo=" + encodeURIComponent(returnTo)}>{p.title}</Link>
                  <button type="button" className="shrink-0 p-2" aria-label={"Bookmark " + p.title} aria-pressed={activity.bookmarks.includes(p.id)} onClick={() => bookmark(p.id)}><Bookmark size={18} fill={activity.bookmarks.includes(p.id) ? "currentColor" : "none"} /></button>
                </div>
                <p className="mt-2 text-xs muted">{p.category} · <span className={status === "Solved" ? "text-[#22c55e]" : status === "Attempted" ? "text-amber-400" : "muted"}>{status}</span></p>
                <div className="mt-3 flex items-center gap-3 text-xs"><span className={difficultyColor(p.difficulty)}>{p.difficulty}</span><span className="font-mono text-emerald-400">{p.difficulty_rating ?? "Unrated"}</span></div>
                <p className="mt-2 text-xs muted">{p.contest_name}</p>
              </article>;
            })}
            {!visible.length && <p className="panel p-6 muted">No matching problems. Try changing your filters.</p>}
          </div>
          <div className="panel hidden overflow-x-auto md:block">
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
                            className="text-[#22c55e]"
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
                          href={"/problems/" + p.id + "?returnTo=" + encodeURIComponent(returnTo)}
                        >
                          {p.title}
                        </Link>
                      </td>
                      <td className="p-4 text-xs muted">{p.category}</td>
                      <td className={`p-4 text-xs font-semibold ${difficultyColor(p.difficulty)}`}>{p.difficulty}</td>
                      <td className={`p-4 font-mono ${difficultyColor(p.difficulty)}`}>
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
                onClick={() => navigatePage(page - 1)}
              >
                Previous
              </button>
              <span className="self-center text-xs muted">
                {page} / {Math.max(1, Math.ceil(visible.length / 12))}
              </span>
              <button
                className="btn-secondary"
                disabled={page * 12 >= visible.length}
                onClick={() => navigatePage(page + 1)}
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
