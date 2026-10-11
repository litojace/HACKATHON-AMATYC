export type MathSegment = { kind: "text" | "inline" | "display"; value: string };

/** Recognize unambiguous mathematical fragments in older solution prose. */
export function solutionMathText(text: string): string {
  return mathSegments(text).map((part) => {
    if (part.kind !== "text") {
      const delimiter = part.kind === "display" ? "$$" : "$";
      return delimiter + part.value + delimiter;
    }
    return part.value.replace(/\$/g, "\\$")
      .replace(/(?<![\w/])(-?\d+(?:\.\d+)?\s*[≤≥]\s*[A-Za-z]\s*[≤≥]\s*-?\d+(?:\.\d+)?)(?![\w/])/g,
        (_, expression: string) => "$" + expression.replace(/≤/g, "\\le ").replace(/≥/g, "\\ge ") + "$")
      .replace(/(?<![\w/$])(-?\d+(?:\.\d+)?\/\d+(?:\.\d+)?)(?![\w/])/g, "$$$1$$");
  }).join("");
}

/** Dollar signs escaped as \$ are currency, never math delimiters. */
export function mathSegments(text: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let prose = "";
  const flush = () => { if (prose) segments.push({kind:"text",value:prose}); prose = ""; };
  for (let i = 0; i < text.length;) {
    if (text[i] === "\\" && text[i+1] === "$") { prose += "$"; i += 2; continue; }
    if (text[i] !== "$") { prose += text[i++]; continue; }
    const delimiter = text[i+1] === "$" ? "$$" : "$";
    let end = text.indexOf(delimiter, i+delimiter.length);
    while (end >= 0 && text[end-1] === "\\") end = text.indexOf(delimiter,end+delimiter.length);
    if (end < 0) { prose += text[i++]; continue; }
    const value = text.slice(i+delimiter.length,end);
    // Preserve older unescaped currency when a second price occurs in prose.
    // Explicit TeX (for example \text{ dollars}) identifies a real formula.
    if (delimiter === "$" && /^\d/.test(value) && !/\\[A-Za-z]+/.test(value) && /\b(?:worth|dollars|buys|buy|so)\b/.test(value)) {
      prose += text[i++]; continue;
    }
    flush();
    segments.push({kind:delimiter === "$$" ? "display" : "inline",value});
    i = end+delimiter.length;
  }
  flush();
  return segments;
}
