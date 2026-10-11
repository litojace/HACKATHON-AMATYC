"use client";
import Link from "next/link";
import RankedName from "./RankedName";
import AboutUs from "./AboutUs";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useApp } from "./Providers";
import { supabase } from "@/lib/supabaseClient";
const accountItemClass = "flex min-h-11 w-full items-center rounded-lg px-3 text-left transition-[color,background-color,transform] duration-200 ease-out hover:translate-x-1 hover:bg-emerald-400/10 hover:text-emerald-400 focus-visible:translate-x-1 focus-visible:bg-emerald-400/10 focus-visible:text-emerald-400 motion-reduce:transform-none motion-reduce:transition-none";
export default function Navbar() {
  const path = usePathname(),
    { user, profile, demo } = useApp();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeAccountMenu(event: PointerEvent) {
      const menu = accountMenu.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      const menu = accountMenu.current;
      if (event.key === "Escape" && menu?.open) {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", closeAccountMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  function closeAccountMenu() {
    if (accountMenu.current) accountMenu.current.open = false;
  }
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
  return (
    <>
    <header className="fixed inset-x-0 top-0 z-30 border-b border-edge bg-ink/95 backdrop-blur">
      <nav className="relative mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-5 lg:h-[76px]">
        <Link href="/" onClick={() => setOpen(false)} className="flex shrink-0 items-center gap-2 font-semibold">
          <svg viewBox="0 0 32 32" width="38" height="38" className="shrink-0" aria-hidden="true">
            <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--accent)" />
            <path
              d="M22 9H11l7 7-7 7h11"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className="text-lg">
            AMATYC <span className="text-emerald-400">Arena</span>
          </span>
        </Link>
        <div className="hidden items-center gap-3 text-sm lg:flex xl:gap-6">
          {[
            ["/problems", "Problems"],
            ["/training", "Training"],
            ["/contests", "Contests"],
            ["/leaderboard", "Leaderboard"],
          ].map(([href, label]) => (
            <Link key={href} href={href} aria-current={path.startsWith(href) ? "page" : undefined}
              className={path.startsWith(href) ? "text-emerald-400" : "muted hover:text-emerald-400"}>
              {label}
            </Link>
          ))}
          <AboutUs />
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-3">
          <div className="hidden items-center gap-3 lg:flex">
          {user ? (
            <details ref={accountMenu} className="group relative">
              <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                {profile?.avatar_url && (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover"
                  />
                )}
                <span className="max-w-40 truncate">{profile ? <RankedName name={profile.full_name} rating={profile.rating} /> : "Account"}</span>
                <ChevronDown size={14} aria-hidden="true" className="transition-transform duration-200 ease-in-out group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="motion-menu panel absolute right-0 top-9 w-44 space-y-1 p-2 text-sm">
                <Link className={accountItemClass} href="/settings" onClick={closeAccountMenu}>
                  Settings
                </Link>
                {profile && (
                  <Link className={accountItemClass} href={"/profile/" + profile.username} onClick={closeAccountMenu}>
                    Public profile
                  </Link>
                )}
                <button className={accountItemClass} onClick={() => { closeAccountMenu(); void supabase?.auth.signOut(); }}>
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
          {[["/problems", "Problems"], ["/training", "Training"], ["/contests", "Contests"], ["/leaderboard", "Leaderboard"]].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              aria-current={path.startsWith(href) ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${path.startsWith(href) ? "bg-emerald-400/10 text-emerald-400" : "muted hover:bg-ink"}`}>
              {label}
            </Link>
          ))}
          <AboutUs mobile />
        </div>
        <div className="mt-4 border-t border-edge pt-4">
          {user ? <div className="space-y-1 text-sm">
            <p className="flex items-center gap-3 break-words px-3 pb-2 font-semibold">{profile?.avatar_url && <img src={profile.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />}{profile ? <RankedName name={profile.full_name} rating={profile.rating} /> : "Account"}</p>
            <Link className={accountItemClass} href="/settings" onClick={() => setOpen(false)}>Settings</Link>
            {profile && <Link className={accountItemClass} href={"/profile/" + profile.username} onClick={() => setOpen(false)}>Public profile</Link>}
            <button className={accountItemClass} onClick={() => { setOpen(false); void supabase?.auth.signOut(); }}>Sign out</button>
          </div> : <div className="grid grid-cols-2 gap-3">
            <Link href="/login" className="btn-secondary justify-center" onClick={() => setOpen(false)}>{demo ? "Account setup" : "Log in"}</Link>
            <Link href="/signup" className="btn justify-center" onClick={() => setOpen(false)}>Sign up</Link>
          </div>}
        </div>
      </nav>
      {demo && (
        <div className="flex h-6 items-center justify-center border-t border-edge bg-emerald-400/5 px-5 text-center text-[11px] text-emerald-400">
          <span className="lg:hidden">Browse mode · Sign in to practice</span>
          <span className="hidden lg:inline">BROWSE MODE · Historical exams + original samples · Connect Supabase and sign in to practice</span>
        </div>
      )}
    </header>
    {/* Reserve the toolbar height; menus overlay content instead of moving it. */}
    <div aria-hidden="true" className={demo ? "h-[93px] shrink-0 lg:h-[101px]" : "h-[69px] shrink-0 lg:h-[77px]"} />
    </>
  );
}
