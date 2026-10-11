"use client";
import { BlockMath, InlineMath } from "react-katex";
import { stackedFractions } from "@/lib/math";
import { mathSegments } from "@/lib/math-text";
export default function MathRenderer({ text }: { text: string }) {
  return (
    <span>
      {mathSegments(text).map((part, i) =>
          part.kind === "display" ? (
            <span key={i} className="block max-w-full overflow-x-auto"><BlockMath math={stackedFractions(part.value)} errorColor="#fb7185" /></span>
          ) : part.kind === "inline" ? (
            <span key={i} className="inline-block max-w-full overflow-x-auto align-middle py-1"><InlineMath math={stackedFractions(part.value)} errorColor="#fb7185" /></span>
          ) : (
            <span key={i}>{part.value}</span>
          ),
        )}
    </span>
  );
}
