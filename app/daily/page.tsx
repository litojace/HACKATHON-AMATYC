"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Sun, Trophy } from "lucide-react";
import { api } from "@/lib/client";
import { DAILY_QUESTION_COUNT, DAILY_DURATION_MINUTES, DAILY_RATING_CHANGES, DAILY_TIME_ZONE, ratingMilestone, type DailyStatus } from "@/lib/daily";
import { remainingSeconds } from "@/lib/domain";
import { getCodeforcesTitle } from "@/lib/rating";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading, PageTitle } from "@/components/Shared";
import ProblemArena from "@/components/ProblemArena";
import { RankText } from "@/components/RankedName";
import PerfectScoreCelebration from "@/components/PerfectScoreCelebration";
import Dialog from "@/components/ui/Dialog";
import LeaveSessionGuard from "@/components/LeaveSessionGuard";

export default function DailyPage() {
  const {user}=useApp();
  return <main className="mx-auto max-w-6xl px-4 py-7 sm:px-5 sm:py-10">
    <PageTitle eyebrow="ONE SMALL CHALLENGE, EVERY DAY" title="Your daily step toward the next title." description="Ten fresh questions matched to your rating. Up to 40 minutes to solve, learn, and move toward your next title." />
    <AccountGate requireAuth title="Sign in for your daily challenge." description="Your questions, saved answers, and rating progress are linked to your account.">
      <DailyContent key={user?.id} />
    </AccountGate>
  </main>;
}

