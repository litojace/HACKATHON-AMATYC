import { cp } from "node:fs/promises";
await cp("public", ".next/standalone/public", { recursive: true });
await cp(".next/static", ".next/standalone/.next/static", { recursive: true });
