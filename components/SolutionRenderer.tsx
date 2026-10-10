import MathRenderer from "./MathRenderer";

/** Preserve formulas while presenting each prose statement as a separate step. */
export default function SolutionRenderer({ text }: { text: string }) {
  const formulas: string[] = [];
  const prose = text.replace(/\$\$[\s\S]*?\$\$|\$[^$]+\$/g, (formula) => {
    formulas.push(formula);
    return `\uE000${formulas.length - 1}\uE001`;
  });
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
