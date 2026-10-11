import MathRenderer from "./MathRenderer";
import { mathSegments, solutionMathText } from "@/lib/math-text";

/** Preserve formulas while presenting each prose statement as a separate step. */
export default function SolutionRenderer({ text }: { text: string }) {
  text = solutionMathText(text);
  const numberedSteps = text.trim().split(/\n\s*\n/);
  if (numberedSteps.length > 1 && numberedSteps.every(step => /^\d+\.\s/.test(step))) {
    return (
      <ol className="list-decimal space-y-5 pl-6 marker:font-semibold marker:text-emerald-400">
        {numberedSteps.map((step, i) => (
          <li key={i} className="pl-2"><MathRenderer text={step.replace(/^\d+\.\s/, "")} /></li>
        ))}
      </ol>
    );
  }
  const formulas: string[] = [];
  const prose = mathSegments(text).map((segment) => {
    if (segment.kind === "text") return segment.value.replace(/\$/g, "\\$");
    const delimiter = segment.kind === "display" ? "$$" : "$";
    formulas.push(delimiter+segment.value+delimiter);
    return `\uE000${formulas.length - 1}\uE001`;
  }).join("");
  const statements = prose
    .replace(/([.!?])\s+(?=[A-Z\uE000])/g, "$1\n\n")
    .replace(/:\s+(?=First\b|Next\b|Finally\b|\uE000)/g, ":\n\n")
    .split(/\n+/)
    .map((statement) => statement.replace(/\uE000(\d+)\uE001/g, (_, i) => formulas[Number(i)]))
    .filter((statement) => statement.trim());
  return (
    <div className="space-y-4">
      {statements.map((statement, i) => (
        <div key={i}><MathRenderer text={statement} /></div>
      ))}
    </div>
  );
}
