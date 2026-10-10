"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/problem";
import { api } from "@/lib/client";
import { useApp } from "@/components/Providers";
import { Loading, PageTitle } from "@/components/Shared";
import { getCodeforcesTitle } from "@/lib/rating";
import Chart from "@/components/Charts";
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
          <PageTitle
            eyebrow={demo ? "SAMPLE PUBLIC PROFILE" : "COMPETITOR PROFILE"}
            title={p.username}
            description={p.full_name}
          />
          <div className="panel mb-6 flex flex-wrap gap-8 p-8">
            {p.avatar_url && (
              <img
                src={p.avatar_url}
                alt="Profile avatar"
                className="h-16 w-16 rounded-full object-cover"
              />
            )}
            <div>
              <p className={`text-3xl font-mono ${getCodeforcesTitle(p.rating).color}`}>{p.rating}</p>
              <p className={getCodeforcesTitle(p.rating).color}>
                {getCodeforcesTitle(p.rating).title}
              </p>
            </div>
            <div>
              <p>{p.school ?? "School not provided"}</p>
              <p className="mt-2 text-sm muted">
                Joined {new Date(p.created_at).toLocaleDateString()}
              </p>
              <p className="mt-2 text-sm muted">
                {p.contests_attended} rated events
              </p>
            </div>
          </div>
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
