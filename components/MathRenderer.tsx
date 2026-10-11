"use client";
import { BlockMath, InlineMath } from "react-katex";
import { stackedFractions } from "@/lib/math";
import { mathSegments } from "@/lib/math-text";
export default function MathRenderer({ text }: { text: string }) {
  return (
    <span>
      {mathSegments(text).map((part, i) =>
          part.kind === "display" ? (
            <span key={i} className="block max-w-full"><BlockMath math={stackedFractions(part.value)} errorColor="#fb7185" /></span>
          ) : part.kind === "inline" ? (
            <InlineMath key={i} math={stackedFractions(part.value)} errorColor="#fb7185" />
          ) : (
            <span key={i}>{part.value}</span>
          ),
        )}
    </span>
  );
}
