"use client";

import { Clock3, LogOut, ScanLine, Sun } from "lucide-react";
import styles from "./DailyFocus.module.css";

export default function DailyFocusBar({answered,total,secondsLeft,onExit}: {
  answered:number;
  total:number;
  secondsLeft:number|null;
  onExit:()=>void;
}) {
  return <header className={styles.bar} aria-label="Daily challenge session">
    <div className={styles.barInner}>
      <div className={styles.brand}>
        <span className={styles.symbol}><Sun size={24} aria-hidden="true"/></span>
        <div><p className={styles.kicker}><ScanLine size={12} aria-hidden="true"/>FOCUS MODE</p><h1>Daily Challenge</h1><p className={styles.mobileProgress}>{answered} / {total} saved</p></div>
      </div>
      <div className={styles.progress}>
        <p><span>Answers saved</span><strong>{answered} / {total}</strong></p>
        <div role="progressbar" aria-label="Saved answers" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} className={styles.track}><span style={{width:`${100*answered/total}%`}}/></div>
      </div>
      <div className={styles.tools}>
        {secondsLeft!==null?<div className={`${styles.timer} ${secondsLeft<=300?styles.urgent:""}`}>
          <Clock3 size={19} aria-hidden="true"/><div><p className={styles.timerLabel}>TIME LEFT</p><span role="timer" aria-label="Time remaining" aria-live="off">{Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,"0")}</span></div>
        </div>:<span className={styles.untimed}>Untimed set</span>}
        <button type="button" onClick={onExit} className={styles.exit} aria-label="Exit focus mode"><LogOut size={18} aria-hidden="true"/><span>Exit</span></button>
      </div>
    </div>
  </header>;
}
