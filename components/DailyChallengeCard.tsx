"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sun } from "lucide-react";
import { useApp } from "./Providers";
import { api } from "@/lib/client";
import type { DailyStatus } from "@/lib/daily";
import styles from "./DailyHighlight.module.css";

export default function DailyChallengeCard() {
  const {user,profile}=useApp();
  const userId=user?.id;
  const [daily,setDaily]=useState<{owner:string;status:DailyStatus}|null>(null);
  useEffect(()=>{
    let active=true;
    let timer:ReturnType<typeof setTimeout>;
    const refresh=()=>{if(userId)api<DailyStatus>("daily").then(data=>{if(active){setDaily({owner:userId,status:data});clearTimeout(timer);timer=setTimeout(refresh,Math.max(0,Date.parse(data.resets_at)-Date.parse(data.server_now))+150);}}).catch(()=>{});};
    const visible=()=>{if(document.visibilityState==="visible")refresh();};
    refresh();document.addEventListener("visibilitychange",visible);
    return()=>{active=false;clearTimeout(timer);document.removeEventListener("visibilitychange",visible);};
  },[userId,profile?.rating]);
  const challenge=userId===daily?.owner?daily?.status.challenge:null;
  const completed=challenge?.status==="completed";
  const answered=Object.values(challenge?.answers??{}).filter(Boolean).length;
  return <section className={`panel mb-5 ${styles.card}`} aria-label="Daily challenge">
    <div className={styles.intro}>
      <span className={styles.icon}><Sun size={30} aria-hidden="true" /></span>
      <div><div className={styles.heading}><h2>Daily Challenge</h2><span className={styles.badge}>{completed?"COMPLETED":challenge?"IN PROGRESS":"UP TO +20 RATING"}</span></div><p className={styles.description}>{completed?`${challenge.correct_count}/5 correct · ${(challenge.rating_delta??0)>=0?"+":""}${challenge.rating_delta} rating today`:challenge?`${answered} of 5 answers saved · Finish before midnight Pacific`:"Five fresh questions. One step closer to your next title."}</p></div>
    </div>
    <Link href="/daily" className={`btn ${styles.cta}`}>{completed?"View results":challenge?"Resume challenge":"Daily Challenge"}<ArrowRight size={18} aria-hidden="true" /></Link>
  </section>;
}
