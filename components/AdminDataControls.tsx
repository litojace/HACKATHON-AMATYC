"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

type Member = { id: string; username: string; full_name: string };
type Action = { kind: "progress" | "community" | "delete"; member?: Member };
export default function AdminDataControls({ member, currentUserId, onComplete }: {
  member?: Member; currentUserId?: string; onComplete: () => Promise<void>;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const phraseInput = useRef<HTMLInputElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const requestInFlight = useRef(false);
  const expected = action?.kind === "delete" ? `DELETE ${action.member?.full_name.trim() || action.member?.username}` : action?.kind === "progress" ? "RESET PROGRESS" : "CLEAR BOOKMARKS AND REPORTS";
  const title = action?.kind === "delete" ? `Delete ${action.member?.full_name}'s account?` : action?.kind === "progress" ? "Reset everyone's progress?" : "Clear everyone's bookmarks and reports?";
  useEffect(() => {
    if (action && !dialog.current?.open) dialog.current?.showModal();
    if (!action && dialog.current?.open) dialog.current.close();
  }, [action]);
  function begin(next: Action) { setCopyStatus(""); setConfirmation(""); setReason(""); setMessage(""); setFailed(false); setAction(next); }
  async function execute(event: React.FormEvent) {
    event.preventDefault();
    if (!action || requestInFlight.current || confirmation !== expected || !reason.trim()) return;
    requestInFlight.current = true; setBusy(true); setMessage("");
    try {
      const body = { confirmation, reason: reason.trim(), scope: action.kind };
      await api(action.kind === "delete" ? `admin/users/${action.member!.id}` : "admin/reset", body, action.kind === "delete" ? "DELETE" : "POST");
      setFailed(false);
      setMessage(action.kind === "delete" ? "Account deleted." : action.kind === "progress" ? "Progress reset. Everyone now starts at 800; acceptance statistics and solved status have been cleared." : "Bookmarks and reports cleared. Progress and ratings were kept.");
      setAction(null);
      try { await onComplete(); } catch { setMessage(previous => previous + " Refresh this page to load the updated records."); }
    } catch (error) { setFailed(true); setMessage((error as Error).message); }
    finally { requestInFlight.current = false; setBusy(false); }
  }
  return <section className="panel mt-6 p-6">
    <h2 className="text-xl font-semibold">Data controls</h2>
    <p className="mt-2 text-sm muted">These actions permanently remove data. Each requires a separate confirmation and reason.</p>
    <div className="mt-5 space-y-5">
      <div><h3 className="font-semibold">Reset progress and rankings</h3><p className="my-2 text-sm muted">For all users, clear practice and exam attempts, solved status, acceptance statistics, and rating history. Reset ratings to 800 and rated event counts to zero. Keep accounts, problems, contests, bookmarks, and reports.</p><button className="btn-secondary" disabled={busy} onClick={() => begin({kind:"progress"})}>Reset progress</button></div>
      <div><h3 className="font-semibold">Clear bookmarks and reports</h3><p className="my-2 text-sm muted">Remove all saved bookmarks and problem reports. Keep ratings, test results, accounts, and site content.</p><button className="btn-secondary" disabled={busy} onClick={() => begin({kind:"community"})}>Clear bookmarks and reports</button></div>
      <div><h3 className="font-semibold">Delete selected account</h3><p className="my-2 text-sm muted">Permanently delete {member?.full_name ?? "the selected user"}'s login, profile, attempts, rating history, bookmarks, and reports. Your own administrator account cannot be deleted here. Shared problem images and site content remain.</p><button className="btn-secondary text-red-400" disabled={busy || !member || member.id===currentUserId} onClick={() => member && begin({kind:"delete",member})}>Delete account</button></div>
    </div>
    {message && !action && <p role={failed ? "alert" : "status"} className={`mt-5 text-sm ${failed ? "text-red-400" : "text-[var(--success)]"}`}>{message}</p>}
    <dialog ref={dialog} aria-labelledby="data-confirm-title" aria-describedby="data-confirm-description" className="panel m-auto w-[calc(100%-2rem)] max-w-lg p-6 text-[var(--text)] backdrop:bg-black/75"
      onCancel={event => { if (busy) event.preventDefault(); else setAction(null); }}>
      <form onSubmit={execute}>
        <h2 id="data-confirm-title" className="text-xl font-semibold">{title}</h2>
        <p id="data-confirm-description" className="mt-3 text-sm muted">This cannot be undone from the website. Make sure you have a database backup before continuing.</p>
        <p className="mt-3 text-sm">{action?.kind === "progress" ? "All users lose their practice/test results and rating history. Ratings return to 800. Accounts, problems, contests, bookmarks, and reports stay." : action?.kind === "community" ? "All users’ bookmarks and problem reports will be deleted. Ratings and test results stay." : "This user’s login and profile will be removed, together with their attempts, bookmarks, reports, and rating history."}</p>
        <fieldset disabled={busy} className="mt-5 space-y-4">
          <label className="block text-sm">Reason<textarea className="field mt-2" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></label>
          <div>
            <p className="mb-2 text-sm">Type this phrase to confirm:</p>
            <div className="flex gap-2"><input ref={phraseInput} className="field min-w-0 flex-1 select-text" aria-label="Confirmation phrase" readOnly value={expected} onFocus={event => event.currentTarget.select()} /><button type="button" className="btn-secondary" onClick={async () => { try { await navigator.clipboard.writeText(expected); setCopyStatus("Copied."); } catch { phraseInput.current?.focus(); phraseInput.current?.select(); setCopyStatus("Phrase selected. Use your device’s copy command."); } }}>Copy</button></div>
            {copyStatus && <p className="mt-1 text-xs muted" role="status">{copyStatus}</p>}
          </div>
          <label className="block text-sm">Confirmation<input className="field mt-2" aria-label="Confirmation" autoComplete="off" spellCheck={false} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
          <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" onClick={() => setAction(null)}>Cancel</button><button type="submit" className="btn !bg-red-600 !text-white" disabled={confirmation!==expected || !reason.trim()}>{busy ? "Processing…" : "Confirm permanently"}</button></div>
        </fieldset>
        {message && action && <p role="alert" className="mt-4 text-sm text-red-400">{message}</p>}
      </form>
    </dialog>
  </section>;
}
