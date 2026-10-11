/** Typeset slash fractions recursively, retaining grouped expressions and powers.
 * Only math segments are passed here; prose, currency and URLs stay untouched.
 */
export function stackedFractions(math: string): string {
  type Token = { value: string; kind: "atom" | "boundary" | "multiply" | "slash" | "space" };
  let position = 0;
  const skipSpace = () => { while (/\s/.test(math[position] ?? "") && position < math.length) position++; };
  function group(open: string, close: string): string {
    const start = ++position;
    let depth = 1;
    while (position < math.length && depth) {
      if (math[position] === open) depth++;
      if (math[position] === close) depth--;
      position++;
    }
    // Leave malformed input to KaTeX's visible error handling.
    return depth ? open + math.slice(start) : open + stackedFractions(math.slice(start, position - 1)) + close;
  }
  function argument(): string {
    skipSpace();
    if (math[position] === "{") return group("{", "}").slice(1, -1);
    if (math[position] === "\\") return atom();
    return math[position++] ?? "";
  }
  function atom(): string {
    let value: string;
    const char = math[position];
    if (char === "|" && math.indexOf("|", position + 1) !== -1) {
      const end = math.indexOf("|", position + 1);
      value = "|" + stackedFractions(math.slice(position + 1, end)) + "|";
      position = end + 1;
    } else if (char === "(" || char === "{" || char === "[") {
      value = group(char, char === "(" ? ")" : char === "{" ? "}" : "]");
    } else if (char === "\\") {
      const command = math.slice(position).match(/^\\(?:[A-Za-z]+|.)/)?.[0] ?? "\\";
      position += command.length;
      if (/^\\(?:dfrac|tfrac|frac)$/.test(command)) {
        const numerator = argument(), denominator = argument();
        value = `\\dfrac{${numerator}}{${denominator}}`;
      } else if (/^\\(?:binom|tbinom|dbinom)$/.test(command)) {
        const top = argument(), bottom = argument();
        value = `${command}{${top}}{${bottom}}`;
      } else if (command === "\\sqrt") {
        skipSpace();
        const index = math[position] === "[" ? group("[", "]") : "";
        value = `\\sqrt${index}{${argument()}}`;
      } else if (command === "\\left" && ["(", "[", "|"].includes(math[position])) {
        value = command + atom();
      } else if (/^\\(?:text|operatorname|mathrm|mathbf|mathit)$/.test(command)) {
        // Command labels are not arithmetic (including any slash in their text).
        skipSpace();
        const start = position;
        if (math[position] === "{") {
          let depth = 1; position++;
          while (position < math.length && depth) {
            if (math[position] === "{") depth++;
            if (math[position] === "}") depth--;
            position++;
          }
        }
        value = command + math.slice(start, position);
      } else {
        value = command;
        // Preserve the space that ends a TeX command before a following letter.
        const start = position; skipSpace(); value += math.slice(start, position);
      }
    } else {
      const literal = math.slice(position).match(/^(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|[A-Za-z]+)/)?.[0];
      value = literal ?? math[position];
      position += value.length;
    }
    while (math[position] === "^" || math[position] === "_") {
      const script = math[position++];
      // Braces prevent 2^10 from being interpreted as (2^1) followed by 0.
      const digits = math.slice(position).match(/^\d+/)?.[0];
      if (digits) { position += digits.length; value += `${script}{${digits}}`; }
      else value += `${script}{${argument().replace(/\\dfrac/g, String.raw`\frac`)}}`;
    }
    if (/^\\(?:sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|ln|log|gcd|operatorname)/.test(value)) {
      const start = position; skipSpace();
      if (position < math.length && !/[+\-=<>/,;:|&)}\]]/.test(math[position])) value += math.slice(start, position) + atom();
      else position = start;
    }
    return value;
  }
  const tokens: Token[] = [];
  while (position < math.length) {
    const rest = math.slice(position);
    const space = rest.match(/^\s+/)?.[0];
    const multiply = rest.match(/^(?:\\(?:cdot|times)(?![A-Za-z])|\*)/)?.[0];
    const boundary = rest.match(/^(?:[+\-=<>≤≥≈≠,;:&]|\\(?:le|leq|ge|geq|approx|ne|neq|equiv|to)(?![A-Za-z]))/)?.[0];
    if (space || multiply || boundary || rest[0] === "/") {
      const value = space ?? multiply ?? boundary ?? "/";
      tokens.push({value, kind:space ? "space" : multiply ? "multiply" : boundary ? "boundary" : "slash"});
      position += value.length;
    } else {
      const value = atom();
      // Keep a summation/integral outside its summand's fraction.
      const kind = /^\\(?:sum|prod|int|iint|iiint|lim)(?![A-Za-z])/.test(value) ? "boundary" : "atom";
      tokens.push({value,kind});
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind !== "slash") continue;
    let end = i + 1;
    while (tokens[end]?.kind === "space") end++;
    if (tokens[end]?.kind !== "atom") continue;
    let start = i - 1;
    while (start >= 0 && tokens[start].kind === "space") start--;
    if (tokens[start]?.kind !== "atom") continue;
    while (start > 0 && ["atom", "multiply", "space"].includes(tokens[start-1].kind)) start--;
    const numerator = tokens.slice(start, i).map(t=>t.value).join("").trim();
    const denominator = tokens[end].value.trim();
    tokens.splice(start, end-start+1, {value:`\\dfrac{${numerator}}{${denominator}}`,kind:"atom"});
    i = start;
  }
  return tokens.map(token=>token.value).join("");
}
