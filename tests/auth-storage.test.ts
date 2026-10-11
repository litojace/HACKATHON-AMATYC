import test from "node:test";
import assert from "node:assert/strict";
import { createAuthStorage } from "../lib/auth-storage";
function area() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
const key = "sb-project-auth-token";
test("unchecked login survives reload but not a new browser session", () => {
  const local = area(), session = area();
  const auth = createAuthStorage(key, () => ({local,session}));
  auth.setRememberMe(false);
  auth.storage.setItem(key,"token");
  assert.equal(local.getItem(key),null);
  assert.equal(createAuthStorage(key,()=>({local,session})).storage.getItem(key),"token");
  assert.equal(createAuthStorage(key,()=>({local,session:area()})).storage.getItem(key),null);
});
test("remembered login survives a new browser session", () => {
  const local=area(), session=area();
  const auth=createAuthStorage(key,()=>({local,session}));
  auth.setRememberMe(true);auth.storage.setItem(key,"token");
  assert.equal(session.getItem(key),null);
  assert.equal(createAuthStorage(key,()=>({local,session:area()})).storage.getItem(key),"token");
});
test("changing persistence migrates existing tokens and OAuth verifier without leaving copies", () => {
  const local=area(),session=area();local.setItem(key,"legacy");local.setItem(key+"-code-verifier","verifier");
  const auth=createAuthStorage(key,()=>({local,session}));
  assert.equal(auth.storage.getItem(key),"legacy");
  auth.setRememberMe(false);
  assert.equal(local.getItem(key),null);assert.equal(local.getItem(key+"-code-verifier"),null);
  assert.equal(session.getItem(key),"legacy");assert.equal(session.getItem(key+"-code-verifier"),"verifier");
  auth.setRememberMe(true);
  assert.equal(session.getItem(key),null);assert.equal(local.getItem(key),"legacy");
});
test("sign out removes credentials from both storage areas", () => {
  const local=area(),session=area();const auth=createAuthStorage(key,()=>({local,session}));
  local.setItem(key,"old");session.setItem(key,"new");auth.storage.removeItem(key);
  assert.equal(local.getItem(key),null);assert.equal(session.getItem(key),null);
});
test("changing modes never restores stale credentials from the inactive storage", () => {
  const local=area(),session=area();
  session.setItem(key+"-remember","session");local.setItem(key,"stale");
  const auth=createAuthStorage(key,()=>({local,session}));
  assert.equal(auth.storage.getItem(key),null);
  auth.setRememberMe(true);
  assert.equal(auth.storage.getItem(key),null);
});
test("server-side rendering needs no window or browser storage", () => {
  const auth=createAuthStorage(key,()=>null);
  assert.equal(auth.storage.getItem(key),null);
  assert.throws(()=>auth.setRememberMe(true),/Browser storage is unavailable/);
});
