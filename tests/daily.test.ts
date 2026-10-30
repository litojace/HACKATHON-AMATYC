import {test} from "node:test";
import assert from "node:assert/strict";
import {DAILY_QUESTION_COUNT,DAILY_DURATION_MINUTES,DAILY_RATING_CHANGES,LEGACY_DAILY_RATING_CHANGES,ratingMilestone} from "../lib/daily";
import {dailyAnswerSchema} from "../lib/validation";
import {dashboardActivity} from "../lib/dashboard";

test("daily rewards encourage progress while limiting losses",()=>{
  assert.equal(DAILY_QUESTION_COUNT,10);
  assert.equal(DAILY_DURATION_MINUTES,40);
  assert.deepEqual([...DAILY_RATING_CHANGES],[-8,-6,-5,-3,-2,0,6,15,24,32,40]);
  assert.deepEqual([...LEGACY_DAILY_RATING_CHANGES],[-8,-5,-2,3,12,20]);
  assert(DAILY_RATING_CHANGES.every((reward,i)=>i===0||reward>DAILY_RATING_CHANGES[i-1]));
});
test("daily milestone progress crosses title boundaries and handles the highest title",()=>{
  assert.equal(ratingMilestone(1588).remaining,12);
  assert.equal(ratingMilestone(1588).next?.title,"Expert");
  assert.equal(ratingMilestone(1600).current.title,"Expert");
  assert.equal(ratingMilestone(1600).progress,0);
  assert.equal(ratingMilestone(5000).next,undefined);
  assert.equal(ratingMilestone(5000).progress,100);
});
test("daily answer requests permit clearing a choice but reject invented choices",()=>{
  assert.equal(dailyAnswerSchema.parse({problem_id:"question-1",answer:null}).answer,null);
  assert(!dailyAnswerSchema.safeParse({problem_id:"question-1",answer:"Z"}).success);
  assert.equal("rating" in dailyAnswerSchema.parse({problem_id:"question-1",answer:"A",rating:10000}),false);
});
test("daily rating history counts as study activity without exposing answers",()=>{
  const activity=dashboardActivity({practice:[],contests:[],bookmarks:[],ratings:[{daily_challenge_id:"daily-id",old_rating:1588,new_rating:1600,created_at:"2026-01-01T12:00:00Z"}]});
  assert.deepEqual(activity.daily,[{id:"daily-id",completed_at:"2026-01-01T12:00:00Z",rating_delta:12}]);
  assert.equal(JSON.stringify(activity).includes("answer"),false);
});
