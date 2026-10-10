"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="text-2xl">Something went wrong.</h1>
      <p className="my-5 muted">
        Your saved account data has not been changed.
      </p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
