"use client";
import { useParams } from "next/navigation";
import AdminProblemEditor from "@/components/AdminProblemEditor";
export default function EditProblem() {
  const {id} = useParams<{id:string}>();
  return <AdminProblemEditor key={id} problemId={id} />;
}
