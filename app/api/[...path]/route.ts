import { NextRequest, NextResponse } from "next/server";
import {
  libraryQuestions,
  libraryContests,
  publicProblem,
  sampleProfiles,
} from "@/lib/server/data";
import { database, databaseConfigured } from "@/lib/server/database";
import { carouselSchema, defaultCarouselPhotos } from "@/lib/carousel";
import { adminProblemSchema } from "@/lib/admin-problems";
import { adminContestSchema } from "@/lib/admin-contests";
import {
  practiceSchema,
  saveAnswerSchema,
  profileSchema,
} from "@/lib/validation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const limits = new Map<string, { count: number; until: number }>();
function error(message: string, status = 400) {
  return NextResponse.json({ error: { message } }, { status });
}
function addLocalWrittenSolution(payload: unknown, problemId: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const result = payload as Record<string, unknown>;
  if (typeof result.written_solution === "string" && result.written_solution.trim())
    return payload;
  const written_solution = libraryQuestions.find((problem) => problem.id === problemId)?.written_solution;
  return written_solution ? { ...result, written_solution } : payload;
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
      if (resource === "carousel" && method === "GET") return NextResponse.json(defaultCarouselPhotos);
      if (resource === "practice" || resource === "attempts") {
        return error("Please sign in to continue. Supabase must be configured to enable practice and contests.", 401);
      }
      if (resource === "problems" && method === "GET") {
        const p = id ? libraryQuestions.find((p) => p.id === id) : null;
        if (id && !p) return error("Problem not found", 404);
        return NextResponse.json(
          id ? publicProblem(p!) : libraryQuestions.map(publicProblem),
        );
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
    if (resource === "carousel" && method === "GET") {
      const row = await query<{ photos: unknown }>(db.from("site_carousel").select("photos").eq("id", true).single());
      return NextResponse.json(carouselSchema.parse(row?.photos));
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
    if (resource === "admin" && id === "users") {
      if (!await query(db.rpc("is_site_admin"))) return error("Only administrators can manage user ratings.", 403);
      if (method === "GET") return NextResponse.json(await query(db.rpc("admin_user_records")), {headers:{"Cache-Control":"private, no-store"}});
      if (method === "PATCH" && action) {
        const body = await req.json();
        if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 10000 || typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 500) return error("Enter a rating from 1 to 10000 and a reason of 1–500 characters.");
        return NextResponse.json(await query(db.rpc("admin_set_user_rating", {target_id: action, new_rating: body.rating, adjustment_reason: body.reason})), {headers:{"Cache-Control":"private, no-store"}});
      }
      return error("Method not allowed",405);
    }
    if (resource === "admin" && id === "contests") {
      if (!await query(db.rpc("is_site_admin"))) return error("Only administrators can manage contests.",403);
      if (method === "GET") return NextResponse.json(await query(db.rpc("admin_contest_records",{cid:action ?? null})),{headers:{"Cache-Control":"private, no-store"}});
      if (method === "POST") {
        const {data,error:contestError} = action
          ? await db.rpc("admin_publish_contest",{cid:action})
          : await db.rpc("admin_create_contest",{record:adminContestSchema.parse(await req.json())});
        if (contestError) {
          if (/^(Choose |Every contest|Selected problem|The start time|Contest not found|Invalid contest|Contest question)/.test(contestError.message)) return error(contestError.message,422);
          throw new Error(contestError.message);
        }
        return NextResponse.json(data,{status:action?200:201,headers:{"Cache-Control":"private, no-store"}});
      }
      return error("Method not allowed",405);
    }
    if (resource === "admin" && id === "problems") {
      if (!await query(db.rpc("is_site_admin"))) return error("Only administrators can manage problems.", 403);
      if (method === "DELETE" && action) {
        const {data,error:deleteError} = await db.rpc("admin_delete_problem", {pid:action});
        if (deleteError) {
          if (deleteError.message === "Problem not found") return error(deleteError.message,404);
          if (deleteError.message.startsWith("This problem has attempts")) return error(deleteError.message,409);
          throw new Error(deleteError.message);
        }
        return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
      }
      if (method === "GET") {
        const data = await query(db.rpc("admin_problem_records", {pid:action ?? null}));
        return NextResponse.json(data, {headers:{"Cache-Control":"private, no-store"}});
      }
      if ((method === "POST" && !action) || (method === "PUT" && action)) {
        const record = adminProblemSchema.parse(await req.json());
        if (action && record.id !== action) return error("Problem ID cannot be changed.", 422);
        const {data,error:saveError} = await db.rpc("admin_save_problem", {problem_record:record,create_new:method === "POST"});
        if (saveError) {
          if (/^(This problem has attempts|Problem ID already exists|Problem not found|Publication requires)/.test(saveError.message)) return error(saveError.message,409);
          throw new Error(saveError.message);
        }
        return NextResponse.json(data, {status:method === "POST" ? 201 : 200,headers:{"Cache-Control":"private, no-store"}});
      }
      return error("Method not allowed",405);
    }
    if (resource === "admin" && id === "carousel") {
      const isAdmin = await query(db.rpc("is_site_admin"));
      if (!isAdmin) return error("Only administrators can edit the carousel.", 403);
      if (method === "GET") {
        const row = await query<{ photos: unknown }>(db.from("site_carousel").select("photos").eq("id", true).single());
        return NextResponse.json(carouselSchema.parse(row?.photos));
      }
      if (method === "PUT") {
        const photos = carouselSchema.parse(await req.json());
        await query(db.from("site_carousel").update({ photos, updated_at: new Date().toISOString() }).eq("id", true).select("id").single());
        return NextResponse.json(photos);
      }
      return error("Method not allowed", 405);
    }
    if (resource === "practice" && method === "GET" && action === "solution")
      return NextResponse.json(
        addLocalWrittenSolution(
          await query(db.rpc("get_practice_solution", { problem_id: id })),
          id,
        ),
      );
    if (resource === "practice" && method === "POST") {
      if (action === "start")
        return NextResponse.json(
          await query(db.rpc("start_practice", { problem_id: id })),
        );
      const b = practiceSchema.parse(await req.json());
      return NextResponse.json(
        addLocalWrittenSolution(await query(
          db.rpc("submit_practice", {
            problem_id: id,
            selected: b.answer,
            request_id: b.request_id,
          }),
        ), id),
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
      const attempt = await query<{
        breakdown?: { id: string; explanation?: unknown }[] | null;
      }>(db.rpc("get_contest_attempt", { attempt_id: id }));
      if (attempt?.breakdown)
        for (const item of attempt.breakdown)
          item.explanation = addLocalWrittenSolution(item.explanation, item.id);
      return NextResponse.json(attempt);
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
  PUT = handle,
  PATCH = handle,
  DELETE = handle;
