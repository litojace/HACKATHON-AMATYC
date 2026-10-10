"use client";
import { BlockMath, InlineMath } from "react-katex";
import { stackedFractions } from "@/lib/math";
export default function MathRenderer({ text }: { text: string }) {
  return (
    <span>
      {text
        .split(/(\$\$[\s\S]*?\$\$|\$[^$]+\$)/g)
        .map((part, i) =>
          part.startsWith("$$") ? (
            <BlockMath key={i} math={stackedFractions(part.slice(2, -2))} errorColor="#fb7185" />
          ) : part.startsWith("$") ? (
            <InlineMath key={i} math={stackedFractions(part.slice(1, -1))} errorColor="#fb7185" />
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
    </span>
  );
}
