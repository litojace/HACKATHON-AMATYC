"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sun } from "lucide-react";
import { useApp } from "./Providers";
import { api } from "@/lib/client";
import type { DailyStatus } from "@/lib/daily";

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
  return <section className="panel mb-5 flex flex-wrap items-center justify-between gap-4 border-emerald-400/30 p-5" aria-label="Daily challenge">
    <div className="flex min-w-0 items-center gap-4">
      <Sun size={30} className="shrink-0 text-emerald-400" aria-hidden="true" />
      <div><h2 className="font-semibold">Daily Challenge</h2><p className="mt-1 text-sm muted">{completed?`${challenge.correct_count}/5 correct · ${(challenge.rating_delta??0)>=0?"+":""}${challenge.rating_delta} rating today`:challenge?`${answered} of 5 answers saved · Finish before midnight Pacific`:"5 questions at your level · Earn up to +20 rating"}</p></div>
    </div>
    <Link href="/daily" className="btn-secondary shrink-0">{completed?"View results":challenge?"Resume challenge":"Daily challenge"}<ArrowRight size={16} aria-hidden="true" /></Link>
  </section>;
}
