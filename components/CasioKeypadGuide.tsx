"use client";
import { useState } from "react";
import type { CalculatorTrick } from "@/types/problem";
export default function CasioKeypadGuide({
  trick,
}: {
  trick?: CalculatorTrick;
}) {
  const [step, setStep] = useState(0);
  if (!trick)
    return (
      <p className="muted">No verified calculator strategy is available.</p>
    );
  return (
    <div>
      <p className="text-xs tracking-widest text-emerald-400">{trick.model}</p>
      {trick.functionality && <p className="mt-3 font-semibold">Function: {trick.functionality}</p>}
      <p className="my-4 muted">{trick.summary}</p>
      {trick.applicable && trick.steps.length > 0 ? (
        <>
          <div
            aria-live="polite"
            className="rounded-xl border border-edge bg-ink p-5"
          >
            <span className="text-xs muted">
              STEP {step + 1} OF {trick.steps.length}
            </span>
            <p className="mt-3 font-mono text-emerald-400">
              {trick.steps[step]}
            </p>
            {trick.screen_states?.[step] && <div className="mt-4 rounded-md bg-[#dce6cc] p-4 font-mono text-lg text-[#172513]" aria-label="Expected calculator display">{trick.screen_states[step]}</div>}
            <div className="mt-5 flex flex-wrap gap-2" aria-label="Keys for this step">
              {(
                trick.key_sequences?.[step] ?? trick.steps[step].match(
                  /\[[^\]]+\]|Ans|sin|cos|log|[0-9]+|[+−÷×=]/g,
                ) ?? ["="]
              ).map((key, i) => (
                <kbd
                  key={i}
                  className="rounded-md border border-edge bg-panel px-3 py-2 text-sm"
                >
                  {key.replaceAll("[", "").replaceAll("]", "")}
                </kbd>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="btn-secondary"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              Previous step
            </button>
            <button
              className="btn"
              disabled={step === trick.steps.length - 1}
              onClick={() => setStep(step + 1)}
            >
              Next step
            </button>
            <button className="btn-secondary" onClick={() => setStep(0)}>
              Restart
            </button>
          </div>
          <p className="mt-3 text-xs muted">
            Instructional key guide, not a calculator emulator.
          </p>
        </>
      ) : (
        <p className="rounded-lg border border-edge p-4 text-sm muted">
          Use the mathematical solution for this problem.
        </p>
      )}
    </div>
  );
}
