"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Sun, Trophy } from "lucide-react";
import { api } from "@/lib/client";
import { DAILY_RATING_CHANGES, DAILY_TIME_ZONE, ratingMilestone, type DailyStatus } from "@/lib/daily";
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
  return <main className="mx-auto max-w-6xl px-5 py-10">
    <PageTitle eyebrow="ONE SMALL CHALLENGE, EVERY DAY" title="Your daily step toward the next title." description="Five fresh questions matched to your rating. Solve at your own pace and earn progress through your answers." />
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
  const load=useCallback(async(signal?:AbortSignal)=>{
    setError("");
    try{const data=await api<DailyStatus>("daily",undefined,undefined,signal);if(!signal?.aborted){setDaily(data);setSaveError("");setPending(null);setIndex(0);}}
    catch(e){if(!signal?.aborted)setError((e as Error).message);}
  },[]);
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
  const answered=Object.values(challenge?.answers??{}).filter(Boolean).length;
  const current=challenge?.questions[index];
  const review=challenge?.breakdown?.find(item=>item.problem_id===current?.id);
  const rating=completed?challenge.new_rating??800:profile?.rating??800;
  const milestone=ratingMilestone(rating);
  const promoted=completed && getCodeforcesTitle(challenge.new_rating??0).min>getCodeforcesTitle(challenge.old_rating??0).min;
  async function start(){
    if(operation.current)return;operation.current=true;setBusy(true);setError("");
    try{setDaily(await api<DailyStatus>("daily/start",{}));setIndex(0);}
    catch(e){setError((e as Error).message);}finally{operation.current=false;setBusy(false);}
  }
  async function save(problem_id:string,answer:string|null){
    if(!challenge||completed||operation.current)return;
    operation.current=true;setSaving(true);setSaveError("");setPending({problem_id,answer});
    setDaily(previous=>previous?.challenge?{...previous,challenge:{...previous.challenge,answers:{...previous.challenge.answers,[problem_id]:answer}}}:previous);
    try{setDaily(await api<DailyStatus>(`daily/${challenge.id}`,{problem_id,answer},"PATCH"));setPending(null);}
    catch(e){setSaveError((e as Error).message);}finally{operation.current=false;setSaving(false);}
  }
  async function finish(){
    if(!challenge||operation.current||answered!==5||saveError)return;
    operation.current=true;setBusy(true);setConfirm(false);setError("");
    try{setDaily(await api<DailyStatus>(`daily/${challenge.id}/finish`,{}));setIndex(0);await refreshAccount();}
    catch(e){setError((e as Error).message);}finally{operation.current=false;setBusy(false);}
  }
  const closeConfirm=useCallback(()=>setConfirm(false),[]);
  if(!daily&&!error)return <Loading />;
  return <>
    <LeaveSessionGuard active={saving||!!saveError} kind="daily"/>
    {error&&<div role="alert" className="panel mb-5 p-5 text-sm"><p className="text-red-400">{error}</p><button type="button" className="btn-secondary mt-3" onClick={()=>void load()}>Reload daily challenge</button></div>}
    {!challenge?<section className="panel p-5 sm:p-8">
      <div className="flex items-center gap-3"><Sun size={28} className="text-emerald-400" aria-hidden="true"/><h2 className="text-xl font-semibold">Make today count.</h2></div>
      <p className="mt-4 text-sm leading-7 muted">Your set includes a warm-up, three questions around your level, and a gentle stretch. The mix adapts to fresh questions available near your rating.</p>
      <p className="mt-2 text-sm leading-7 muted">Answers save to your account. Complete all five before the daily reset at midnight Pacific. Your rating changes once when you submit, then solutions unlock.</p>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Daily rating rewards">
        {[5,4,3,2,1,0].map(correct=><div key={correct} className="rounded-lg border border-edge p-3 text-center"><p className="text-xs muted">{correct}/5 correct</p><p className={`mt-2 font-mono text-lg font-semibold ${DAILY_RATING_CHANGES[correct]>0?"text-emerald-400":"muted"}`}>{DAILY_RATING_CHANGES[correct]>0?"+":""}{DAILY_RATING_CHANGES[correct]}</p></div>)}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-edge pt-5"><p className="text-sm muted">Starting level: <RankText rating={rating}>{rating}</RankText> · Previously seen questions are skipped.</p><button type="button" className="btn" disabled={busy||!daily} onClick={()=>void start()}>{busy?"Preparing your set…":"Start daily challenge"}<ArrowRight size={16}/></button></div>
    </section>:<>
      {completed?<section className="panel mb-5 p-5 sm:p-8" aria-labelledby="daily-result-title">
        {challenge.correct_count===5&&<PerfectScoreCelebration attemptId={`daily-${challenge.id}`} total={5}/>}
        <p className="text-xs font-semibold tracking-widest text-emerald-400">DAILY CHALLENGE COMPLETE</p>
        <h2 id="daily-result-title" className="mt-2 text-2xl font-semibold">{challenge.correct_count} out of 5 correct</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4"><p className="font-mono text-2xl"><RankText rating={challenge.old_rating??800}>{challenge.old_rating}</RankText> → <RankText rating={rating}>{rating}</RankText></p><span className={`rounded-lg border border-edge px-3 py-2 font-semibold ${(challenge.rating_delta??0)>0?"text-emerald-400":"muted"}`}>{(challenge.rating_delta??0)>0?"+":""}{challenge.rating_delta} rating</span></div>
        {promoted&&<div role="status" className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4"><Trophy className="shrink-0 text-emerald-400" aria-hidden="true"/><p>You reached <RankText rating={rating} featured>{milestone.current.title}</RankText>!</p></div>}
        <div className="mt-5"><p className="text-sm muted">{milestone.next?`${milestone.remaining} points to ${milestone.next.title}`:"You hold the highest title. Keep your skills sharp!"}</p><div role="progressbar" aria-label="Progress toward next title" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(milestone.progress)} className="mt-2 h-2 overflow-hidden rounded-full bg-edge"><div className="h-full rounded-full bg-emerald-400" style={{width:`${milestone.progress}%`}}/></div></div>
        <p className="mt-4 text-sm muted">Today’s rating update is saved. Your next challenge arrives at midnight Pacific.</p>
        <Link href="/problems" className="btn-secondary mt-4">Keep practicing<ArrowRight size={16}/></Link>
      </section>:<section className="panel mb-5 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div><p className="font-semibold">Question {index+1} of 5 · {answered} answered</p><p className="mt-1 text-xs muted">{new Date(`${challenge.challenge_date}T12:00:00Z`).toLocaleDateString(undefined,{month:"long",day:"numeric",timeZone:DAILY_TIME_ZONE})} · Reset: midnight Pacific · Untimed</p></div>
        <p role="status" className={`flex items-center gap-2 text-sm ${saveError?"text-red-400":"muted"}`}>{saving?"Saving answer…":saveError?"Answer not saved":<><CheckCircle2 size={16} aria-hidden="true"/>All changes saved</>}</p>
      </section>}
      <nav aria-label={completed?"Review daily questions":"Daily challenge questions"} className="mb-5 grid grid-cols-5 gap-2">
        {challenge.questions.map((problem,i)=><button key={problem.id} type="button" disabled={saving||busy||!!saveError} aria-current={i===index?"step":undefined} aria-label={`${completed?"Review":"Go to"} question ${i+1}${challenge.answers[problem.id]?", answered":""}`} onClick={()=>setIndex(i)} className={`min-h-11 rounded-lg border px-2 py-3 text-sm ${i===index?"border-emerald-400 bg-emerald-400/10 text-emerald-400":"border-edge"}`}>{i+1}{challenge.answers[problem.id]&&<span className="ml-1" aria-hidden="true">✓</span>}</button>)}
      </nav>
      {saveError&&<div role="alert" className="panel mb-5 p-4 text-sm"><p className="text-red-400">{saveError} Your selected answer is still here.</p><button className="btn-secondary mt-3" onClick={()=>pending&&void save(pending.problem_id,pending.answer)} disabled={saving}>Retry save</button><button className="btn-secondary ml-2 mt-3" onClick={()=>void load()}>Reload saved progress</button></div>}
      {current&&<>
        {completed&&review&&<p className={`panel mb-4 p-4 text-sm ${review.is_correct?"text-[var(--success)]":"muted"}`}>{review.is_correct?"Correct.":"Not quite."} You submitted {review.selected_answer} · Correct answer: {review.explanation.correct_answer}</p>}
        <ProblemArena key={current.id} problem={current} exam hideNavigation locked={completed||busy||saving} answer={challenge.answers[current.id]??null} onAnswer={answer=>void save(current.id,answer)} explanation={completed?review?.explanation:undefined}/>
      </>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><button type="button" className="btn-secondary" disabled={index===0||saving||busy||!!saveError} onClick={()=>setIndex(i=>i-1)}><ArrowLeft size={16}/>Previous</button>{index<4?<button type="button" className="btn-secondary" disabled={saving||busy||!!saveError} onClick={()=>setIndex(i=>i+1)}>Next<ArrowRight size={16}/></button>:!completed?<button type="button" className="btn" disabled={answered!==5||saving||busy||!!saveError} onClick={()=>setConfirm(true)}>{busy?"Submitting…":"Submit challenge"}</button>:<Link href="/dashboard" className="btn-secondary">Your dashboard<ArrowRight size={16}/></Link>}</div>
      {!completed&&<p className="mt-4 text-center text-xs muted">Answer all five questions to submit. Solutions become available after submission.</p>}
    </>}
    {confirm&&<Dialog title="Submit your daily challenge?" onClose={closeConfirm} closeLabel="Keep solving"><p className="text-sm leading-7 muted">Your five saved answers will be graded and your rating updated once. You can review the solutions afterward.</p><button type="button" className="btn mt-5" onClick={()=>void finish()}>Confirm submission</button></Dialog>}
  </>;
}
