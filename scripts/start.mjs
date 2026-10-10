import { spawn } from "node:child_process";
const child = spawn(process.execPath, [".next/standalone/server.js"], {
  stdio: "inherit",
  env: { ...process.env, HOSTNAME: "0.0.0.0" },
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
