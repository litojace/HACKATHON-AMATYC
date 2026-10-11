import { test } from "node:test";
import assert from "node:assert/strict";
import { stackedFractions } from "../lib/math";
import { mathSegments } from "../lib/math-text";
import { correctedWrittenSolution } from "../lib/server/solution-format";
import katex from "katex";

test("stack fractions with subscripts and grouped expressions consistently", () => {
  assert.equal(stackedFractions(String.raw`v_{K}/v_{C}=225.5/(2\cdot161)=225.5/322`), String.raw`\dfrac{v_{K}}{v_{C}}=\dfrac{225.5}{(2\cdot161)}=\dfrac{225.5}{322}`);
  assert.equal(stackedFractions(String.raw`v_{K}/(v_{K}+v_{C})`), String.raw`\dfrac{v_{K}}{(v_{K}+v_{C})}`);
  assert.equal(stackedFractions(String.raw`v_{Kim}/v_{Cara}`), String.raw`\dfrac{v_{Kim}}{v_{Cara}}`);
  assert.equal(stackedFractions(String.raw`AB/BD=BD/BC`), String.raw`\dfrac{AB}{BD}=\dfrac{BD}{BC}`);
  assert.equal(stackedFractions(String.raw`x^12/y_10`), String.raw`\dfrac{x^{12}}{y_{10}}`);
  assert.equal(stackedFractions(String.raw`(x+1)/(2(x+3))`), String.raw`\dfrac{(x+1)}{(2(x+3))}`);
  assert.equal(stackedFractions(String.raw`\frac{x}{y}+\tfrac{1}{2}`), String.raw`\dfrac{x}{y}+\dfrac{1}{2}`);
  const formatted = stackedFractions(String.raw`v_{K}/(v_{K}+v_{C})`);
  assert.equal(stackedFractions(formatted), formatted);
});

test("nested fractions, products and function denominators preserve their grouping", () => {
  const examples: [string,string][] = [
    [String.raw`(1+\sqrt3/2)/(1-1/2)`,String.raw`\dfrac{(1+\dfrac{\sqrt{3}}{2})}{(1-\dfrac{1}{2})}`],
    [String.raw`\pi r^2/4`,String.raw`\dfrac{\pi r^{2}}{4}`],
    [String.raw`\sin t/\cos t`,String.raw`\dfrac{\sin t}{\cos t}`],
    [String.raw`4\sin(a)/\sin(2a)`,String.raw`\dfrac{4\sin(a)}{\sin(2a)}`],
    [String.raw`\sqrt{(289-a^2)/2}`,String.raw`\sqrt{\dfrac{(289-a^{2})}{2}}`],
    [String.raw`\binom{11}{j}\binom{39}{16-j}/\binom{50}{16}`,String.raw`\dfrac{\binom{11}{j}\binom{39}{16-j}}{\binom{50}{16}}`],
    [String.raw`a/b/c`,String.raw`\dfrac{\dfrac{a}{b}}{c}`],
    [String.raw`25^{3/2}`,String.raw`25^{\frac{3}{2}}`],
    [String.raw`\sum_{j=1}^n j/(j+1)`,String.raw`\sum_{j=1}^{n}\dfrac{j}{(j+1)}`],
    [String.raw`v_K/v_C`,String.raw`\dfrac{v_{K}}{v_{C}}`],
    [String.raw`\text{ft/min}`,String.raw`\text{ft/min}`],
  ];
  for (const [input,expected] of examples) {
    const result = stackedFractions(input);
    assert.equal(result,expected);
    assert.equal(stackedFractions(result),result);
    assert.doesNotThrow(()=>katex.renderToString(result,{throwOnError:true}));
  }
});

