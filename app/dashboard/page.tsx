"use client";
import { useApp } from "@/components/Providers";
import { AccountGate, Loading } from "@/components/Shared";
import DashboardContent from "@/components/DashboardContent";
import { dashboardActivity } from "@/lib/dashboard";
export default function Dashboard() {
  const { activity, problems, profile, demo, loading } = useApp();
  return <main className="mx-auto max-w-7xl px-5 py-10"><AccountGate>
    {loading ? <Loading /> : <DashboardContent activity={dashboardActivity(activity)} problems={problems} profile={profile} demo={demo} />}
  </AccountGate></main>;
}
