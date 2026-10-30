import { NextRequest, NextResponse } from "next/server";
import {
  libraryQuestions,
  libraryContests,
  publicProblem,
  problemSummary,
  sampleProfiles,
} from "@/lib/server/data";
import { database, databaseConfigured } from "@/lib/server/database";
import { correctedWrittenSolution } from "@/lib/server/solution-format";
import { carouselSchema, defaultCarouselPhotos } from "@/lib/carousel";
import { adminProblemSchema } from "@/lib/admin-problems";
import { adminContestSchema } from "@/lib/admin-contests";
import {
  practiceSchema,
  saveAnswerSchema,
  profileSchema,
  dailyAnswerSchema,
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
    return { ...result, written_solution: correctedWrittenSolution(problemId, result.written_solution) };
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
      if (resource === "practice" || resource === "attempts" || resource === "daily") {
        return error("Please sign in to continue. Supabase must be configured to enable practice and contests.", 401);
      }
      if (resource === "problem-directory" && !id && method === "GET")
        return NextResponse.json(libraryQuestions.map((p) => problemSummary(publicProblem(p))));
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
        if (p && action === "dashboard") return NextResponse.json({ practice: [], contests: [] });
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
        error: { message: string; code?: string } | null;
      }>,
    ) {
      const { data, error: e } = await operation;
      if (e) throw Object.assign(new Error(e.message),{code:e.code});
      return data;
    }
    if (resource === "carousel" && method === "GET") {
      const row = await query<{ photos: unknown }>(db.from("site_carousel").select("photos").eq("id", true).single());
      return NextResponse.json(carouselSchema.parse(row?.photos));
    }
    if (resource === "problem-directory" && !id && method === "GET")
      return NextResponse.json(await query(db.rpc("list_public_problem_directory")));
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
      if (resource === "profile" && action === "dashboard" && method === "GET") {
        const dashboard = await query(db.rpc("public_dashboard", { requested_username: id }));
        return dashboard ? NextResponse.json(dashboard, { headers: { "Cache-Control": "private, no-store" } }) : error("Profile not found", 404);
      }
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
    if (resource === "daily") {
      if (id && id!=="start" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return error("Invalid challenge ID",422);
      let operation;
      if (method==="GET" && !id) operation=db.rpc("daily_challenge_status");
      else if (method==="POST" && id==="start" && !action) operation=db.rpc("start_timed_daily_challenge");
      else if (method==="PATCH" && id && id!=="start" && !action) {
        const body=dailyAnswerSchema.parse(await req.json());
        operation=db.rpc("save_daily_answer",{challenge_id:id,problem_id:body.problem_id,selected:body.answer});
      } else if (method==="POST" && id && id!=="start" && action==="finish") operation=db.rpc("finish_daily_challenge",{challenge_id:id});
      else return error("Operation not found",404);
      const {data,error:dailyError}=await operation;
      if(dailyError) {
        if(dailyError.code==="PGRST202" || dailyError.code==="42P01") return error("Daily Challenge is being set up. Please try again soon.",503);
        if(["42501","P0002","55000","22023"].includes(dailyError.code)) return error(dailyError.message,dailyError.code==="42501"?403:dailyError.code==="P0002"?404:dailyError.code==="22023"?422:409);
        throw new Error(dailyError.message);
      }
      if(data?.challenge?.breakdown) for(const item of data.challenge.breakdown) item.explanation=addLocalWrittenSolution(item.explanation,item.problem_id);
      return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
    }
    if (resource === "reports" && method === "POST" && id) {
      const body = await req.json();
      if (!["incorrect_answer","unclear_wording","missing_figure","other"].includes(body.category) || typeof body.details !== "string" || !body.details.trim() || body.details.length > 2000) return error("Choose a category and enter details (up to 2000 characters).");
      return NextResponse.json({id:await query(db.rpc("report_problem",{pid:id,report_category:body.category,report_details:body.details}))});
    }
    if (resource === "admin" && id === "reports") {
      if (!await query(db.rpc("is_site_admin"))) return error("Only administrators can review reports.",403);
      if (method === "GET") return NextResponse.json(await query(db.rpc("admin_problem_reports")),{headers:{"Cache-Control":"private, no-store"}});
      if (method === "PATCH" && action) {
        const body=await req.json();
        if (!["open","resolved","dismissed"].includes(body.status) || typeof body.note !== "string" || body.note.length>2000) return error("Invalid review.");
        await query(db.rpc("admin_review_problem_report",{report_id:action,next_status:body.status,review_note:body.note}));
        return NextResponse.json({ok:true});
      }
      return error("Method not allowed",405);
    }
    if (resource === "admin" && (id === "reset" || id === "users" && method === "DELETE")) {
      if (!user || !await query(db.rpc("is_site_admin"))) return error("Administrator access required",403);
      if (id === "reset" && method !== "POST") return error("Method not allowed",405);
      if (id === "users" && (!action || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(action))) return error("Invalid user ID",422);
      const body=await req.json();
      if (!body || typeof body.confirmation !== "string" || body.confirmation.length>200 || typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length>500) return error("Enter the confirmation and a reason of 1–500 characters.",422);
      if(id==="reset" && !["progress","community"].includes(body.scope)) return error("Invalid reset scope",422);
      const operation=id==="reset" ? db.rpc("admin_reset_data",{reset_scope:body.scope,confirmation:body.confirmation,operation_reason:body.reason}) : db.rpc("admin_delete_user",{target_id:action,confirmation:body.confirmation,operation_reason:body.reason});
      const {data,error:operationError}=await operation;
      if(operationError) return error(operationError.message,operationError.code==="42501"?403:operationError.code==="P0002"?404:operationError.code==="55000"?409:operationError.code==="22023"?422:503);
      return NextResponse.json(data,{headers:{"Cache-Control":"private, no-store"}});
    }
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
      if (method === "GET" && action === "status") {
        const attempt = await query(db.from("contest_attempts")
          .select("id").eq("user_id", user.id).eq("contest_id", id)
          .eq("status", "active").maybeSingle());
        return NextResponse.json({ resumable: !!attempt }, {
          headers: { "Cache-Control": "private, no-store" },
        });
      }
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
            // Bookmark saves are idempotent inserts; this table deliberately
            // grants INSERT/DELETE, not UPDATE, to authenticated users.
            .upsert({ user_id: user.id, problem_id: id }, {
              onConflict: "user_id,problem_id",
              ignoreDuplicates: true,
            })
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
    if(e instanceof Error && "code" in e && e.code==="55000" && e.message.startsWith("Finish your daily challenge")) return error(e.message,409);
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
