import { test } from "node:test";
import assert from "node:assert/strict";
import { stackedFractions } from "../lib/math";

test("stack fractions with subscripts and grouped expressions consistently", () => {
  assert.equal(stackedFractions(String.raw`v_K/v_C=225.5/(2\cdot161)=225.5/322`), String.raw`\dfrac{v_K}{v_C}=\dfrac{225.5}{(2\cdot161)}=\dfrac{225.5}{322}`);
  assert.equal(stackedFractions(String.raw`v_K/(v_K+v_C)`), String.raw`\dfrac{v_K}{(v_K+v_C)}`);
  assert.equal(stackedFractions(String.raw`v_{Kim}/v_{Cara}`), String.raw`\dfrac{v_{Kim}}{v_{Cara}}`);
  assert.equal(stackedFractions(String.raw`AB/BD=BD/BC`), String.raw`\dfrac{AB}{BD}=\dfrac{BD}{BC}`);
  assert.equal(stackedFractions(String.raw`x^12/y_10`), String.raw`\dfrac{x^12}{y_10}`);
  assert.equal(stackedFractions(String.raw`(x+1)/(2(x+3))`), String.raw`\dfrac{(x+1)}{(2(x+3))}`);
  assert.equal(stackedFractions(String.raw`\frac{x}{y}+\tfrac{1}{2}`), String.raw`\dfrac{x}{y}+\dfrac{1}{2}`);
  const formatted = stackedFractions(String.raw`v_K/(v_K+v_C)`);
  assert.equal(stackedFractions(formatted), formatted);
});
