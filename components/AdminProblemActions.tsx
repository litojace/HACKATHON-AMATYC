"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "./Providers";
import { supabase } from "@/lib/supabaseClient";
import AdminAnnouncementComposer from "./AdminAnnouncementComposer";

export default function AdminProblemActions({problemId, profileUserId, contests = false}: {problemId?: string; profileUserId?: string;contests?:boolean}) {
  const { user, authLoading } = useApp();
  const userId=user?.id;
  const [adminId, setAdminId] = useState<string | null>(null);
  useEffect(() => {
    if (!userId || authLoading || !supabase || (profileUserId && profileUserId !== userId)) return;
    let active = true;
    Promise.resolve(supabase.rpc("is_site_admin")).then(({data,error}) => {
      if (active) setAdminId(!error && data === true ? userId : null);
    }).catch(() => { if (active) setAdminId(null); });
    return () => { active = false; };
  }, [userId, authLoading, profileUserId]);
  if (authLoading || !user || adminId !== user.id || (profileUserId && profileUserId !== user.id)) return null;
  if (profileUserId) return <><nav aria-label="Admin management" className="mt-6 flex flex-wrap gap-3 border-t border-edge pt-6">
    <Link className="btn-secondary" href="/admin/users">Manage user ratings</Link>
    <Link className="btn-secondary" href="/admin/carousel">Manage carousel</Link>
    <Link className="btn-secondary" href="/admin/problems">Manage problems</Link>
    <Link className="btn-secondary" href="/admin/contests">Manage contests</Link>
  </nav><AdminAnnouncementComposer /></>;
  if (contests) return <div className="my-4 flex flex-wrap gap-3"><Link className="btn-secondary" href="/admin/contests">Manage contests</Link><Link className="btn" href="/admin/contests/new">Create contest</Link></div>;
  return <div className="my-4 flex flex-wrap gap-3">
    {problemId ? <Link className="btn-secondary" href={"/admin/problems/" + encodeURIComponent(problemId)}>Edit problem</Link> : <Link className="btn-secondary" href="/admin/problems">Manage problems</Link>}
    <Link className="btn" href="/admin/problems/new">Create problem</Link>
  </div>;
}
