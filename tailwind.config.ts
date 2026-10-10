import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: "var(--ink)", panel: "var(--panel)", edge: "var(--edge)" },
      fontFamily: { sans: ["Arial", "Helvetica", "sans-serif"] },
    },
  },
  plugins: [],
} satisfies Config;
