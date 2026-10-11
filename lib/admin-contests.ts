import { z } from "zod";
import type { Contest } from "@/types/problem";
export const CONTEST_PRESETS = [{count:5,minutes:15},{count:10,minutes:30},{count:20,minutes:60}] as const;
export const adminContestSchema = z.object({
  name:z.string().trim().min(1).max(160),description:z.string().trim().max(5000),
  question_count:z.union([z.literal(5),z.literal(10),z.literal(20)]),
  starts_at:z.iso.datetime({offset:true}), ends_at:z.iso.datetime({offset:true}),
  published:z.boolean(),problem_ids:z.array(z.string().regex(/^[a-z0-9-]+$/).max(100)).max(20),
}).refine(p => p.problem_ids.length===p.question_count && new Set(p.problem_ids).size===p.question_count,"Choose exactly the required number of different problems")
  .refine(p => Date.parse(p.ends_at)-Date.parse(p.starts_at)>=p.question_count*180000,"The event window must allow the full contest duration");
export type AdminContestInput = z.infer<typeof adminContestSchema>;
export type AdminContest = Contest & {published:boolean;ratings_processed_at:string|null;participants?:number};
export interface ContestMonitor {
  contest:AdminContest;server_now:string;
  participants:{id:string;user_id:string;username:string;full_name:string;status:"active"|"finalized";started_at:string;deadline:string;finalized_at:string|null;answered:number;flagged:number;elapsed_seconds:number;score:number|null;old_rating:number|null;new_rating:number|null}[];
}
