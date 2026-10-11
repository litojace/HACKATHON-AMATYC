"use client";
import { useEffect, useState } from "react";

export default function RankEffectsControl() {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const sync = () => setPaused(document.documentElement.dataset.rankMotion === "off");
    sync();
    window.addEventListener("rank-motion-change", sync);
    return () => window.removeEventListener("rank-motion-change", sync);
  }, []);
  function toggle() {
    const next = !paused;
    document.documentElement.dataset.rankMotion = next ? "off" : "on";
    try { localStorage.setItem("amatyc-rank-motion", next ? "off" : "on"); } catch { /* Session preference still applies. */ }
    window.dispatchEvent(new Event("rank-motion-change"));
  }
  return <button type="button" className="btn-secondary" aria-pressed={paused} onClick={toggle}>{paused ? "Resume rank effects" : "Pause rank effects"}</button>;
}
