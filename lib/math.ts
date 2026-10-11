/** Convert simple slash notation inside math into readable stacked fractions.
 * Grouped expressions retain their parentheses so their meaning stays explicit.
 * Prose (including URLs) is never passed to this formatter.
 */
export function stackedFractions(math: string) {
  // Include subscripts and balanced groups: v_K/(v_K+v_C), not just 1/2.
  let group = String.raw`[^(){}]+`;
  for (let depth = 0; depth < 4; depth++) {
    group = String.raw`(?:[^(){}]|\(${group}\)|\{${group}\})+`;
  }
  const braced = String.raw`\{${group}\}`;
  const script = String.raw`(?:[_^](?:${braced}|\\[A-Za-z]+|\d+|[A-Za-z]))*`;
  const atom = String.raw`(?:\\(?:pi|theta|alpha|beta|sqrt(?:${braced}|[A-Za-z0-9]))|\(${group}\)|${braced}|\d+(?:\.\d+)?|[A-Za-z]+)${script}`;
  return math
    .replace(new RegExp(`(?<![A-Za-z0-9_\\^\\\\])(${atom})\\s*/\\s*(${atom})(?![A-Za-z0-9_\\^])`, "g"), String.raw`\dfrac{$1}{$2}`)
    .replace(/\\(?:tfrac|frac)(?![A-Za-z])/g, String.raw`\dfrac`);
}