function DailyContent() {
  const {profile,refreshAccount}=useApp();
  const [daily,setDaily]=useState<DailyStatus|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const [pending,setPending]=useState<{problem_id:string;answer:string|null}|null>(null);
  const [index,setIndex]=useState(0);
  const [confirm,setConfirm]=useState(false);
  const operation=useRef(false);
  const loading=useRef(false);
  const loadRequest=useRef(0);
  const clock=useRef({server:0,client:0});
  const [now,setNow]=useState(0);
  const timeoutRequest=useRef<string|null>(null);
  const sync=useCallback((data:DailyStatus)=>{
    clock.current={server:Date.parse(data.server_now),client:performance.now()};
    setNow(clock.current.server);setDaily(data);
    if(data.challenge?.status==="active")timeoutRequest.current=null;
  },[]);
  const load=useCallback(async(signal?:AbortSignal)=>{
    if(operation.current)return;
    const request=++loadRequest.current;
    loading.current=true;setBusy(true);setError("");
    try{const data=await api<DailyStatus>("daily",undefined,undefined,signal);if(!signal?.aborted&&request===loadRequest.current){sync(data);setSaveError("");setPending(null);setIndex(previous=>data.challenge?.status==="active"?Math.min(previous,data.challenge.questions.length-1):0);await refreshAccount();}}
    catch(e){if(!signal?.aborted&&request===loadRequest.current)setError((e as Error).message);}
    finally{if(request===loadRequest.current){loading.current=false;setBusy(false);}}
  },[sync,refreshAccount]);
  useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[load]);
  useEffect(()=>{
    if(!daily)return;
    let timer:ReturnType<typeof setTimeout>;
    const reset=()=>{if(operation.current)timer=setTimeout(reset,250);else void load();};
    timer=setTimeout(reset,Math.max(0,Date.parse(daily.resets_at)-Date.parse(daily.server_now))+150);
    return()=>clearTimeout(timer);
  },[daily,load]);
  const challenge=daily?.challenge;
  const completed=challenge?.status==="completed";
  const questionCount=challenge?.questions.length??DAILY_QUESTION_COUNT;
  const secondsLeft=challenge?.expires_at?remainingSeconds(challenge.expires_at,now):null;
  const expired=!completed&&secondsLeft===0;
  useEffect(()=>{
    if(!challenge?.expires_at||completed)return;
    const tick=()=>setNow(clock.current.server+performance.now()-clock.current.client);
    const timer=setInterval(tick,250);
    const visible=()=>{if(document.visibilityState==="visible")tick();};
    document.addEventListener("visibilitychange",visible);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
  },[challenge?.expires_at,completed]);
  useEffect(()=>{
    if(!expired||!challenge||operation.current||busy||saving||error||timeoutRequest.current===challenge.id)return;
    timeoutRequest.current=challenge.id;
    setConfirm(false);
    void load();
  },[expired,challenge,busy,saving,error,load]);
  useEffect(()=>{
    const visible=()=>{if(document.visibilityState==="visible"&&!operation.current&&!loading.current&&!saveError)void load();};
    document.addEventListener("visibilitychange",visible);
    return()=>document.removeEventListener("visibilitychange",visible);
  },[load,saveError]);
  const answered=Object.values(challenge?.answers??{}).filter(Boolean).length;
  const current=challenge?.questions[index];
  const review=challenge?.breakdown?.find(item=>item.problem_id===current?.id);
  const rating=completed?challenge.new_rating??800:profile?.rating??800;
  const milestone=ratingMilestone(rating);
  const promoted=completed && getCodeforcesTitle(challenge.new_rating??0).min>getCodeforcesTitle(challenge.old_rating??0).min;
  async function start(){
    if(operation.current||loading.current)return;operation.current=true;setBusy(true);setError("");
    try{sync(await api<DailyStatus>("daily/start",{}));setIndex(0);}
    catch(e){setError((e as Error).message);}finally{operation.current=false;setBusy(false);}
  }
  async function save(problem_id:string,answer:string|null){
    if(!challenge||completed||expired||operation.current||loading.current)return;
    operation.current=true;setSaving(true);setSaveError("");setPending({problem_id,answer});
    setDaily(previous=>previous?.challenge?{...previous,challenge:{...previous.challenge,answers:{...previous.challenge.answers,[problem_id]:answer}}}:previous);
    try{const data=await api<DailyStatus>(`daily/${challenge.id}`,{problem_id,answer},"PATCH");sync(data);setPending(null);if(data.challenge?.status==="completed")await refreshAccount();}
    catch(e){setSaveError((e as Error).message);}finally{operation.current=false;setSaving(false);}
  }
  async function finish(){
    if(!challenge||expired||operation.current||loading.current||answered!==questionCount||saveError)return;
    operation.current=true;setBusy(true);setConfirm(false);setError("");
    try{sync(await api<DailyStatus>(`daily/${challenge.id}/finish`,{}));setIndex(0);await refreshAccount();}
    catch(e){setError((e as Error).message);}finally{operation.current=false;setBusy(false);}
  }
  const closeConfirm=useCallback(()=>setConfirm(false),[]);
  if(!daily&&!error)return <Loading />;
  return <>
    <LeaveSessionGuard active={saving||!!saveError} kind="daily"/>
    {error&&<div role="alert" className="panel mb-5 p-5 text-sm"><p className="text-red-400">{error}</p><button type="button" className="btn-secondary mt-3" onClick={()=>void load()}>Reload daily challenge</button></div>}
    {!challenge?<section className="panel p-5 sm:p-8">
      <div className="flex items-center gap-3"><Sun size={28} className="text-emerald-400" aria-hidden="true"/><h2 className="text-xl font-semibold">Make today count.</h2></div>
      <p className="mt-4 text-sm leading-7 muted">Your set includes two warm-ups, six questions around your level, and two gentle stretches. The mix adapts to fresh questions available near your rating.</p>
      <p className="mt-2 text-sm leading-7 muted">You have up to 40 minutes from the moment you start, or until midnight Pacific if that comes first. Answers save to your account. Submit all ten early, or saved answers are graded when time runs out; blanks count as incorrect. Your rating changes once, then solutions unlock.</p>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-11" aria-label="Daily rating rewards">
        {Array.from({length:DAILY_QUESTION_COUNT+1},(_,i)=>DAILY_QUESTION_COUNT-i).map(correct=><div key={correct} className="rounded-lg border border-edge p-2 text-center sm:p-3"><p className="text-xs muted">{correct}/{DAILY_QUESTION_COUNT} correct</p><p className={`mt-2 font-mono text-lg font-semibold ${DAILY_RATING_CHANGES[correct]>0?"text-emerald-400":"muted"}`}>{DAILY_RATING_CHANGES[correct]>0?"+":""}{DAILY_RATING_CHANGES[correct]}</p></div>)}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-edge pt-5"><p className="text-sm muted">Starting level: <RankText rating={rating}>{rating}</RankText> · Previously seen questions are skipped.</p><button type="button" className="btn w-full sm:w-auto" disabled={busy||!daily} onClick={()=>void start()}>{busy?"Preparing your set…":"Start daily challenge"}<ArrowRight size={16}/></button></div>
    </section>:<>
      {completed?<section className="panel mb-5 p-5 sm:p-8" aria-labelledby="daily-result-title">
        {challenge.correct_count===questionCount&&<PerfectScoreCelebration attemptId={`daily-${challenge.id}`} total={questionCount}/>}
        <p className="text-xs font-semibold tracking-widest text-emerald-400">DAILY CHALLENGE COMPLETE</p>
        <h2 id="daily-result-title" className="mt-2 text-2xl font-semibold">{challenge.correct_count} out of {questionCount} correct</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4"><p className="font-mono text-2xl"><RankText rating={challenge.old_rating??800}>{challenge.old_rating}</RankText> → <RankText rating={rating}>{rating}</RankText></p><span className={`rounded-lg border border-edge px-3 py-2 font-semibold ${(challenge.rating_delta??0)>0?"text-emerald-400":"muted"}`}>{(challenge.rating_delta??0)>0?"+":""}{challenge.rating_delta} rating</span></div>
        {promoted&&<div role="status" className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4"><Trophy className="shrink-0 text-emerald-400" aria-hidden="true"/><p>You reached <RankText rating={rating} featured>{milestone.current.title}</RankText>!</p></div>}
        <div className="mt-5"><p className="text-sm muted">{milestone.next?`${milestone.remaining} points to ${milestone.next.title}`:"You hold the highest title. Keep your skills sharp!"}</p><div role="progressbar" aria-label="Progress toward next title" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(milestone.progress)} className="mt-2 h-2 overflow-hidden rounded-full bg-edge"><div className="h-full rounded-full bg-emerald-400" style={{width:`${milestone.progress}%`}}/></div></div>
        {challenge.timed_out&&<p role="status" className="mt-4 text-sm muted">Time’s up. Your saved answers were graded; {questionCount-answered} unanswered {questionCount-answered===1?"question counts":"questions count"} as incorrect.</p>}
        <p className="mt-4 text-sm muted">Today’s rating update is saved. Your next challenge arrives at midnight Pacific.</p>
        <Link href="/problems" className="btn-secondary mt-4">Keep practicing<ArrowRight size={16}/></Link>
      </section>:<section className="panel mb-5 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div><p className="font-semibold">Question {index+1} of {questionCount} · {answered} answered</p><p className="mt-1 text-xs muted">{new Date(`${challenge.challenge_date}T12:00:00Z`).toLocaleDateString(undefined,{month:"long",day:"numeric",timeZone:DAILY_TIME_ZONE})} · {challenge.expires_at?`${DAILY_DURATION_MINUTES}-minute limit · closes by midnight Pacific`:"Legacy set · Untimed · Reset: midnight Pacific"}</p></div>
        {secondsLeft!==null&&<div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${secondsLeft<=300?"border-red-400/50 text-red-400":"border-emerald-400/40 text-emerald-400"}`}><Clock3 size={18} aria-hidden="true"/><div><span role="timer" aria-label="Time remaining" aria-live="off" className="font-mono text-xl font-semibold tabular-nums">{Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,"0")}</span><p className="text-[10px] uppercase tracking-wider">Time left</p></div></div>}
        <p role="status" className={`flex items-center gap-2 text-sm ${saveError?"text-red-400":"muted"}`}>{expired?"Time’s up · submitting saved answers…":saving?"Saving answer…":saveError?"Answer not saved":<><CheckCircle2 size={16} aria-hidden="true"/>All changes saved</>}</p>
      </section>}
      <nav aria-label={completed?"Review daily questions":"Daily challenge questions"} className="mb-5 grid grid-cols-5 gap-2">
        {challenge.questions.map((problem,i)=><button key={problem.id} type="button" disabled={expired||saving||busy||!!saveError} aria-current={i===index?"step":undefined} aria-label={`${completed?"Review":"Go to"} question ${i+1}${challenge.answers[problem.id]?", answered":""}`} onClick={()=>setIndex(i)} className={`min-h-11 rounded-lg border px-2 py-3 text-sm ${i===index?"border-emerald-400 bg-emerald-400/10 text-emerald-400":"border-edge"}`}>{i+1}{challenge.answers[problem.id]&&<span className="ml-1" aria-hidden="true">✓</span>}</button>)}
      </nav>
      {saveError&&<div role="alert" className="panel mb-5 p-4 text-sm"><p className="text-red-400">{saveError} Your selected answer is still here.</p><button className="btn-secondary mt-3" onClick={()=>pending&&void save(pending.problem_id,pending.answer)} disabled={expired||saving}>Retry save</button><button className="btn-secondary ml-2 mt-3" onClick={()=>void load()}>Reload saved progress</button></div>}
      {current&&<>
        {completed&&review&&<p className={`panel mb-4 p-4 text-sm ${review.is_correct?"text-[var(--success)]":"muted"}`}>{review.is_correct?"Correct.":"Not quite."} You submitted {review.selected_answer??"no answer"} · Correct answer: {review.explanation.correct_answer}</p>}
        <ProblemArena key={current.id} problem={current} exam hideNavigation locked={completed||expired||busy||saving} answer={challenge.answers[current.id]??null} onAnswer={answer=>void save(current.id,answer)} explanation={completed?review?.explanation:undefined}/>
      </>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" className="btn-secondary" disabled={expired||index===0||saving||busy||!!saveError} onClick={()=>setIndex(i=>i-1)}><ArrowLeft size={16}/>Previous</button>{index<questionCount-1?<button type="button" className="btn-secondary" disabled={expired||saving||busy||!!saveError} onClick={()=>setIndex(i=>i+1)}>Next<ArrowRight size={16}/></button>:!completed?<button type="button" className="btn" disabled={expired||answered!==questionCount||saving||busy||!!saveError} onClick={()=>setConfirm(true)}>{busy?"Submitting…":"Submit challenge"}</button>:<Link href="/dashboard" className="btn-secondary">Your dashboard<ArrowRight size={16}/></Link>}</div>
      {!completed&&<p className="mt-4 text-center text-xs muted">Answer all {questionCount} questions to submit early.{challenge.expires_at?" When time runs out, only saved answers are graded.":""} Solutions unlock afterward.</p>}
    </>}
    {confirm&&<Dialog title="Submit your daily challenge?" onClose={closeConfirm} closeLabel="Keep solving"><p className="text-sm leading-7 muted">Your {questionCount} saved answers will be graded and your rating updated once. You can review the solutions afterward.</p><button type="button" className="btn mt-5" onClick={()=>void finish()}>Confirm submission</button></Dialog>}
  </>;
}
