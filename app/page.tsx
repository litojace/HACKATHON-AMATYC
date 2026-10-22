import MobileDisclosure from "@/components/MobileDisclosure";
import RankMedal from "@/components/RankMedal";
import MathOrbit from "@/components/MathOrbit";
import HomeEntrance from "@/components/HomeEntrance";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  ChartNoAxesColumnIncreasing,
  CalendarDays,
  ChevronRight,
  Star,
  Trophy,
} from "lucide-react";
import { libraryContests } from "@/lib/server/data";
import Statistics from "@/components/Statistics";
import HomeCommunityGallery from "@/components/HomeCommunityGallery";
import HomeContestNews from "@/components/HomeContestNews";
import { RANK_TIERS } from "@/lib/rating";
import RankedName, { RankText } from "@/components/RankedName";

const ranks = [...RANK_TIERS].reverse();
export default function Home() {
  return (
    <HomeEntrance><main className="homepage mx-auto max-w-7xl px-5">
      <section className="home-banner">
        <div className="math-drift-layer" aria-hidden="true">
          <span>∑</span>
          <span>π</span>
          <span>√x</span>
          <span>∞</span>
          <span>Δ</span>
          <span>x²</span>
          <span>∫</span>
          <span>3.14</span>
          <span>÷</span>
          <span>01</span>
          <span>θ</span>
          <span>∴</span>
          <span>φ</span>
          <span>±</span>
          <span>♡</span>
        </div>
        <div className="home-hero relative z-10">
          <p data-home-entrance className="hero-kicker mb-5">
            THINK BIG. SOLVE SMART. HAVE FUN.
          </p>
          <h1 data-home-entrance className="hero-heading text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            <span className="hidden lg:block">Every problem is</span>
            <span className="hidden text-emerald-400 lg:block">a new adventure.</span>
            <span className="lg:hidden">Every problem<br />is a new<br />adventure.</span>

          </h1>
          <p data-home-entrance className="hero-subtitle mt-4 text-2xl font-bold text-emerald-400 sm:text-3xl">How far can you go?</p>
          <p data-home-entrance className="hero-description muted">
            <span className="lg:hidden">Practice math. Challenge yourself. Grow together.</span><span className="desktop-description">Explore math challenges and sharpen your problem-solving skills. See how you stack up against fellow math enthusiasts.</span>
          </p>
        </div>
        <div data-home-entrance className="hero-illustration" aria-hidden="true">
          <MathOrbit />
        </div>
        <div data-home-entrance className="hero-actions">
          <Link href="/problems" className="btn">Let’s Solve! <ArrowRight size={24} /></Link>
          <Link href="/contests" className="btn-secondary">Saturday Contests <ArrowRight size={21} className="hidden lg:block" /></Link>
        </div>
      </section>
      <Statistics yearRange={`${Math.min(...libraryContests.map(c=>c.year))}–${Math.max(...libraryContests.map(c=>c.year))}`} />
      <h2 className="home-section-label mb-4">Find your next challenge</h2>
      <section className="home-feature-grid grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            icon: BookOpen,
            title: "Practice by topic",
            description:
              "Topics, ratings and bookmarks.",
            href: "/problems",
          },
          {
            icon: Clock3,
            title: "Timed training",
            description:
              "15, 30 or 60 minute sessions.",
            href: "/training",
          },
          {
            icon: Trophy,
            title: "Leaderboard",
            description:
              "Follow competitive progress.",
            href: "/leaderboard",
          },
          {
            icon: ChartNoAxesColumnIncreasing,
            title: "Your dashboard",
            description:
              "See your strengths and next steps.",
            href: "/dashboard#topic-accuracy",
          },
        ].map((f) => (
          <Link
            data-home-entrance
            key={f.title}
            href={f.href}
            className="home-feature panel p-6 transition hover:border-emerald-500"
          >
            <span className="feature-icon" aria-hidden="true"><f.icon size={44} strokeWidth={1.6} /></span>
            <div className="feature-copy"><h2>{f.title}</h2><p className="muted">{f.description}</p></div>
            <span className="feature-arrow" aria-hidden="true"><ArrowRight size={28} className="hidden lg:block" /><ChevronRight size={24} className="lg:hidden" /></span>
          </Link>
        ))}
      </section>
      <section className="home-highlights panel" aria-label="Contests and rating milestones">
        <Link href="/contests" className="contest-highlight"><CalendarDays size={42} strokeWidth={1.6} aria-hidden="true" /><div><h2>Saturday contests</h2><p>Solve together. Aim for your next title.</p><span className="highlight-link">View contests <ArrowRight size={18}/></span></div><ChevronRight className="highlight-chevron" aria-hidden="true" /></Link>
        <div className="home-mobile-contest"><HomeContestNews compact /></div>
        <Link href="#rating-titles-heading" className="rating-highlight"><Star size={34} strokeWidth={1.6} aria-hidden="true" /><div><h2>Ratings &amp; titles</h2><p>See your next milestone</p></div><div className="rank-medals" aria-hidden="true">{(["bronze","silver","gold"] as const).map(metal=><RankMedal key={metal} metal={metal} />)}</div></Link>
      </section>
      <p className="project-note">Independent educational project</p>
      <section className="home-community-news mt-10 grid items-stretch gap-6 lg:grid-cols-2" aria-label="Community and contest news"><HomeCommunityGallery /><div className="home-desktop-news flex min-w-0"><HomeContestNews /></div></section>
      <section className="home-rank-section mt-10" aria-labelledby="rating-titles-heading">
        <MobileDisclosure label="View all ranks" anchorId="rating-titles-heading" className="home-rank-disclosure">
        <div data-home-entrance className="panel overflow-hidden" aria-labelledby="rating-titles-heading">
          <div className="border-b border-edge p-6">
            <h2 id="rating-titles-heading" className="flex items-center gap-2 text-xl font-semibold"><Trophy size={20} className="text-amber-400" aria-hidden="true" /> Ratings &amp; titles</h2>
            <p className="mt-2 text-sm muted">See your next milestone. Sample names show the colors and effects for each rank.</p>
          </div>
          <div className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="region" aria-label="Rating, sample name previews, and titles" tabIndex={0}>
          <table className="w-full min-w-[520px] text-center text-sm [&_td]:align-middle [&_th]:align-middle">
            <caption className="sr-only">Competitive rating ranges, sample name effects, and titles</caption>
            <thead className="border-b border-edge text-xs muted">
              <tr><th scope="col" className="px-4 py-3 sm:px-6">Rating</th><th scope="col" className="px-4 py-3 sm:px-6">Name</th><th scope="col" className="px-4 py-3 sm:px-6">Title</th></tr>
            </thead>
            <tbody>
              {ranks.map((rank, i) => (
                <tr key={rank.title} className="border-b border-edge last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums sm:px-6">{i === 0 ? `Below ${ranks[i + 1].min}` : i === ranks.length - 1 ? `${rank.min}+` : `${rank.min}–${ranks[i + 1].min - 1}`}</td>
                  <td className="px-4 py-3 sm:px-6"><RankedName name="Student" rating={rank.min} featured /></td>
                  <th scope="row" className="px-4 py-3 font-semibold sm:px-6"><RankText rating={rank.min} featured={rank.min >= 2400}>{rank.title}</RankText></th>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        </MobileDisclosure>
      </section>
      <section className="home-how-it-works mt-12 border-t border-edge pt-8">
        <h2 data-home-entrance className="text-2xl font-semibold">How it works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            "Choose a topic and solve a problem.",
            "Review the reasoning and build your toolkit.",
            "Join a Saturday contest, earn a rating, and work toward your next title.",
          ].map((text, i) => (
            <div data-home-entrance key={text} className="flex gap-3">
              <span className="font-mono text-emerald-400">0{i + 1}</span>
              <p className="text-sm muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main></HomeEntrance>
  );
}
