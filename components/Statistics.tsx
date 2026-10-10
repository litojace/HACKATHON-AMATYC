"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
export default function Statistics() {
  const [data, setData] = useState<{
      problems: number;
      contests: number;
      competitors: number;
      attempts: number;
      demo: boolean;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<typeof data>("stats")
      .then(setData)
      .catch(() => setError("Statistics unavailable"));
  }, []);
  return (
    <section className="panel my-9 p-6">
      {error ? (
        <p className="muted">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              ["Available problems", data?.problems],
              ["Available contests", data?.contests],
              ["Public competitors", data?.competitors],
              ["Practice attempts", data?.attempts],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="font-mono text-2xl text-emerald-400">
                  {value ?? "—"}
                </p>
                <p className="mt-2 text-xs muted">{label}</p>
              </div>
            ))}
          </div>
          {data?.demo && (
            <p className="mt-5 text-center text-xs muted">
              Historical and sample library counts. No real competitor or submission totals are
              claimed.
            </p>
          )}
        </>
      )}
    </section>
  );
}
