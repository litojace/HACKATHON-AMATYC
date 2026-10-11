import { test } from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath } from "../lib/auth";

test("login returns to local practice and contest pages only", () => {
  assert.equal(safeReturnPath("/problems/demo-01"), "/problems/demo-01");
  assert.equal(safeReturnPath("/contests/demo-challenge/take?attempt=123"), "/contests/demo-challenge/take?attempt=123");
  for (const value of [undefined, null, "https://evil.test", "//evil.test", "/\\evil.test", "/\n/evil.test"]) {
    assert.equal(safeReturnPath(value), "/dashboard");
  }
});
