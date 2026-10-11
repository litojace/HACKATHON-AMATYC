import type { PublicProblem } from "@/types/problem";

export function answerText(problem: Pick<PublicProblem, "options" | "question_latex">, answer: string) {
  const option = problem.options.find((item) => item.label === answer);
  if (!option) return null;
  if (option.text.trim() !== `Printed option ${answer}`) return option.text;
  // Use the printed text only when every choice marker occurs in order.
  const markers = [...problem.question_latex.matchAll(/(?:^|\s)([A-E])\.\s*/g)];
  if (markers.length !== problem.options.length || markers.some((marker, i) => marker[1] !== problem.options[i].label)) return null;
  const index = problem.options.indexOf(option);
  const start = markers[index].index! + markers[index][0].length;
  const end = markers[index + 1]?.index ?? problem.question_latex.length;
  return problem.question_latex.slice(start, end).trim() || null;
}
