import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <h1 className="text-3xl">That page wasn’t found.</h1>
      <p className="my-5 muted">Return to the problem library to continue.</p>
      <Link href="/problems" className="btn">
        Explore problems
      </Link>
    </main>
  );
}
