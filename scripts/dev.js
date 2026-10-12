#!/usr/bin/env node
/**
 * Run backend and frontend dev servers concurrently in a single terminal.
 *
 *   npm run dev
 *
 * Backend -> http://localhost:8000  (Express, --watch)
 * Frontend -> http://localhost:3000 (Vite, proxies /api and /health to 8000)
 *
 * Press Ctrl+C to stop both.
 */
const { spawn } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const children = [];

function resolveCommand(base) {
  return base === "npm" && isWindows ? "npm.cmd" : base;
}

function spawnProcess(label, cwd, command, args) {
  const child = spawn(resolveCommand(command), args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: "1" },
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    console.log(`\n[dev] ${label} exited with code ${code}.`);
    shutdown();
  });

  children.push(child);
}

function shutdown() {
  for (const child of children) {
    try {
      if (isWindows && child.pid) {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        child.kill("SIGTERM");
      }
    } catch {
      /* process already gone */
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("[dev] Starting backend  -> http://localhost:8000");
console.log("[dev] Starting frontend -> http://localhost:3000");
console.log("[dev] Press Ctrl+C to stop both.\n");

spawnProcess("backend", path.join(ROOT, "backend"), "npm", ["run", "dev"]);
spawnProcess("frontend", path.join(ROOT, "frontend"), "npm", ["run", "dev"]);
