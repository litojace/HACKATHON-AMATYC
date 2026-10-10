"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Moon, Sun, X, ChevronDown } from "lucide-react";
import { useApp } from "./Providers";
import { supabase } from "@/lib/supabaseClient";
export default function Navbar() {
  const path = usePathname(),
    { user, profile, demo, notify } = useApp();
  const [open, setOpen] = useState(false),
    [theme, setTheme] = useState("dark");
  useEffect(() => {
    let value = "dark";
    try {
      value = localStorage.getItem("amatyc-theme") ?? "dark";
    } catch {
      notify("Theme preference cannot be persisted in this browser.");
    }
    setTheme(value);
    document.documentElement.dataset.theme = value;
  }, [notify]);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("amatyc-theme", next);
    } catch {
      notify("Theme changed for this session only.");
    }
  }
  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-ink/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <rect x="1" y="1" width="30" height="30" rx="8" fill="#10b981" />
            <path
              d="M22 9H11l7 7-7 7h11"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <span>
            AMATYC <span className="text-emerald-400">Code</span>
          </span>
        </Link>
        <button
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          className="min-h-11 min-w-11 p-2 md:hidden"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <div
          className={`${open ? "flex" : "hidden"} order-3 w-full flex-col gap-5 text-sm md:order-none md:flex md:w-auto md:flex-row`}
        >
          {[
            ["/problems", "Problems"],
            ["/contests", "Contests"],
            ["/leaderboard", "Leaderboard"],
            ["/dashboard", "Dashboard"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={
                path.startsWith(href)
                  ? "text-emerald-400"
                  : "muted hover:text-emerald-400"
              }
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle color theme"
            onClick={toggle}
            className="min-h-11 min-w-11 rounded-lg border border-edge p-2"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {user ? (
            <details className="relative">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                {profile?.avatar_url && (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                )}
                {profile?.username ?? "Account"}
                <ChevronDown size={14} />
              </summary>
              <div className="panel absolute right-0 top-9 w-44 space-y-3 p-4 text-sm">
                <Link className="block" href="/settings">
                  Settings
                </Link>
                {profile && (
                  <Link className="block" href={"/profile/" + profile.username}>
                    Public profile
                  </Link>
                )}
                <button onClick={() => supabase?.auth.signOut()}>
                  Sign out
                </button>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="btn-secondary !px-3 !py-2">
                {demo ? "Account setup" : "Log in"}
              </Link>
              <Link href="/signup" className="btn-secondary !px-3 !py-2">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
      {demo && (
        <div className="border-t border-edge bg-emerald-400/5 px-5 py-1 text-center text-[11px] text-emerald-400">
          LOCAL MODE · Historical exams + original samples · Unrated · Activity
          stays in this browser
        </div>
      )}
    </header>
  );
}
