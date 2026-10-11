"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/problem";
import { api } from "@/lib/client";
import { useApp } from "@/components/Providers";
import { Loading } from "@/components/Shared";
import { getCodeforcesTitle } from "@/lib/rating";
import Chart from "@/components/Charts";
import AdminProblemActions from "@/components/AdminProblemActions";
export default function PublicProfile() {
  const { username } = useParams<{ username: string }>(),
    { demo } = useApp();
  const [p, setP] = useState<
      | (Profile & {
          rating_history: { new_rating: number; created_at: string }[];
        })
      | null
    >(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<typeof p>("profile/" + username)
      .then(setP)
      .catch((e) => setError(e.message));
  }, [username]);
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      {error ? (
        <p className="panel p-8" role="alert">
          {error}
        </p>
      ) : !p ? (
        <Loading />
      ) : (
        <>
          <section className="panel mb-6 p-6 sm:p-8" aria-label="Competitor profile">
            <p className="mb-5 text-xs font-medium tracking-widest text-emerald-400">{demo ? "SAMPLE PUBLIC PROFILE" : "COMPETITOR PROFILE"}</p>
            <div className="flex items-center gap-5">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="Profile avatar" className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24" />
              ) : (
                <span aria-label="Default avatar" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-ink text-3xl font-semibold sm:h-24 sm:w-24">{(p.full_name?.trim() || "Competitor").charAt(0).toUpperCase()}</span>
              )}
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{p.full_name?.trim() || "Competitor"}</h1>
                {p.school && <p className="mt-2 break-words muted">{p.school}</p>}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-edge pt-6">
            <div>
              <p className={`text-3xl font-mono ${getCodeforcesTitle(p.rating).color}`}>{p.rating}</p>
              <p className={getCodeforcesTitle(p.rating).color}>
                {getCodeforcesTitle(p.rating).title}
              </p>
            </div>
            <div>
              <p className="mt-2 text-sm muted">
                Joined {new Date(p.created_at).toLocaleDateString()}
              </p>
              <p className="mt-2 text-sm muted">
                {p.contests_attended} rated events
              </p>
            </div>
            </div>
            <AdminProblemActions profileUserId={p.id} />
          </section>
          <Chart
            line
            label="Rating history · Beta"
            data={(p.rating_history ?? []).map((r) => ({
              name: new Date(r.created_at).toLocaleDateString(),
              value: r.new_rating,
            }))}
          />
          <p className="mt-5 text-xs muted">
            Private practice and exam answers are not exposed on public
            profiles.
          </p>
        </>
      )}
    </main>
  );
}
