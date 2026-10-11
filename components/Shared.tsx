"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
export function AccountGate({ children, requireAuth = false, title, description }: { children: React.ReactNode; requireAuth?: boolean; title?: string; description?: string }) {
  const { demo, user, authLoading } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  if (authLoading) return <Loading />;
  if (!user && (requireAuth || !demo))
    return (
      <div className="panel mx-auto my-10 max-w-lg p-8">
        <h1 className="text-2xl">{title ?? (requireAuth ? "Sign in to practice." : "Your personal progress awaits.")}</h1>
        <p className="my-5 muted">
          {description ?? (requireAuth ? "Log in with Google or email to solve problems and take contests." : "Sign in to access your private account data.")}
        </p>
        <Link href={"/login?next=" + encodeURIComponent(pathname)} onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          router.push("/login?next=" + encodeURIComponent(pathname + location.search));
        }} className="btn">
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
