import type { PublicProblem } from "@/types/problem";
import MathRenderer from "./MathRenderer";
import { answerText } from "@/lib/result-answer";

export default function ResultAnswer({ problem, answer, empty = "No answer" }: {
  problem: PublicProblem;
  answer?: string | null;
  empty?: string;
}) {
  if (!answer) return <span>{empty}</span>;
  const text = answerText(problem, answer);
  return (
    <span className="inline-block max-w-full align-top">
      {answer}
      {text && <> — <MathRenderer text={text} /></>}
    </span>
  );
}
