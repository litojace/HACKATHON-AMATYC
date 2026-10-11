import { test } from "node:test";
import assert from "node:assert/strict";
import { adminProblemSchema, emptyAdminProblem } from "../lib/admin-problems";
const draft = {...emptyAdminProblem(), id:"custom-test", title:"Test", question_latex:"Find $1+1$.", options:[{label:"A",text:"2"},{label:"B",text:"3"}]};
test("admin drafts and reviewed publications validate without exposing invalid keys", () => {
  assert.ok(adminProblemSchema.safeParse(draft).success);
  assert.equal(adminProblemSchema.safeParse({...draft,publication_status:"published"}).success,false);
  assert.ok(adminProblemSchema.safeParse({...draft,publication_status:"published",verification_status:"fully_verified",written_solution:"$1+1=2$."}).success);
  for (const patch of [{correct_answer:"E"},{accepted_answers:["B"]},{id:"demo-test"},{source_image_path:"javascript:alert(1)"},{figure_required:true}]) {
    assert.equal(adminProblemSchema.safeParse({...draft,...patch}).success,false);
  }
});
test("short answers must be usable by the submission grader", () => {
  const short = {...draft,answer_format:"short_answer",options:[],correct_answer:"1/2",accepted_answers:["1/2","0.5"]};
  assert.ok(adminProblemSchema.safeParse(short).success);
  assert.equal(adminProblemSchema.safeParse({...short,correct_answer:"√2",accepted_answers:["√2"]}).success,false);
});
