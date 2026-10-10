/** Convert simple slash notation inside math into readable stacked fractions.
 * Grouped expressions retain their parentheses so their meaning stays explicit.
 * Prose (including URLs) is never passed to this formatter.
 */
export function stackedFractions(math: string) {
  const atom = String.raw`(?:\\(?:pi|sqrt\{[^{}]+\})|\([^()]+\)|\{[^{}]+\}|\d+(?:\.\d+)?|[A-Za-z])(?:\^(?:\{[^{}]+\}|\d+))?`;
  return math
    .replace(new RegExp(`(?<![A-Za-z0-9_\\^\\\\])(${atom})\\s*/\\s*(${atom})(?![A-Za-z0-9_\\^])`, "g"), String.raw`\dfrac{$1}{$2}`)
    .replace(/\\(?:tfrac|frac)(?![A-Za-z])/g, String.raw`\dfrac`);
}
