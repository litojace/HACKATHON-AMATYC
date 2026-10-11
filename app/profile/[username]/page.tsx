"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/problem";
import { api } from "@/lib/client";
import { useApp } from "@/components/Providers";
import { Loading } from "@/components/Shared";
import { getCodeforcesTitle } from "@/lib/rating";
import RankedName, { RankText } from "@/components/RankedName";
import AdminProblemActions from "@/components/AdminProblemActions";
import { CalendarDays, Trophy } from "lucide-react";
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
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-6">
              <div className="flex min-w-0 items-center gap-4 md:flex-1 md:gap-5">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="Profile avatar" className="h-16 w-16 shrink-0 rounded-full object-cover sm:h-20 sm:w-20 md:h-24 md:w-24" />
              ) : (
                <span aria-label="Default avatar" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-ink text-2xl font-semibold sm:h-20 sm:w-20 md:h-24 md:w-24 md:text-4xl">{(p.full_name?.trim() || "Competitor").charAt(0).toUpperCase()}</span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl"><RankedName name={p.full_name} rating={p.rating} featured /></h1>
                {p.school && <p className="mt-1 break-words text-sm muted">{p.school}</p>}
              </div>
              </div>
                <div className="flex w-full items-center justify-between gap-4 border-t border-edge pt-4 md:ml-auto md:w-auto md:shrink-0 md:gap-6 md:border-t-0 md:pt-0">
                  <div className="shrink-0">
                    <p className="text-3xl font-mono"><RankText rating={p.rating}>{p.rating}</RankText></p>
                    <p className="mt-1 text-sm"><RankText rating={p.rating}>{getCodeforcesTitle(p.rating).title}</RankText></p>
                  </div>
                  <div className="min-w-0 space-y-2 border-l border-edge pl-4 text-xs muted md:pl-6 md:text-sm">
                    <p className="flex items-start gap-2">
                      <CalendarDays size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>Joined <time dateTime={p.created_at}>{new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time></span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Trophy size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>{p.contests_attended} rated {p.contests_attended === 1 ? "event" : "events"}</span>
                    </p>
                  </div>
                </div>
            </div>
            <AdminProblemActions profileUserId={p.id} />
          </section>
          <p className="mt-5 text-xs muted">
            Private practice and exam answers are not exposed on public
            profiles.
          </p>
        </>
      )}
    </main>
  );
}