test("currency stays prose beside inline and display math", () => {
  assert.deepEqual(mathSegments(String.raw`Worth \$1.05, so $3/1.05=20/7$ ADA. Total \$124,000.`), [
    {kind:"text",value:"Worth $1.05, so "},
    {kind:"inline",value:"3/1.05=20/7"},
    {kind:"text",value:" ADA. Total $124,000."},
  ]);
  assert.deepEqual(mathSegments(String.raw`$$\frac12$$ then $2^10$ and \$71,574.`), [
    {kind:"display",value:String.raw`\frac12`},
    {kind:"text",value:" then "},
    {kind:"inline",value:"2^10"},
    {kind:"text",value:" and $71,574."},
  ]);
  assert.equal(mathSegments("Worth $1.05, so one dollar buys 3/1.05 ADA. Two BTC are worth $124,000.").every(s=>s.kind === "text"),true);
  assert.deepEqual(mathSegments(String.raw`$\text{price \$5}$`), [{kind:"inline",value:String.raw`\text{price \$5}`}]);
  const units = String.raw`25\cdot0.10=\boxed{2.50\text{ dollars}}`;
  assert.deepEqual(mathSegments(`The saving is $${units}$.`), [
    {kind:"text",value:"The saving is "},
    {kind:"inline",value:units},
    {kind:"text",value:"."},
  ]);
});

test("known Supabase explanations receive format fixes while admin edits are retained", () => {
  const original = "1. Convert both exchange rates through dollars.\n\n2. Three ADA are worth $1.05, so one dollar buys 3/1.05 = 20/7 ADA. Two BTC are worth $124,000.\n\n3. Therefore they buy 124000(20/7) = 2,480,000/7 = 354,285 5/7 ADA.\n\n4. Rounding down gives 354,285 (E).";
  const updated = correctedWrittenSolution("amatyc-2024-fall-q01",original);
  assert.notEqual(updated,original);
  assert.ok(updated.includes(String.raw`\$1.05`));
  assert.ok(updated.includes(String.raw`\dfrac{2{,}480{,}000}{7}`));
  assert.equal(correctedWrittenSolution("amatyc-2024-fall-q01",original+"\nAn admin's custom note."),original+"\nAn admin's custom note.");
  assert.equal(correctedWrittenSolution("custom-question",original),original);
});

test("both published versions of the speed explanation receive real subscripts", () => {
  const previous = "1. Alice and Bo start 1000 ft apart along either direction of the track.\n\n2. Walking toward each other gives $v_A+v_B=1000/2=500$.\n\n3. Walking in the same direction, Bo catches Alice in 10 minutes, so $v_B-v_A=1000/10=100$.\n\n4. Solving gives v_A=200 ft/min (D).";
  const original = previous.replace("$v_A+v_B=1000/2=500$", "v_A+v_B=1000/2=500").replace("$v_B-v_A=1000/10=100$", "v_B−v_A=1000/10=100");
  for (const text of [previous,original]) {
    const fixed = correctedWrittenSolution("amatyc-2021-fall-q01",text);
    assert.ok(fixed.includes("Solving gives $v_A=200$ feet per minute"));
    assert.ok(mathSegments(fixed).filter(s=>s.kind === "text").every(s=>!/[A-Za-z]_/.test(s.value)));
  }
});

test("older solution prose renders fractions and chained inequalities as math", async () => {
  const { solutionMathText } = await import('../lib/math-text');
  const input = 'Bound -1≤x≤1, maximum 17/16, equality t=1/4. Date 10/11/2026. https://example.com/17/16. Worth \\$5.';
  const formatted = solutionMathText(input);
  const segments = mathSegments(formatted);
  assert.ok(segments.some(s => s.kind === 'inline' && s.value === String.raw`-1\le x\le 1`));
  assert.ok(segments.some(s => s.kind === 'inline' && stackedFractions(s.value) === String.raw`\dfrac{17}{16}`));
  assert.ok(segments.filter(s=>s.kind==='text').map(s=>s.value).join('').includes('10/11/2026'));
  assert.ok(formatted.includes('https://example.com/17/16'));
  assert.ok(formatted.includes(String.raw`\$5`));
  assert.equal(solutionMathText(formatted),formatted);
});
