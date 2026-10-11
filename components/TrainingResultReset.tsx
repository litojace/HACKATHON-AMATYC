"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export const TRAINING_RESULT_KEY = "amatyc-training-result-v1";

export default function TrainingResultReset() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/training") return;
    try { sessionStorage.removeItem(TRAINING_RESULT_KEY); } catch { /* Storage may be disabled. */ }
  }, [pathname]);
  return null;
}
