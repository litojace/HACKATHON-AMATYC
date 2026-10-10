import { redirect } from "next/navigation";
export default function LegacyAuth() {
  redirect("/login");
}
