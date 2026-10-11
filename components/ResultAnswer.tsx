import type { PublicProblem } from "@/types/problem";
import MathRenderer from "./MathRenderer";
import { answerText } from "@/lib/result-answer";

export default function ResultAnswer({ problem, answer, empty = "No answer" }: {
  problem: PublicProblem;
  answer?: string | null;
  empty?: string;
}) {
  if (!answer) return <span>{empty}</span>;
  const option = problem.options.find((item) => item.label === answer);
  const printed = option?.text.trim() === `Printed option ${answer}`;
  const text = answerText(problem, answer);
  return (
    <span className="inline-block max-w-full align-top">
      {answer}
      {text && <> — <MathRenderer text={text} /></>}
      {!text && printed && problem.source_image_path && <>
        {" — "}<a className="underline" href={problem.source_image_path} target="_blank" rel="noopener noreferrer">View option {answer} in original question</a>
      </>}
    </span>
  );
}
