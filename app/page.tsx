import HomeEntrance from "@/components/HomeEntrance";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  LineChart,
  Trophy,
  Lightbulb,
} from "lucide-react";
import Statistics from "@/components/Statistics";
import HomeCommunityGallery from "@/components/HomeCommunityGallery";
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
        </div>
        <div className="relative z-10">
          <p data-home-entrance className="mb-5 text-xs tracking-widest text-emerald-400">
            PRACTICE SMARTER. COMPETE STRONGER.
          </p>
          <h1 data-home-entrance className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Master Mathematics.
            <br />
            <span className="text-emerald-400">Climb the Rankings.</span>
          </h1>
          <p data-home-entrance className="mt-6 max-w-xl leading-7 muted">
            Train with AMATYC-style mathematics problems, sharpen your
            problem-solving skills, and compete with students on a competitive
            leaderboard.
          </p>
          <div data-home-entrance className="mt-7 flex flex-wrap gap-3">
            <Link href="/problems" className="btn">
              Start Practicing <ArrowRight size={16} />
            </Link>
            <Link href="/contests" className="btn-secondary">
              Explore Contests
            </Link>
          </div>
          <p data-home-entrance className="mt-5 text-xs muted">
            Browse freely · Learn at your pace · Ratings stay separate from
            practice
          </p>
        </div>
        <div className="relative z-10 min-w-0">
          <HomeCommunityGallery />
        </div>
      </section>
      <Statistics />
      <section className="grid gap-5 md:grid-cols-3">
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
              "A timed exam, flexible navigation, flags, and a complete results review.",
            href: "/contests",
          },
          {
            icon: Lightbulb,
            title: "Understand every answer",
            description:
              "Unlock mathematical reasoning after your attempt, then try again.",
            href: "/problems",
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
              "Your real practice activity powers clear charts and transparent recommendations.",
            href: "/dashboard",
          },
        ].map((f) => (
          <Link
            data-home-entrance
            key={f.title}
            href={f.href}
            className="panel p-6 transition hover:border-emerald-500"
          >
            <f.icon size={22} style={{ color: "var(--gold)" }} />
            <h2 className="my-3 font-semibold">{f.title}</h2>
            <p className="text-sm leading-6 muted">{f.description}</p>
          </Link>
        ))}
      </section>
      <section className="mt-12 border-t border-edge pt-8">
        <h2 data-home-entrance className="text-2xl font-semibold">How it works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            "Choose a topic and solve a problem.",
            "Review the reasoning and build your toolkit.",
            "Test your progress in a timed mock exam.",
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
