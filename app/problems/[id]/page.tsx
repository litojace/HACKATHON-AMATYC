"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { PublicProblem } from "@/types/problem";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, ServiceError } from "@/components/Shared";
import ReportProblem from "@/components/ReportProblem";
import ProblemArena from "@/components/ProblemArena";
import AdminProblemActions from "@/components/AdminProblemActions";
export default function ProblemPage() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter(),
    searchParams = useSearchParams(),
    { problems } = useApp();
  const [detail, setDetail] = useState<{ id: string; problem: PublicProblem | null; error: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    void api<PublicProblem | null>("problems/" + encodeURIComponent(id)).then(
      (problem) => { if (active) setDetail({ id, problem, error: false }); },
      () => { if (active) setDetail({ id, problem: null, error: true }); },
    );
    return () => { active = false; };
  }, [id]);
  const loading = detail?.id !== id;
  const error = !loading && detail?.error;
  const candidate = searchParams.get("returnTo");
  const returnTo =
    candidate === "/problems" || candidate?.startsWith("/problems?")
      ? candidate
      : "/problems";
  const suffix = "?returnTo=" + encodeURIComponent(returnTo);
  if (loading)
    return (
      <main className="mx-auto max-w-4xl px-5">
        <Loading />
      </main>
    );
  if (error)
    return (
      <main className="p-10">
        <ServiceError />
      </main>
    );
  const index = problems.findIndex((p) => p.id === id),
    problem = detail?.id === id ? detail.problem : null;
  if (!problem)
    return (
      <main className="p-10">
        <h1>Problem not found or not released.</h1>
        <Link href={returnTo}>Back to problems</Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <Link href={returnTo} className="text-sm muted">
        ← Back to problems
      </Link>
      <div className="mt-6">
        <AdminProblemActions problemId={problem.id} />
        <AccountGate requireAuth>
        <ProblemArena
          key={problem.id}
          problem={problem}
          onPrevious={
            index > 0
              ? () => router.push("/problems/" + problems[index - 1].id + suffix)
              : undefined
          }
          onNext={() =>
            router.push(
              index + 1 < problems.length
                ? "/problems/" + problems[index + 1].id + suffix
                : returnTo,
            )
          }
        />
        </AccountGate>
      </div>
      <ReportProblem problemId={id} />
    </main>
  );
}
