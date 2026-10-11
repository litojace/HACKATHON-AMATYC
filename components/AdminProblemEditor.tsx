"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { supabase } from "@/lib/supabaseClient";
import { adminProblemSchema, emptyAdminProblem, type AdminProblem } from "@/lib/admin-problems";
import { CATEGORIES } from "@/lib/domain";
import { useApp } from "./Providers";
import { AccountGate, Loading, PageTitle } from "./Shared";
import MathRenderer from "./MathRenderer";

export default function AdminProblemEditor({problemId,embedded=false,onSaved}: {problemId?: string;embedded?:boolean;onSaved?:(problem:AdminProblem)=>void}) {
  const {user} = useApp();
  const content = <AccountGate requireAuth title="Sign in to manage problems." description="Only administrators can create and edit problems."><Editor key={user?.id} problemId={problemId} onSaved={onSaved} /></AccountGate>;
  return embedded ? <div className="py-5">{content}</div> : <main className="mx-auto max-w-5xl px-5 py-10">{content}</main>;
}
function Editor({problemId,onSaved}: {problemId?: string;onSaved?:(problem:AdminProblem)=>void}) {
  const router = useRouter();
  const {reload,notify} = useApp();
  const [problem,setProblem] = useState<AdminProblem>(emptyAdminProblem);
  const [baseline,setBaseline] = useState("");
  const [tagsText,setTagsText] = useState("");
  const [acceptedText,setAcceptedText] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const copy = !problemId ? new URLSearchParams(location.search).get("copy") : null;
        let next: AdminProblem;
        if (problemId || copy) {
          next = await api<AdminProblem>("admin/problems/" + encodeURIComponent(problemId || copy!));
          if (copy) next = {...next, id: "custom-" + crypto.randomUUID(), publication_status: "draft", verification_status: "unreviewed"};
        } else {
          await api("admin/problems");
          next = {...emptyAdminProblem(), id: "custom-" + crypto.randomUUID()};
        }
        if (active) { setProblem(next); setBaseline(JSON.stringify(next)); setTagsText(next.topic_tags.join(", ")); setAcceptedText((next.accepted_answers ?? [next.correct_answer]).join("\n")); }
      } catch (e) { if (active) setError((e as Error).message); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [problemId]);
  function update(patch: Partial<AdminProblem>) { setProblem(previous => ({...previous,...patch})); if (patch.accepted_answers) setAcceptedText(patch.accepted_answers.join("\n")); setMessage(""); }
  const formProblem = {...problem, topic_tags:tagsText.split(",").map(tag => tag.trim()).filter(Boolean), accepted_answers:acceptedText.split("\n").map(answer => answer.trim()).filter(Boolean)};
  async function upload(field: "source_image_path" | "figure_image_path", file?: File) {
    if (!file || !supabase || busy) return;
    const ext = {"image/png":"png","image/jpeg":"jpg","image/webp":"webp"}[file.type];
    if (!ext || file.size > 10*1024*1024) { setMessage("Choose PNG, JPG or WebP up to 10 MB."); return; }
    setBusy(true);
    try {
      const path = `${crypto.randomUUID()}.${ext}`;
      const {error} = await supabase.storage.from("problem-admin-images").upload(path,file,{contentType:file.type,upsert:false});
      if (error) throw error;
      update({[field]:supabase.storage.from("problem-admin-images").getPublicUrl(path).data.publicUrl});
      setMessage("Image uploaded. Save the problem to apply it.");
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = adminProblemSchema.safeParse({...formProblem, accepted_answers: formProblem.accepted_answers.length ? formProblem.accepted_answers : [problem.correct_answer]});
    if (!parsed.success) { setMessage(parsed.error.issues.map(issue => `${issue.path.join(".") || "Problem"}: ${issue.message}`).join("\n")); return; }
    setBusy(true); setMessage("");
    try {
      const saved = await api<AdminProblem>("admin/problems" + (problemId ? "/"+encodeURIComponent(problemId) : ""), parsed.data, problemId ? "PUT" : "POST");
      setProblem(saved); setBaseline(JSON.stringify(saved));
      setTagsText(saved.topic_tags.join(", ")); setAcceptedText((saved.accepted_answers ?? [saved.correct_answer]).join("\n"));
      await reload();
      notify(saved.publication_status === "published" ? "Problem published." : "Draft saved.");
      if (onSaved) onSaved(saved);
      else router.replace("/admin/problems/" + encodeURIComponent(saved.id));
    } catch (e) { setMessage((e as Error).message); }
    finally { setBusy(false); }
  }
  if (loading) return <Loading />;
  if (error) return <section className="panel p-8"><p role="alert">{error}</p><Link className="btn-secondary mt-4" href="/problems">Back to problems</Link></section>;
  const changed = baseline !== JSON.stringify(formProblem);
  return <>
    <PageTitle eyebrow="ADMINISTRATION" title={problemId ? "Edit problem" : "Create problem"} description="Save a private draft or publish a reviewed problem. Use $...$ for inline math and $$...$$ for display math." />
    <div className="mb-5 flex flex-wrap gap-3"><Link className="btn-secondary" href="/admin/problems">All managed problems</Link>{problemId && <Link className="btn-secondary" href={"/admin/problems/new?copy="+encodeURIComponent(problemId)}>Create a revised copy</Link>}</div>
    {problemId && <p className="mb-5 text-sm muted">If this problem has practice sessions or belongs to a contest, create a revised copy to change its question, images or answers. You can still edit its title, classification and solution.</p>}
    <form onSubmit={save}><fieldset disabled={busy} className="space-y-5">
      <section className="panel grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-sm">Problem ID<input required disabled={!!problemId} className="field mt-2" value={problem.id} onChange={e => update({id:e.target.value})} /></label>
        <label className="text-sm">Title<input required maxLength={160} className="field mt-2" value={problem.title} onChange={e => update({title:e.target.value})} /></label>
        <label className="text-sm">Source / collection<input required className="field mt-2" value={problem.contest_name} onChange={e => update({contest_name:e.target.value})} /></label>
        <label className="text-sm">Question number<input required type="number" min={1} className="field mt-2" value={problem.question_number} onChange={e => update({question_number:Number(e.target.value)})} /></label>
        <label className="text-sm">Category<select className="field mt-2" value={problem.category} onChange={e => update({category:e.target.value})}>{[...new Set([...CATEGORIES,problem.category])].map(name => <option key={name}>{name}</option>)}</select></label>
        <label className="text-sm">Topic tags (comma separated)<input className="field mt-2" value={tagsText} onChange={e => setTagsText(e.target.value)} /></label>
        <label className="text-sm">Difficulty<select className="field mt-2" value={problem.difficulty} onChange={e => update({difficulty:e.target.value as AdminProblem["difficulty"]})}>{["Easy","Medium","Hard"].map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-sm">Problem rating<input type="number" min={0} className="field mt-2" value={problem.difficulty_rating ?? ""} onChange={e => update({difficulty_rating:e.target.value === "" ? null : Number(e.target.value)})} /></label>
        <label className="text-sm sm:col-span-2">Difficulty explanation<input className="field mt-2" value={problem.difficulty_rationale ?? ""} onChange={e => update({difficulty_rationale:e.target.value})} /></label>
      </section>
      <section className="panel space-y-4 p-5"><h2 className="font-semibold">Question</h2>
        <label className="block text-sm">Question text / math<textarea required rows={5} className="field mt-2" value={problem.question_latex} onChange={e => update({question_latex:e.target.value})} /></label>
        <div className="rounded-xl bg-white p-4 text-zinc-900"><MathRenderer text={problem.question_latex || "Question preview"} /></div>
        {(["source_image_path","figure_image_path"] as const).map(field => <div key={field} className="space-y-2">
          <label className="block text-sm">{field === "source_image_path" ? "Original question image (optional)" : "Diagram image (optional)"}<input className="field mt-2" value={problem[field] ?? ""} onChange={e => update({[field]:e.target.value || null})} /></label>
          <input aria-label={field === "source_image_path" ? "Upload question image" : "Upload diagram"} type="file" accept="image/png,image/jpeg,image/webp" className="field" onChange={e => { void upload(field,e.target.files?.[0]); e.target.value=""; }} />
          {problem[field] && <img className="max-h-64 rounded-xl bg-white object-contain" src={problem[field]!} alt="Problem image preview" />}
        </div>)}
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={problem.figure_required} onChange={e => update({figure_required:e.target.checked})} />Diagram required</label>
      </section>
      <section className="panel space-y-4 p-5"><h2 className="font-semibold">Answers and solution</h2>
        <label className="block text-sm">Answer format<select className="field mt-2" value={problem.answer_format ?? "multiple_choice"} onChange={e => {
          const format = e.target.value as AdminProblem["answer_format"];
          update({answer_format:format, options:format === "short_answer" ? [] : emptyAdminProblem().options, correct_answer:format === "short_answer" ? "" : "A", accepted_answers:[]});
        }}><option value="multiple_choice">Multiple choice</option><option value="short_answer">Short answer</option></select></label>
        {problem.options.map((option,index) => <div key={option.label} className="flex items-center gap-3"><label className="grow text-sm">Option {option.label}<input required className="field mt-1" value={option.text} onChange={e => update({options:problem.options.map((o,i) => i === index ? {...o,text:e.target.value} : o)})} /></label><button type="button" disabled={problem.options.length <= 2} className="btn-secondary" onClick={() => { const options = problem.options.filter((_,i) => i !== index); update({options, ...(option.label === problem.correct_answer ? {correct_answer:options[0].label,accepted_answers:[options[0].label]} : {})}); }}>Remove {option.label}</button></div>)}
        {problem.answer_format !== "short_answer" && problem.options.length < 5 && <button type="button" className="btn-secondary" onClick={() => { const label = "ABCDE".split("").find(value => !problem.options.some(o => o.label === value))!; update({options:[...problem.options,{label:label as "A",text:""}].sort((a,b) => a.label.localeCompare(b.label))}); }}>Add option</button>}
        <label className="block text-sm">Correct answer{problem.answer_format === "short_answer" ? <input required maxLength={80} className="field mt-2" value={problem.correct_answer} onChange={e => update({correct_answer:e.target.value,accepted_answers:[e.target.value]})} /> : <select className="field mt-2" value={problem.correct_answer} onChange={e => update({correct_answer:e.target.value,accepted_answers:[e.target.value]})}>{problem.options.map(o => <option key={o.label}>{o.label}</option>)}</select>}</label>
        <label className="block text-sm">Accepted answers (one per line)<textarea rows={2} className="field mt-2" value={acceptedText} onChange={e => setAcceptedText(e.target.value)} /></label>
        <label className="block text-sm">Grading policy<select className="field mt-2" value={problem.grading_policy ?? "standard"} onChange={e => update({grading_policy:e.target.value as AdminProblem["grading_policy"]})}><option value="standard">Standard</option><option value="no_penalty">No penalty for wrong answers</option><option value="credit_all">Credit everyone</option></select></label>
        <label className="block text-sm">Written solution<textarea rows={6} className="field mt-2" value={problem.written_solution ?? ""} onChange={e => update({written_solution:e.target.value || null})} /></label>
        {problem.written_solution && <div className="rounded-xl bg-white p-4 text-zinc-900"><MathRenderer text={problem.written_solution} /></div>}
      </section>
      <section className="panel grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-sm">Review status<select className="field mt-2" value={problem.verification_status} onChange={e => update({verification_status:e.target.value as AdminProblem["verification_status"]})}><option value="unreviewed">Unreviewed</option><option value="answer_verified">Answer verified against source key</option><option value="fully_verified">Answer and solution reviewed</option></select></label>
        <label className="text-sm">Visibility<select className="field mt-2" value={problem.publication_status} onChange={e => update({publication_status:e.target.value as AdminProblem["publication_status"]})}><option value="draft">Private draft</option><option value="published">Published</option></select></label>
        <label className="text-sm">Source question reference (optional)<input className="field mt-2" value={problem.source_question_file ?? ""} onChange={e => update({source_question_file:e.target.value || null})} /></label>
        <label className="text-sm">Verified answer key reference (optional)<input className="field mt-2" value={problem.source_answer_key_file ?? ""} onChange={e => update({source_answer_key_file:e.target.value || null})} /></label>
      </section>
      <div className="flex gap-3"><button className="btn" disabled={!!problemId && !changed}>{busy ? "Saving…" : problem.publication_status === "published" ? "Save and publish" : "Save draft"}</button><button type="button" className="btn-secondary" disabled={!changed} onClick={() => {const original: AdminProblem = JSON.parse(baseline);setProblem(original);setTagsText(original.topic_tags.join(", "));setAcceptedText((original.accepted_answers ?? [original.correct_answer]).join("\n"));setMessage("");}}>Discard changes</button></div>
    </fieldset></form>
    {message && <p role="alert" className="mt-5 whitespace-pre-line text-sm">{message}</p>}
  </>;
}
