"use client";
import Link from "next/link";
import { useApp } from "./Providers";
export function Loading() {
  return (
    <div
      aria-label="Loading"
      className="space-y-4 py-8 animate-pulse motion-reduce:animate-none"
    >
      {[1, 2, 3].map((n) => (
        <div key={n} className="h-16 rounded-xl bg-panel border border-edge" />
      ))}
    </div>
  );
}
export function AccountGate({ children }: { children: React.ReactNode }) {
  const { demo, user, authLoading } = useApp();
  if (authLoading) return <Loading />;
  if (!demo && !user)
    return (
      <div className="panel mx-auto my-10 max-w-lg p-8">
        <h1 className="text-2xl">Your personal progress awaits.</h1>
        <p className="my-5 muted">
          Sign in to access your private account data.
        </p>
        <Link href="/login" className="btn">
          Sign in
        </Link>
      </div>
    );
  return children;
}
export function PageTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-xs font-medium tracking-widest text-emerald-400">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-3 muted">{description}</p>}
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return <div className="panel py-12 px-6 text-center muted">{text}</div>;
}
export function ServiceError() {
  const { error, reload } = useApp();
  return error ? (
    <div role="alert" className="panel p-8">
      <h2 className="text-lg">The problem service is unavailable.</h2>
      <p className="my-4 muted">
        {error} No demonstration data has been substituted.
      </p>
      <button onClick={reload} className="btn">
        Retry
      </button>
    </div>
  ) : null;
}
