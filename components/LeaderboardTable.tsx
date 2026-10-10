"use client";
import Link from "next/link";
import { getCodeforcesTitle } from "@/lib/rating";
import type { Profile } from "@/types/problem";
export default function LeaderboardTable({
  profiles,
  all,
  userId,
}: {
  profiles: Profile[];
  all: Profile[];
  userId?: string;
}) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[750px] text-left text-sm">
        <thead className="border-b border-edge text-xs muted">
          <tr>
            {[
              "Rank",
              "Competitor",
              "School",
              "Rating",
              "Tier",
              "Rated events",
              "Last change",
            ].map((h) => (
              <th key={h} className="p-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => {
            const rank = all.filter((q) => q.rating > p.rating).length + 1,
              tier = getCodeforcesTitle(p.rating);
            return (
              <tr
                key={p.id}
                className={`border-b border-edge last:border-0 ${p.id === userId ? "bg-emerald-500/10" : ""}`}
              >
                <td
                  className={`p-4 font-mono ${rank <= 3 ? "text-amber-400" : "muted"}`}
                >
                  #{rank}
                </td>
                <td className="p-4">
                  <Link
                    className={`font-medium hover:underline ${tier.color}`}
                    href={"/profile/" + p.username}
                  >
                    {p.username}
                  </Link>
                </td>
                <td className="p-4 text-xs muted">
                  {p.school ?? "Not provided"}
                </td>
                <td className={`p-4 font-mono ${tier.color}`}>{p.rating}</td>
                <td className={`p-4 text-xs ${tier.color}`}>{tier.title}</td>
                <td className="p-4 font-mono muted">{p.contests_attended}</td>
                <td className="p-4 font-mono">
                  {(p.last_delta ?? 0) > 0 ? "+" : ""}
                  {p.last_delta ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!profiles.length && (
        <p className="p-10 text-center muted">
          No matching public competitors.
        </p>
      )}
    </div>
  );
}
