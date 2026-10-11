"use client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, ServiceError } from "@/components/Shared";
import ProblemArena from "@/components/ProblemArena";
export default function ProblemPage() {
  const { id } = useParams<{ id: string }>(),
    router = useRouter(),
    { problems, loading, error } = useApp();
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
    problem = problems[index];
  if (!problem)
    return (
      <main className="p-10">
        <h1>Problem not found or not released.</h1>
        <Link href="/problems">Back to problems</Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <Link href="/problems" className="text-sm muted">
        ← Back to problems
      </Link>
      <div className="mt-6">
        <AccountGate requireAuth>
        <ProblemArena
          key={problem.id}
          problem={problem}
          onPrevious={
            index > 0
              ? () => router.push("/problems/" + problems[index - 1].id)
              : undefined
          }
          onNext={() =>
            router.push(
              index + 1 < problems.length
                ? "/problems/" + problems[index + 1].id
                : "/problems",
            )
          }
        />
        </AccountGate>
      </div>
    </main>
  );
}
