import { spawn } from "node:child_process";
await import("./local-setup.mjs");
const server = spawn(process.execPath, ["--watch", "server/index.mjs"], {
  stdio: "inherit",
});
const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
  stdio: "inherit",
});
function stop() {
  server.kill();
  vite.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
