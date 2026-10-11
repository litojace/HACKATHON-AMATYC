"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "./Providers";
import { supabase } from "@/lib/supabaseClient";

export default function AdminProblemActions({problemId}: {problemId?: string}) {
  const { user, authLoading } = useApp();
  const [adminId, setAdminId] = useState<string | null>(null);
  useEffect(() => {
    if (!user || authLoading || !supabase) return;
    let active = true;
    Promise.resolve(supabase.rpc("is_site_admin")).then(({data,error}) => {
      if (active) setAdminId(!error && data === true ? user.id : null);
    }).catch(() => { if (active) setAdminId(null); });
    return () => { active = false; setAdminId(null); };
  }, [user, authLoading]);
  if (authLoading || !user || adminId !== user.id) return null;
  return <div className="my-4 flex flex-wrap gap-3">
    {problemId ? <Link className="btn-secondary" href={"/admin/problems/" + encodeURIComponent(problemId)}>Edit problem</Link> : <Link className="btn-secondary" href="/admin/problems">Manage problems</Link>}
    <Link className="btn" href="/admin/problems/new">Create problem</Link>
  </div>;
}
