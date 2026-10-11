import HomeEntrance from "@/components/HomeEntrance";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  LineChart,
  Trophy,
} from "lucide-react";
import Statistics from "@/components/Statistics";
import HomeCommunityGallery from "@/components/HomeCommunityGallery";
import { INITIAL_RATING, RANK_TIERS } from "@/lib/rating";
import RankedName, { RankText } from "@/components/RankedName";

const ranks = [...RANK_TIERS].reverse();
export default function Home() {
  return (
    <HomeEntrance><main className="mx-auto max-w-7xl px-5">
      <section className="relative isolate grid items-center gap-10 py-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-12 lg:py-14">
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
          <p data-home-entrance className="mb-5 text-xs tracking-widest text-emerald-400">
            THINK BIG. SOLVE SMART. HAVE FUN.
          </p>
          <h1 data-home-entrance className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Every Problem Is a New Adventure.
            <br />
            <span className="text-emerald-400">How Far Can You Go?</span>
          </h1>
          <p data-home-entrance className="mt-6 max-w-xl leading-7 muted">
            Explore fun math challenges, sharpen your problem-solving skills,
            and see how you stack up against fellow math enthusiasts.
          </p>
          <div data-home-entrance className="mt-7 flex flex-wrap gap-3">
            <Link href="/problems" className="btn">
              Let’s Solve! <ArrowRight size={16} />
            </Link>
            <Link href="/contests" className="btn-secondary">
              Saturday Contests
            </Link>
          </div>
        </div>
        <div data-home-entrance className="relative z-10 min-w-0">
          <HomeCommunityGallery />
        </div>
      </section>
      <Statistics />
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: BookOpen,
            title: "Practice by topic",
            description:
              "Find the right challenge with topics, ratings, bookmarks, and solved status.",
            href: "/problems",
          },
          {
            icon: Clock3,
            title: "Train under pressure",
            description:
              "Choose a 15, 30, or 60 minute session with questions matched to your rating.",
            href: "/training",
          },
          {
            icon: Trophy,
            title: "Follow competitive progress",
            description:
              "Public profiles and auditable rating history. Rating engine is in beta.",
            href: "/leaderboard",
          },
          {
            icon: LineChart,
            title: "See where to improve",
            description:
              "Open your topic accuracy chart to spot strengths and choose what to practice next.",
            href: "/dashboard#topic-accuracy",
          },
        ].map((f) => (
          <Link
            data-home-entrance
            key={f.title}
            href={f.href}
            className="home-feature panel p-6 transition hover:border-emerald-500"
          >
            <f.icon size={22} style={{ color: "var(--gold)" }} />
            <h2 className="my-3 font-semibold">{f.title}</h2>
            <p className="text-sm leading-6 muted">{f.description}</p>
          </Link>
        ))}
      </section>
      <section className="mt-12 grid items-stretch gap-6 lg:grid-cols-2" aria-labelledby="saturday-contests-title">
        <div data-home-entrance className="panel flex flex-col items-start border-emerald-400/30 p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            <CalendarDays size={16} aria-hidden="true" /> Every Saturday
          </p>
          <h2 id="saturday-contests-title" className="mt-4 text-2xl font-semibold sm:text-3xl">Solve together. Aim for your next title.</h2>
          <p className="mt-4 leading-7 muted">Join our Saturday contests to tackle math problems, challenge yourself alongside other students, and earn a competitive rating. Every contest is a chance to learn and improve.</p>
          <p className="mt-4 text-sm leading-6 muted">Start at {INITIAL_RATING}. Your performance in rated contests shapes your rating and title. Practice during the week, then put your skills to the test on Saturday.</p>
          <div className="mt-auto pt-6"><Link href="/contests" className="btn">Join a Saturday contest <ArrowRight size={16} /></Link></div>
        </div>
        <div data-home-entrance className="panel overflow-hidden" aria-labelledby="rating-titles-heading">
          <div className="border-b border-edge p-6">
            <h2 id="rating-titles-heading" className="flex items-center gap-2 text-xl font-semibold"><Trophy size={20} className="text-amber-400" aria-hidden="true" /> Ratings &amp; titles</h2>
            <p className="mt-2 text-sm muted">See your next milestone. Sample names show the colors and effects for each rank.</p>
          </div>
          <div className="overflow-x-auto" role="region" aria-label="Rating, sample name previews, and titles" tabIndex={0}>
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">Competitive rating ranges, sample name effects, and titles</caption>
            <thead className="border-b border-edge text-xs muted">
              <tr><th scope="col" className="px-4 py-3 sm:px-6">Rating</th><th scope="col" className="px-4 py-3 sm:px-6">Name</th><th scope="col" className="px-4 py-3 sm:px-6">Title</th></tr>
            </thead>
            <tbody>
              {ranks.map((rank, i) => (
                <tr key={rank.title} className="border-b border-edge last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums sm:px-6">{i === 0 ? `Below ${ranks[i + 1].min}` : i === ranks.length - 1 ? `${rank.min}+` : `${rank.min}–${ranks[i + 1].min - 1}`}</td>
                  <td className="px-4 py-3 sm:px-6"><RankedName name="MathStudent" rating={rank.min} featured /></td>
                  <th scope="row" className="px-4 py-3 font-semibold sm:px-6"><RankText rating={rank.min}>{rank.title}</RankText></th>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>
      <section className="mt-12 border-t border-edge pt-8">
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
