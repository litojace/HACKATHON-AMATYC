import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Calculator,
  LineChart,
  Trophy,
  Lightbulb,
} from "lucide-react";
import Statistics from "@/components/Statistics";
export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-5">
      <section className="grid items-center gap-10 py-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="mb-5 text-xs tracking-widest text-emerald-400">
            PRACTICE SMARTER. COMPETE STRONGER.
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Master Mathematics.
            <br />
            <span className="text-emerald-400">Climb the Rankings.</span>
          </h1>
          <p className="mt-6 max-w-xl leading-7 muted">
            Train with AMATYC-style mathematics problems, sharpen your
            problem-solving skills, and compete with students on a competitive
            leaderboard.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/problems" className="btn">
              Start Practicing <ArrowRight size={16} />
            </Link>
            <Link href="/contests" className="btn-secondary">
              Explore Contests
            </Link>
          </div>
          <p className="mt-5 text-xs muted">
            Browse freely · Learn at your pace · Ratings stay separate from
            practice
          </p>
        </div>
        <div className="panel p-7">
          <div className="flex justify-between text-xs">
            <span className="text-emerald-400">YOUR NEXT BREAKTHROUGH</span>
            <span className="muted">∑</span>
          </div>
          <p className="my-6 text-2xl leading-9">
            A clear question.
            <br />A thoughtful approach.
            <br />
            <span className="muted">A stronger mathematician.</span>
          </p>
          <div className="grid grid-cols-5 gap-2">
            {"ABCDE".split("").map((l) => (
              <span
                key={l}
                className={`rounded-lg border py-3 text-center font-mono ${l === "D" ? "border-emerald-500 text-emerald-400" : "border-edge muted"}`}
              >
                {l}
              </span>
            ))}
          </div>
          <p className="mt-5 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-400">
            Understanding comes before speed.
          </p>
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
            icon: Calculator,
            title: "Use your calculator wisely",
            description:
              "Step through original, carefully scoped scientific calculator guides.",
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
            key={f.title}
            href={f.href}
            className="panel p-6 transition hover:border-emerald-500"
          >
            <f.icon size={22} className="text-emerald-400" />
            <h2 className="my-3 font-semibold">{f.title}</h2>
            <p className="text-sm leading-6 muted">{f.description}</p>
          </Link>
        ))}
      </section>
      <section className="mt-12 border-t border-edge pt-8">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            "Choose a topic and solve a problem.",
            "Review the reasoning and build your toolkit.",
            "Test your progress in a timed mock exam.",
          ].map((text, i) => (
            <div key={text} className="flex gap-3">
              <span className="font-mono text-emerald-400">0{i + 1}</span>
              <p className="text-sm muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
