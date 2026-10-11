"use client";

import { useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

export default function AboutUs({ mobile = false }: { mobile?: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && ref.current && !ref.current.contains(event.target)) ref.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  return (
    <details ref={ref} className="group relative">
      <summary className={`flex min-h-11 cursor-pointer list-none items-center gap-2 whitespace-nowrap text-sm muted hover:text-emerald-400 ${mobile ? "rounded-lg px-3 font-medium" : ""}`}>
        About us
        <ChevronDown size={14} aria-hidden="true" className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <section aria-label="About AMATYC and AMATYC Arena" className={`motion-menu panel max-h-[calc(100dvh-110px)] overflow-y-auto overscroll-y-contain space-y-5 p-5 text-sm leading-6 ${mobile ? "my-2" : "absolute right-0 top-full mt-2 w-[min(32rem,calc(100vw-2rem))]"}`}>
        <section aria-labelledby={mobile ? "round-one-mobile" : "round-one-desktop"} className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">OCC Student Math League</p>
          <h2 id={mobile ? "round-one-mobile" : "round-one-desktop"} className="mt-1 text-xl font-bold">Round One · Friday, November 6</h2>
          <dl className="mt-3 space-y-2">
            <div><dt className="text-xs muted">Time</dt><dd className="font-semibold">10:00 am to 11:30 am <span className="block text-xs font-normal muted">1-hour test block</span></dd></div>
            <div><dt className="text-xs muted">Place</dt><dd className="font-semibold">MBCC 318</dd></div>
          </dl>
          <h3 className="mt-4 border-t border-emerald-400/20 pt-3 font-semibold">Cash prizes</h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["1st place", "$100"], ["2nd place", "$75"], ["3rd place", "$50"], ["4th place", "$25"]].map(([place, amount]) => (
              <div key={place} className="rounded-lg border border-edge bg-panel p-3 text-center">
                <dt className="text-xs muted">{place}</dt>
                <dd className="mt-1 text-2xl font-bold text-emerald-400">{amount}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div><h2 className="font-semibold">1. What is AMATYC?</h2><p className="mt-1 muted">AMATYC is a national math organization for community colleges. It runs the Student Math League (SML), a competition open to community college students across the country.</p></div>
        <div><h2 className="font-semibold">2. What is the Student Math League (SML)?</h2><p className="mt-1 muted">A national math test taken by over four thousand community college students. It has 20 multiple-choice or short-answer questions covering concepts through Pre-Calculus. You may use any scientific or graphing calculator that does not have a QWERTY (typewriter) keyboard.</p></div>
        <div><h2 className="font-semibold">3. Who can participate?</h2><p className="mt-1 muted">Community college students from any college can join the national competition. At OCC, Round One is open to enrolled students who are registered and present their ID.</p></div>
        <div><h2 className="font-semibold">4. What is AMATYC Arena?</h2><p className="mt-1 muted">A practice platform built by OCC MAT members. Use it to practice AMATYC-style problems, train for the test, and see how you rank.</p></div>
        <div>
          <h2 className="font-semibold">5. How do I register?</h2>
          <p className="mt-1 muted">Scan the QR code on the flyer on our website or our <a className="text-emerald-400 underline" href="https://www.instagram.com/mat_occ/" target="_blank" rel="noopener noreferrer">Instagram</a>.</p>
          <div className="mt-4 border-t border-edge pt-3">
            <h3 className="font-semibold">Questions? Contact Prof. Vu Phan</h3>
            <p className="mt-1 muted">Office: MBCC 155</p>
            <a className="block text-emerald-400 underline" href="mailto:vphan1@cccd.edu">vphan1@cccd.edu</a>
          </div>
        </div>
      </section>
    </details>
  );
}
