import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import "@fontsource-variable/inter";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
export const metadata: Metadata = {
  title: "AMATYC Code — Train your mathematical edge",
  description:
    "Math competition practice, calculator strategies, and timed mock exams for college students.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          {children}
          <footer className="mx-auto mt-16 flex max-w-7xl flex-wrap justify-between gap-3 border-t border-edge px-5 py-6 text-xs text-slate-500">
            <span>AMATYC code · Built for the next problem.</span>
            <span>
              Independent training platform · Not affiliated with AMATYC
            </span>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
