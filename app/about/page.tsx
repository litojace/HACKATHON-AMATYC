import type { Metadata } from "next";
import AboutUs from "@/components/AboutUs";
import { PageTitle } from "@/components/Shared";

export const metadata: Metadata = {
  title: "About us — AMATYC Arena",
  description: "Meet the OCC MAT community behind AMATYC Arena and learn about the Student Math League.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <PageTitle eyebrow="THE OCC MAT COMMUNITY" title="About AMATYC Arena" description="Built by OCC MAT members to help students practice, learn, and compete together." />
      <AboutUs />
    </main>
  );
}
