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
      <section aria-label="About AMATYC and AMATYC Arena" className={`motion-menu panel space-y-5 p-5 text-sm leading-6 ${mobile ? "my-2" : "absolute right-0 top-full mt-2 max-h-[calc(100dvh-110px)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto"}`}>
        <div><h2 className="font-semibold">1. What is AMATYC?</h2><p className="mt-1 muted">AMATYC is a national math organization for community colleges. It runs the Student Math League (SML), a competition open to community college students across the country.</p></div>
        <div><h2 className="font-semibold">2. What is the Student Math League (SML)?</h2><p className="mt-1 muted">A national math test taken by over four thousand community college students. It has 20 multiple-choice or short-answer questions covering concepts through Pre-Calculus. You may use any scientific or graphing calculator that does not have a QWERTY (typewriter) keyboard.</p></div>
        <div><h2 className="font-semibold">3. Who can participate?</h2><p className="mt-1 muted">Community college students from any college can join the national competition. At OCC, Round One is open to enrolled students who are registered and present their ID.</p></div>
        <div><h2 className="font-semibold">4. What is AMATYC Arena?</h2><p className="mt-1 muted">A practice platform built by OCC MAT members. Use it to practice AMATYC-style problems, train for the test, and see how you rank.</p></div>
        <div><h2 className="font-semibold">5. How do I register?</h2><p className="mt-1 muted">Scan the QR code on the flyer. For questions, contact Prof. Vu Phan (MBCC 155, <a className="text-emerald-400 underline" href="mailto:vphan1@cccd.edu">vphan1@cccd.edu</a>).</p></div>
        <ul className="space-y-1 border-t border-edge pt-4">
          <li><strong>Round One:</strong> Friday, November 6</li>
          <li><strong>Time:</strong> 10:00 am to 11:30 am (1-hour test block)</li>
          <li><strong>Place:</strong> MBCC 318</li>
          <li><strong>Prizes:</strong> 1st $100, 2nd $75, 3rd $50, 4th $25</li>
        </ul>
      </section>
    </details>
  );
}
