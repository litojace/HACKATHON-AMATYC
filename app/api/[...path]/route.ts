import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  libraryQuestions,
  libraryContests,
  questionsForContest,
  demoContest,
  publicProblem,
  sampleProfiles,
} from "@/lib/server/data";
import { database, databaseConfigured } from "@/lib/server/database";
import {
  readSession,
  signSession,
  type DemoSession,
} from "@/lib/server/demo-session";
import {
  practiceSchema,
  saveAnswerSchema,
  profileSchema,
} from "@/lib/validation";
import { scoreAnswer, isCorrectAnswer } from "@/lib/rating";
import type { ExamAttempt } from "@/types/problem";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const limits = new Map<string, { count: number; until: number }>();
function error(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}
function demoAttempt(s: DemoSession): ExamAttempt {
  const finished = !!s.finalized_at;
  const contest = libraryContests.find(c => c.id === (s.contest_id ?? demoContest.id))!;
  const questions = questionsForContest(contest.id);
  return {
    ...s,
    contest_id: contest.id,
    status: finished ? "finalized" : "active",
    score: finished
      ? questions.reduce(
          (sum, p) => sum + scoreAnswer(s.answers[p.id], p.correct_answer, p.accepted_answers, p.grading_policy),
          0,
        )
      : null,
    questions: questions.map(publicProblem),
    server_now: new Date().toISOString(),
    ...(finished
      ? {
          time_spent_seconds: Math.max(
            0,
            Math.min(
              contest.duration_seconds,
              Math.floor(
                (Date.parse(s.finalized_at!) - Date.parse(s.started_at)) / 1000,
              ),
            ),
          ),
          breakdown: questions.map((p) => ({
            ...publicProblem(p),
            selected_answer: s.answers[p.id] ?? null,
            is_correct: isCorrectAnswer(s.answers[p.id], p.correct_answer, p.accepted_answers, p.grading_policy),
            points: scoreAnswer(s.answers[p.id], p.correct_answer, p.accepted_answers, p.grading_policy),
            explanation: {
              correct_answer: p.correct_answer,
              written_solution: p.written_solution,
              calculator_trick: p.calculator_trick,
              accepted_answers: p.accepted_answers, grading_policy: p.grading_policy,
            },
          })),
        }
      : {}),
  };
}
async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    const [resource, id, action] = path;
    const method = req.method;
    if (method !== "GET") {
      const origin = req.headers.get("origin");
      if (
        origin &&
        new URL(origin).host !==
          (req.headers.get("host") ?? new URL(req.url).host)
      )
        return error("Cross-origin requests are not permitted", 403);
      const identity =
        req.headers.get("authorization") ||
        req.cookies.get("demo-id")?.value ||
        req.headers.get("x-forwarded-for") ||
        "guest";
      const key = identity.slice(-100);
      const current = limits.get(key);
      if (!current || current.until < Date.now())
        limits.set(key, { count: 1, until: Date.now() + 60000 });
      else if (++current.count > 60)
        return error("Too many requests. Please wait a minute.", 429);
      if (limits.size > 10000)
        for (const [k, v] of limits) if (v.until < Date.now()) limits.delete(k);
    }
    if (!databaseConfigured) {
      if (resource === "problems" && method === "GET") {
        const p = id ? libraryQuestions.find((p) => p.id === id) : null;
        if (id && !p) return error("Problem not found", 404);
        return NextResponse.json(
          id ? publicProblem(p!) : libraryQuestions.map(publicProblem),
        );
      }
      if (resource === "practice" && method === "POST") {
        const p = libraryQuestions.find((p) => p.id === id);
        if (!p) return error("Problem not found", 404);
        if (action === "start") {
          const now = new Date();
          const session: DemoSession = {
            id: randomUUID(),
            started_at: now.toISOString(),
            deadline: new Date(now.getTime() + 86400000).toISOString(),
            answers: {},
            flags: [id],
            finalized_at: null,
          };
          const res = NextResponse.json({
            request_id: session.id,
            started_at: session.started_at,
          });
          res.cookies.set("amatyc-demo-practice", signSession(session), {
            httpOnly: true,
            sameSite: "strict",
            secure:
              req.nextUrl.protocol === "https:" ||
              req.headers.get("x-forwarded-proto") === "https",
            path: "/",
            maxAge: 86400,
          });
          return res;
        }
        const body = practiceSchema.parse(await req.json());
        const session = readSession(
          req.cookies.get("amatyc-demo-practice")?.value,
        );
        if (
          !session ||
          session.id !== body.request_id ||
          session.flags[0] !== id
        )
          return error("Start or retry this practice problem first.", 409);
        if (!session.finalized_at) {
          session.finalized_at = new Date().toISOString();
          if (body.answer && p.options.length && !p.options.some(o => o.label === body.answer)) return error("Choose a printed answer letter", 422);
          session.answers[id] = body.answer;
        }
        const selected = session.answers[id] ?? null;
        const res = NextResponse.json({
          id: session.id,
          problem_id: p.id,
          selected_answer: selected,
          is_correct: isCorrectAnswer(selected, p.correct_answer, p.accepted_answers, p.grading_policy),
          score: scoreAnswer(selected, p.correct_answer, p.accepted_answers, p.grading_policy),
          time_spent_seconds: Math.max(
            0,
            Math.min(
              86400,
              Math.floor(
                (Date.parse(session.finalized_at) -
                  Date.parse(session.started_at)) /
                  1000,
              ),
            ),
          ),
          created_at: session.finalized_at,
          correct_answer: p.correct_answer,
          written_solution: p.written_solution,
          calculator_trick: p.calculator_trick,
          accepted_answers: p.accepted_answers, grading_policy: p.grading_policy,
        });
        res.cookies.set("amatyc-demo-practice", signSession(session), {
          httpOnly: true,
          sameSite: "strict",
          secure:
            req.nextUrl.protocol === "https:" ||
            req.headers.get("x-forwarded-proto") === "https",
          path: "/",
          maxAge: 86400,
        });
        return res;
      }
      if (resource === "contests" && method === "GET") {
        const contest = libraryContests.find(c => c.id === id);
        if (id && !contest) return error("Contest not found", 404);
        return NextResponse.json(id ? contest : libraryContests);
      }
      if (resource === "attempts") {
        let s = readSession(req.cookies.get("amatyc-demo-exam")?.value);
        if (method === "POST" && action === "start") {
          const contest = libraryContests.find(c => c.id === id);
          if (!contest) return error("Contest not found", 404);
          if (s && !s.finalized_at && (s.contest_id ?? demoContest.id) !== id) return error("Finish your active exam before starting another one.", 409);
          if (!s || s.finalized_at) {
            const now = new Date();
            s = {
              id: randomUUID(),
              contest_id: contest.id,
              started_at: now.toISOString(),
              deadline: new Date(
                now.getTime() + contest.duration_seconds * 1000,
              ).toISOString(),
              answers: {},
              flags: [],
              finalized_at: null,
            };
          }
        } else if (!s || s.id !== id)
          return error(
            "Demo session expired. Start a new exam. A server restart can clear demo sessions.",
            404,
          );
        if (!s) return error("No attempt", 404);
        if (!s.finalized_at && Date.now() >= Date.parse(s.deadline))
          s.finalized_at = s.deadline;
        if (method === "PATCH") {
          if (s.finalized_at)
            return error(
              "This exam is finalized. Answer changes are closed.",
              409,
            );
          const body = saveAnswerSchema.parse(await req.json());
          if (!questionsForContest(s.contest_id ?? demoContest.id).some((p) => p.id === body.problem_id))
            return error("Question not in contest");
          const problem = libraryQuestions.find(p => p.id === body.problem_id)!;
          if (body.answer && problem.options.length && !problem.options.some(o => o.label === body.answer)) return error("Choose a printed answer letter", 422);
          s.answers[body.problem_id] = body.answer;
          s.flags = s.flags.filter((i) => i !== body.problem_id);
          if (body.flagged) s.flags.push(body.problem_id);
        }
        if (method === "POST" && action === "finish" && !s.finalized_at)
          s.finalized_at = new Date().toISOString();
        const response = NextResponse.json(demoAttempt(s));
        response.cookies.set("amatyc-demo-exam", signSession(s), {
          httpOnly: true,
          sameSite: "strict",
          secure:
            req.nextUrl.protocol === "https:" ||
            req.headers.get("x-forwarded-proto") === "https",
          path: "/",
          maxAge: 86400,
        });
        return response;
      }
      if (resource === "stats")
        return NextResponse.json({
          problems: libraryQuestions.length,
          contests: libraryContests.length,
          competitors: 0,
          attempts: 0,
          demo: true,
        });
      if (resource === "leaderboard") return NextResponse.json(sampleProfiles);
      if (resource === "profile") {
        const p = sampleProfiles.find((p) => p.username === id);
        return p ? NextResponse.json(p) : error("Profile not found", 404);
      }
      return error(
        "This feature requires a configured account. Demo activity stays in this browser.",
        401,
      );
    }
    const db = database(req);
    const {
      data: { user },
    } = await db.auth.getUser();
    async function query<T>(
      operation: PromiseLike<{
        data: T | null;
        error: { message: string } | null;
      }>,
    ) {
      const { data, error: e } = await operation;
      if (e) throw new Error(e.message);
      return data;
    }
    if (resource === "problems" && method === "GET")
      return NextResponse.json(
        await query(db.rpc("list_public_problems", { problem_id: id ?? null })),
      );
    if (resource === "contests" && method === "GET") {
      const data = await query(
        db.from("contests").select("*").eq("published", true),
      );
      if (id) {
        const c = data?.find((c) => c.id === id);
        return c ? NextResponse.json(c) : error("Contest not found", 404);
      }
      return NextResponse.json(data);
    }
    if (resource === "stats") {
      const result = await query(db.rpc("public_statistics"));
      return NextResponse.json(result);
    }
    if (resource === "leaderboard" || resource === "profile") {
      const data = await query(
        db.rpc("public_profiles", {
          requested_username: resource === "profile" ? (id ?? null) : null,
        }),
      );
      if (resource === "profile")
        return data?.length
          ? NextResponse.json(data[0])
          : error("Profile not found", 404);
      return NextResponse.json(data);
    }
    if (!user) return error("Please sign in to continue.", 401);
    if (resource === "practice" && method === "GET" && action === "solution")
      return NextResponse.json(
        await query(db.rpc("get_practice_solution", { problem_id: id })),
      );
    if (resource === "practice" && method === "POST") {
      if (action === "start")
        return NextResponse.json(
          await query(db.rpc("start_practice", { problem_id: id })),
        );
      const b = practiceSchema.parse(await req.json());
      return NextResponse.json(
        await query(
          db.rpc("submit_practice", {
            problem_id: id,
            selected: b.answer,
            request_id: b.request_id,
          }),
        ),
      );
    }
    if (resource === "attempts") {
      if (method === "POST" && action === "start")
        return NextResponse.json(
          await query(db.rpc("start_contest", { contest_id: id })),
        );
      if (method === "PATCH") {
        const b = saveAnswerSchema.parse(await req.json());
        return NextResponse.json(
          await query(
            db.rpc("save_contest_answer", {
              attempt_id: id,
              problem_id: b.problem_id,
              selected: b.answer,
              is_flagged: b.flagged,
            }),
          ),
        );
      }
      if (method === "POST" && action === "finish")
        return NextResponse.json(
          await query(db.rpc("finalize_contest", { attempt_id: id })),
        );
      return NextResponse.json(
        await query(db.rpc("get_contest_attempt", { attempt_id: id })),
      );
    }
    if (resource === "activity")
      return NextResponse.json(await query(db.rpc("my_activity")));
    if (resource === "me") {
      if (method === "PATCH") {
        const b = profileSchema.parse(await req.json());
        const result = await query(
          db.from("profiles").update(b).eq("id", user.id).select("*").single(),
        );
        return NextResponse.json(result);
      }
      return NextResponse.json(
        await query(db.from("profiles").select("*").eq("id", user.id).single()),
      );
    }
    if (resource === "bookmarks" && method === "POST") {
      const b = await req.json();
      if (typeof b.saved !== "boolean")
        return error("Invalid bookmark request");
      const result = b.saved
        ? await db
            .from("bookmarks")
            .upsert({ user_id: user.id, problem_id: id })
        : await db
            .from("bookmarks")
            .delete()
            .eq("user_id", user.id)
            .eq("problem_id", id);
      if (result.error) throw new Error(result.error.message);
      return NextResponse.json({ saved: b.saved });
    }
    return error("Operation not found", 404);
  } catch (e) {
    if (e && typeof e === "object" && "issues" in e)
      return error("Invalid request. Check the supplied fields.", 422);
    console.error(
      "API operation failed:",
      e instanceof Error ? e.message : "unknown",
    );
    return error(
      databaseConfigured
        ? "The service could not complete this request. Check permissions, connectivity, and migration setup."
        : "Unable to complete this request.",
      503,
    );
  }
}
export const GET = handle,
  POST = handle,
  PATCH = handle;
