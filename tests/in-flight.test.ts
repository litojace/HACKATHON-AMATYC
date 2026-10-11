import test from "node:test";
import assert from "node:assert/strict";
import { inFlightReads } from "../lib/in-flight";

test("overlapping reads share one request, but later reads fetch fresh data", async () => {
  const read = inFlightReads();
  let calls = 0;
  let finish!: (value: number) => void;
  const request = () => { calls++; return new Promise<number>(resolve => { finish = resolve; }); };
  const first = read("directory:session-a", request);
  const second = read("directory:session-a", request);
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish(42);
  assert.deepEqual(await Promise.all([first, second]), [42, 42]);
  assert.equal(await read("directory:session-a", async () => { calls++; return 43; }), 43);
  assert.equal(calls, 2);
});

test("sessions and paths are isolated and rejected reads can retry", async () => {
  const read = inFlightReads();
  let calls = 0;
  await Promise.all(["directory:session-a", "directory:session-b", "detail:session-a"].map(key => read(key, async () => { calls++; return key; })));
  assert.equal(calls, 3);
  const fail = () => Promise.reject(new Error("Unavailable"));
  await assert.rejects(read("retry", fail), /Unavailable/);
  assert.equal(await read("retry", async () => "fresh"), "fresh");
});
