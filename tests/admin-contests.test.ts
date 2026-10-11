import {test} from "node:test";
import assert from "node:assert/strict";
import {adminContestSchema,CONTEST_PRESETS} from "../lib/admin-contests";
import {calculateRatings} from "../lib/rating";
test("contest presets enforce exact unique question counts and enough time",()=>{
 for(const {count,minutes} of CONTEST_PRESETS){
  const record={name:"Contest",description:"",question_count:count,starts_at:"2030-01-01T10:00:00Z",ends_at:new Date(Date.parse("2030-01-01T10:00:00Z")+minutes*60000).toISOString(),published:true,problem_ids:Array.from({length:count},(_,i)=>"problem-"+i)};
  assert.ok(adminContestSchema.safeParse(record).success);
  assert.equal(adminContestSchema.safeParse({...record,problem_ids:Array(count).fill("same")}).success,false);
  assert.equal(adminContestSchema.safeParse({...record,ends_at:"2030-01-01T10:01:00Z"}).success,false);
  assert.equal(adminContestSchema.safeParse({...record,question_count:6}).success,false);
 }
});
test("rating fixture used by the SQL scheduler",()=>{
 const result=calculateRatings([{id:"winner",rating:800,score:2},{id:"loser",rating:800,score:-0.5}]);
 assert.deepEqual(result.map(p=>p.newRating),[897,702]);
});
