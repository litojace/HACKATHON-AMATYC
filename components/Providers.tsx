"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { User } from "@supabase/supabase-js";
import type {
  Profile,
  PublicProblem,
  Activity,
  PracticeResult,
  ExamAttempt,
} from "@/types/problem";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { api } from "@/lib/client";
const empty: Activity = {
  practice: [],
  contests: [],
  ratings: [],
  bookmarks: [],
};
interface State {
  user: User | null;
  profile: Profile | null;
  problems: PublicProblem[];
  activity: Activity;
  loading: boolean;
  authLoading: boolean;
  error: string;
  demo: boolean;
  notice: string;
  notify: (text: string) => void;
  reload: () => Promise<void>;
  savePractice: (p: PracticeResult) => void;
  saveExam: (p: ExamAttempt) => void;
  bookmark: (id: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
}
const Context = createContext<State>(null as unknown as State);
export const useApp = () => useContext(Context);
export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [problems, setProblems] = useState<PublicProblem[]>([]),
    [activity, setActivity] = useState<Activity>(empty),
    [loading, setLoading] = useState(true),
    [authLoading, setAuthLoading] = useState(!!supabase),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [localLoaded, setLocalLoaded] = useState(false);
  const demo = !supabaseConfigured;
  useEffect(()=>{
    if(!user||!supabase)return;
    const client=supabase;let pending=false;
    async function heartbeat(){
      if(document.visibilityState!=='visible'||pending)return;
      pending=true;
      try{await client.rpc("record_presence");}catch{/* Presence retries on the next heartbeat. */}finally{pending=false;}
    }
    void heartbeat();const timer=setInterval(heartbeat,30000);
    document.addEventListener('visibilitychange',heartbeat);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',heartbeat);};
  },[user]);
  const notify = useCallback((t: string) => setNotice(t), []);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProblems(await api<PublicProblem[]>("problems"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  const refreshAccount = useCallback(async () => {
    if (!supabase) return;
    try {
      const [p, a, library] = await Promise.allSettled([
        api<Profile>("me"),
        api<Activity>("activity"),
        api<PublicProblem[]>("problems"),
      ]);
      if (p.status === "fulfilled") setProfile(p.value);
      else throw p.reason;
      if (a.status === "fulfilled") setActivity(a.value);
      else notify((a.reason as Error).message);
      if (library.status === "fulfilled") setProblems(library.value);
      else notify((library.reason as Error).message);
    } catch (e) {
      notify((e as Error).message);
    }
  }, [notify]);
  useEffect(() => {
    reload();
    if (demo) {
      try {
        const raw = localStorage.getItem("amatyc-demo-activity-v2");
        if (raw) {
          const a = JSON.parse(raw);
          if (
            Array.isArray(a.practice) &&
            Array.isArray(a.contests) &&
            Array.isArray(a.bookmarks)
          )
            setActivity({ ...empty, ...a });
        }
      } catch {
        notify(
          "Browser storage is unavailable; demo activity will not survive a refresh.",
        );
      }
      setLocalLoaded(true);
    }
  }, [reload, demo, notify]);
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    client.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data } = client.auth.onAuthStateChange((_event, s) => {
      setUser(s?.user ?? null);
      setAuthLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (user) refreshAccount();
    else if (!demo) {
      setProfile(null);
      setActivity(empty);
    }
  }, [user, demo, refreshAccount]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  const update = useCallback(
    (updater: (previous: Activity) => Activity) => setActivity(updater),
    [],
  );
  useEffect(() => {
    if (demo && localLoaded)
      try {
        localStorage.setItem(
          "amatyc-demo-activity-v2",
          JSON.stringify(activity),
        );
      } catch {
        notify(
          "Activity saved for this session only; browser storage is unavailable.",
        );
      }
  }, [demo, localLoaded, activity, notify]);
  const savePractice = useCallback(
    (p: PracticeResult) => {
      if (demo)
        update((previous) => ({
          ...previous,
          practice: [p, ...previous.practice.filter((a) => a.id !== p.id)],
        }));
      else refreshAccount();
    },
    [demo, update, refreshAccount],
  );
  const saveExam = useCallback(
    (p: ExamAttempt) => {
      if (demo)
        update((previous) => ({
          ...previous,
          contests: [p, ...previous.contests.filter((a) => a.id !== p.id)],
        }));
      else refreshAccount();
    },
    [demo, update, refreshAccount],
  );
  async function bookmark(id: string) {
    if (!demo && !user) {
      notify("Sign in to save bookmarks.");
      return;
    }
    const saved = !activity.bookmarks.includes(id);
    try {
      if (!demo) await api("bookmarks/" + id, { saved });
      update((previous) => ({
        ...previous,
        bookmarks: saved
          ? [...new Set([...previous.bookmarks, id])]
          : previous.bookmarks.filter((p) => p !== id),
      }));
      notify(saved ? "Bookmark saved" : "Bookmark removed");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <Context.Provider
      value={{
        user,
        profile,
        problems,
        activity,
        loading,
        authLoading,
        error,
        demo,
        notice,
        notify,
        reload,
        savePractice,
        saveExam,
        bookmark,
        refreshAccount,
      }}
    >
      {children}
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 w-[min(90%,480px)] -translate-x-1/2 rounded-xl border border-emerald-500/40 bg-panel p-4 text-sm shadow-xl"
        >
          {notice}
        </div>
      )}
    </Context.Provider>
  );
}
