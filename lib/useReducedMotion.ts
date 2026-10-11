"use client";
import { useSyncExternalStore } from "react";

const query = "(prefers-reduced-motion: reduce)";
function subscribe(update: () => void) {
  const preference = window.matchMedia(query);
  preference.addEventListener("change", update);
  return () => preference.removeEventListener("change", update);
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => true);
}
