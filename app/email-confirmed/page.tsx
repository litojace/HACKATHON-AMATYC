"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function EmailConfirmedPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    setError(
      query.get("error_description") ||
        hash.get("error_description") ||
        query.get("error") ||
        hash.get("error") ||
        "",
    );
  }, []);

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <section className="panel p-8">
        <p className="mb-3 text-xs tracking-widest text-emerald-400">AMATYC ARENA</p>
        <h1 className="text-2xl font-semibold">
          {error ? "Confirmation link issue" : "Email confirmed"}
        </h1>
        {error ? (
          <p role="alert" className="my-5">{error}</p>
        ) : (
          <p className="my-5 muted">
            Your sign-up is confirmed. Return to the browser where you started,
            refresh if needed, and sign in with your email and password.
          </p>
        )}
        <Link className="btn" href="/login">Go to sign in</Link>
      </section>
    </main>
  );
}
