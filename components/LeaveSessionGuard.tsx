"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@/components/ui/Dialog";

export default function LeaveSessionGuard({
  active,
  kind,
}: {
  active: boolean;
  kind: "training" | "contest" | "daily";
}) {
  const router = useRouter();
  const [destination, setDestination] = useState<string | null>(null);
  const leaving = useRef(false);
  const cancel = useCallback(() => setDestination(null), []);

  useEffect(() => {
    if (!active) return;
    leaving.current = false;
    function intercept(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault();
      event.stopPropagation();
      setDestination(url.pathname + url.search + url.hash);
    }
    function beforeUnload(event: BeforeUnloadEvent) {
      if (leaving.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    document.addEventListener("click", intercept, true);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("click", intercept, true);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [active]);

  if (!active || !destination) return null;
  return (
    <Dialog title={kind==="daily"?"Leave before your answer is saved?":`Leave this ${kind} session?`} onClose={cancel} closeLabel={kind === "training" ? "Keep training" : kind==="daily"?"Keep solving":"Stay in contest"}>
      <p className="leading-7 muted">
        {kind==="daily"?"Your latest answer has not been saved yet. Wait for it to save or retry before leaving. Earlier saved answers will be available when you return.":kind === "training"
          ? "Your current training progress will be lost if you leave. Are you sure you want to go to another page?"
          : "The contest timer will keep running after you leave. Saved answers will remain, but any answers still being saved may be lost. Are you sure you want to go to another page?"}
      </p>
      <button type="button" className="btn mt-6" onClick={() => {
        leaving.current = true;
        setDestination(null);
        router.push(destination);
      }}>
        {kind==="daily"?"Leave anyway":`Leave ${kind}`}
      </button>
    </Dialog>
  );
}
