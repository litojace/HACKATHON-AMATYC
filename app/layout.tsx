import type { Metadata } from "next";
import Image from "next/image";
import "katex/dist/katex.min.css";
import "./globals.css";
import "@fontsource-variable/inter";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
export const metadata: Metadata = {
  title: "AMATYC Arena — Train your mathematical edge",
  description:
    "Math competition practice, mathematical solutions, and timed mock exams for college students.",
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
          <footer className="mx-auto mt-16 max-w-7xl border-t border-edge px-5 py-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Image
                  src="/images/amatyc-logo.png"
                  alt="AMATYC logo"
                  width={72}
                  height={79}
                  className="h-16 w-auto rounded-lg"
                />
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">
                    AMATYC Arena
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Built To Push Your Limits
                  </p>
                </div>
              </div>
              <nav aria-label="Social media" className="flex flex-wrap gap-3">
                <a
                  href="https://www.instagram.com/mat_occ/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-button social-instagram"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
                  </svg>
                  Instagram
                </a>
                <a
                  href="https://discord.gg/8xN546mwQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-button social-discord"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M19.7 5.2a18 18 0 0 0-4.4-1.4l-.5 1a16.7 16.7 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.4C1.5 9.3.7 13.3 1.1 17.3a18 18 0 0 0 5.4 2.7l1.2-2a11 11 0 0 1-1.9-.9l.5-.4a12.8 12.8 0 0 0 11.4 0l.5.4a11 11 0 0 1-1.9.9l1.2 2a18 18 0 0 0 5.4-2.7c.5-4.7-.8-8.6-3.2-12.1ZM8.8 14.7c-1.1 0-2-.9-2-2.1s.9-2.1 2-2.1 2 .9 2 2.1-.9 2.1-2 2.1Zm6.4 0c-1.1 0-2-.9-2-2.1s.9-2.1 2-2.1 2 .9 2 2.1-.9 2.1-2 2.1Z" />
                  </svg>
                  Discord
                </a>
              </nav>
            </div>

          </footer>
        </Providers>
      </body>
    </html>
  );
}
