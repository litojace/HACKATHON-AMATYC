"use client";
import Link from "next/link";
import Image from "next/image";
import RankedName from "./RankedName";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown, House, ChartNoAxesColumnIncreasing, Trophy, Users, Settings, FileText, Gauge, Info, UserRound, LogOut, Sun } from "lucide-react";
import { useApp } from "./Providers";
import { supabase } from "@/lib/supabaseClient";
import dailyStyles from "./DailyHighlight.module.css";
const navigation = [
  {href:"/", label:"Home", icon:House},
  {href:"/problems", label:"Problems", icon:FileText},
  {href:"/training", label:"Training", icon:ChartNoAxesColumnIncreasing},
  {href:"/daily", label:"Daily Challenge", icon:Sun},
  {href:"/contests", label:"Contests", icon:Trophy},
  {href:"/leaderboard", label:"Leaderboard", icon:Users},
  {href:"/dashboard", label:"Dashboard", icon:Gauge},
];
const accountItemClass = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left transition-colors duration-200 ease-out hover:bg-ink hover:text-emerald-400 focus-visible:bg-ink focus-visible:text-emerald-400 motion-reduce:transition-none";
export default function Navbar() {
  const path = usePathname(),
    { user, profile, demo } = useApp();
  const [open, setOpen] = useState(false);
  const desktopHeaderHeight = demo ? "lg:h-[101px]" : "lg:h-[77px]";
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
    <aside className="arena-sidebar fixed inset-y-0 left-0 z-40 hidden w-56 flex-col overflow-y-auto border-r border-edge lg:flex" aria-label="Main navigation">
      <Link href="/" className={`flex shrink-0 items-center gap-2 border-b border-edge px-5 font-bold ${desktopHeaderHeight}`}>
        <Image src="/images/arena-logo.svg" width={40} height={40} alt="" />
        <span>AMATYC <span className="text-emerald-400">Arena</span></span>
      </Link>
      <nav className="mt-6 shrink-0 space-y-2">
        {navigation.map(item=><Link key={item.href} href={item.href} className={`arena-nav-link ${item.href==="/daily"?dailyStyles.navLink:""}`} aria-current={(item.href === "/" ? path === "/" : path.startsWith(item.href)) ? "page" : undefined}><item.icon size={26} aria-hidden="true" />{item.label}</Link>)}
      </nav>
      <div className="mx-5 mt-auto shrink-0 border-t border-edge py-5 text-sm">
        <Link href="/about" aria-current={path === "/about" ? "page" : undefined} className={`flex min-h-12 items-center gap-3 hover:text-emerald-400 ${path === "/about" ? "text-emerald-400" : "muted"}`}><Info size={20} aria-hidden="true" className="shrink-0" />About us</Link>
      </div>
    </aside>
    <header className="fixed inset-x-0 top-0 z-30 border-b border-edge bg-ink/95 backdrop-blur lg:left-56">
      <nav className="relative mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-5 lg:h-[76px]">
        <Link href="/" onClick={() => setOpen(false)} className="flex shrink-0 items-center gap-2 font-semibold lg:hidden">
          <Image
            src="/images/arena-logo.svg"
            width={38}
            height={38}
            className="shrink-0"
            alt=""
            aria-hidden="true"
          />
          <span className="text-lg">
            AMATYC <span className="text-emerald-400">Arena</span>
          </span>
        </Link>
        <div className="hidden items-center gap-3 text-sm muted lg:flex"><House size={20} aria-hidden="true" />{navigation.find(item => item.href === "/" ? path === "/" : path.startsWith(item.href))?.label ?? (path === "/about" ? "About us" : "AMATYC Arena")}</div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0 lg:gap-3">
          <div className="flex items-center gap-3">
          {user ? (
            <details ref={accountMenu} className="group relative hidden lg:block">
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
              <div className="motion-menu panel absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-2rem)] space-y-1 p-2 text-sm">
                <Link className={accountItemClass} href="/settings" onClick={closeAccountMenu}>
                  <Settings size={18} aria-hidden="true" className="shrink-0" />Settings
                </Link>
                {profile && (
                  <Link className={accountItemClass} href={"/profile/" + profile.username} onClick={closeAccountMenu}>
                    <UserRound size={18} aria-hidden="true" className="shrink-0" />Public profile
                  </Link>
                )}
                <button className={accountItemClass} onClick={() => { closeAccountMenu(); void supabase?.auth.signOut(); }}>
                  <LogOut size={18} aria-hidden="true" className="shrink-0" />Sign out
                </button>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="btn-secondary whitespace-nowrap !px-3 !py-2">
                Log in
              </Link>
              <Link href="/signup" className="btn !px-3 !py-2 hidden sm:inline-flex">
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
      <nav aria-label="Quick navigation" className="grid grid-cols-4 border-t border-edge lg:hidden">
        {navigation.slice(0,4).map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className={`mobile-tab ${item.href==="/daily"?dailyStyles.tab:""}`} aria-label={item.label} aria-current={(item.href === "/" ? path === "/" : path.startsWith(item.href)) ? "page" : undefined}><item.icon size={24} aria-hidden="true" />{item.href==="/daily"?"Daily":item.label}</Link>)}
      </nav>
      <nav id="mobile-navigation" aria-label="Mobile navigation" hidden={!open}
        className="max-h-[calc(100dvh-10rem)] overflow-y-auto border-t border-edge bg-panel px-4 py-4 lg:!hidden">
        <div className="space-y-1">
          {navigation.map(({href, label}) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              aria-current={(href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${href==="/daily"?dailyStyles.menuLink:""} ${(href === "/" ? path === "/" : path.startsWith(href)) ? "bg-emerald-400/10 text-emerald-400" : "muted hover:bg-ink"}`}>
              {href==="/daily"&&<Sun size={18} aria-hidden="true"/>}{label}
            </Link>
          ))}
        </div>
        <div className="mt-4 border-t border-edge pt-4">
          {user ? <div className="space-y-1 text-sm">
            <p className="flex items-center gap-3 break-words px-3 pb-2 font-semibold">{profile?.avatar_url && <img src={profile.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />}{profile ? <RankedName name={profile.full_name} rating={profile.rating} /> : "Account"}</p>
            <Link className={accountItemClass} href="/settings" onClick={() => setOpen(false)}><Settings size={18} aria-hidden="true" className="shrink-0" />Settings</Link>
            {profile && <Link className={accountItemClass} href={"/profile/" + profile.username} onClick={() => setOpen(false)}><UserRound size={18} aria-hidden="true" className="shrink-0" />Public profile</Link>}
            <button className={accountItemClass} onClick={() => { setOpen(false); void supabase?.auth.signOut(); }}><LogOut size={18} aria-hidden="true" className="shrink-0" />Sign out</button>
          </div> : <div className="grid grid-cols-2 gap-3">
            <Link href="/login" className="btn-secondary justify-center" onClick={() => setOpen(false)}>Log in</Link>
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
    <div aria-hidden="true" className={`${demo ? "h-[156px]" : "h-[132px]"} shrink-0 ${desktopHeaderHeight}`} />
    </>
  );
}
