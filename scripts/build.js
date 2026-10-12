#!/usr/bin/env node
/**
 * Build the frontend and copy the production output into backend/public,
 * which is the directory Express serves in production.
 *
 *   npm run build
 *   npm start          -> http://localhost:8000
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const frontendDist = path.join(ROOT, "frontend", "dist");
const backendPublic = path.join(ROOT, "backend", "public");

function run(cmd, args, cwd) {
  const bin = cmd === "npm" && process.platform === "win32" ? "npm.cmd" : cmd;
  const result = spawnSync(bin, args, { cwd, stdio: "inherit", env: process.env });
  if (result.error) {
    console.error(`\n[build] Failed to run ${cmd}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n[build] ${cmd} exited with code ${result.status}.`);
    process.exit(1);
  }
}

console.log("[build] Building frontend (vite build)...");
run("npm", ["run", "build"], path.join(ROOT, "frontend"));

if (!fs.existsSync(frontendDist)) {
  console.error(`\n[build] Expected build output at ${frontendDist} but it was not found.`);
  process.exit(1);
}

console.log("[build] Copying frontend/dist -> backend/public ...");
fs.cpSync(frontendDist, backendPublic, { recursive: true });

console.log('\n[build] Done. Run "npm start" to serve the app at http://localhost:8000');
