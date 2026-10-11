"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Moon, Sun, X, ChevronDown } from "lucide-react";
import { useApp } from "./Providers";
import { supabase } from "@/lib/supabaseClient";
export default function Navbar() {
  const path = usePathname(),
    { user, profile, demo, notify } = useApp();
  const [open, setOpen] = useState(false),
    [theme, setTheme] = useState("light");
  useEffect(() => {
    let value = "light";
    try {
      value = localStorage.getItem("amatyc-theme") ?? "light";
    } catch {
      notify("Theme preference cannot be persisted in this browser.");
    }
    setTheme(value);
    document.documentElement.dataset.theme = value;
  }, [notify]);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
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
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:py-4">
        <Link href="/" onClick={() => setOpen(false)} className="flex shrink-0 items-center gap-2 font-semibold">
          <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
            <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
            <path
              d="M22 9H11l7 7-7 7h11"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          <span>
            AMATYC <span className="text-emerald-400">Arena</span>
          </span>
        </Link>
        <div className="hidden items-center gap-6 text-sm lg:flex">
          {[
            ["/problems", "Problems"],
            ["/contests", "Contests"],
            ["/leaderboard", "Leaderboard"],
            ["/dashboard", "Dashboard"],
          ].map(([href, label]) => (
            <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}
              className={path.startsWith(href) ? "text-emerald-400" : "muted hover:text-emerald-400"}>
              {label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-3">
          <button
            aria-label="Toggle color theme"
            onClick={toggle}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-edge hover:bg-panel"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="hidden items-center gap-3 lg:flex">
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
                <span className="max-w-40 truncate">{profile?.full_name?.trim() || "Account"}</span>
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
          <button ref={menuButton} aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open} aria-controls="mobile-navigation"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-edge hover:bg-panel lg:hidden"
            onClick={() => setOpen(!open)}>
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </nav>
      <nav id="mobile-navigation" aria-label="Mobile navigation" hidden={!open}
        className="max-h-[calc(100dvh-5rem)] overflow-y-auto border-t border-edge bg-panel px-4 py-4 lg:!hidden">
        <div className="space-y-1">
          {[["/problems", "Problems"], ["/contests", "Contests"], ["/leaderboard", "Leaderboard"], ["/dashboard", "Dashboard"]].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              aria-current={path.startsWith(href) ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${path.startsWith(href) ? "bg-emerald-400/10 text-emerald-400" : "muted hover:bg-ink"}`}>
              {label}
            </Link>
          ))}
        </div>
        <div className="mt-4 border-t border-edge pt-4">
          {user ? <div className="space-y-1 text-sm">
            <p className="flex items-center gap-3 break-words px-3 pb-2 font-semibold">{profile?.avatar_url && <img src={profile.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />}{profile?.full_name?.trim() || "Account"}</p>
            <Link className="flex min-h-11 items-center rounded-lg px-3 hover:bg-ink" href="/settings" onClick={() => setOpen(false)}>Settings</Link>
            {profile && <Link className="flex min-h-11 items-center rounded-lg px-3 hover:bg-ink" href={"/profile/" + profile.username} onClick={() => setOpen(false)}>Public profile</Link>}
            <button className="min-h-11 w-full rounded-lg px-3 text-left hover:bg-ink" onClick={() => { setOpen(false); void supabase?.auth.signOut(); }}>Sign out</button>
          </div> : <div className="grid grid-cols-2 gap-3">
            <Link href="/login" className="btn-secondary justify-center" onClick={() => setOpen(false)}>{demo ? "Account setup" : "Log in"}</Link>
            <Link href="/signup" className="btn justify-center" onClick={() => setOpen(false)}>Sign up</Link>
          </div>}
        </div>
      </nav>
      {demo && (
        <div className="border-t border-edge bg-emerald-400/5 px-5 py-1 text-center text-[11px] text-emerald-400">
          <span className="lg:hidden">Local mode · Unrated practice</span>
          <span className="hidden lg:inline">LOCAL MODE · Historical exams + original samples · Unrated · Activity stays in this browser</span>
        </div>
      )}
    </header>
  );
}
