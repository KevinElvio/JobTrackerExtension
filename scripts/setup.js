#!/usr/bin/env node
/**
 * Bootstrap script for a fresh clone.
 * Cross-platform: works on macOS, Linux and Windows (cmd / PowerShell).
 *
 *   npm run setup
 *
 * Steps:
 *   1. Verify Node.js >= 18
 *   2. Create backend/.env from backend/.env.example (skipped if it already exists)
 *   3. Install backend dependencies
 *   4. Install frontend dependencies
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MIN_NODE_MAJOR = 18;

function fail(message) {
  console.error("\n[setup] " + message);
  process.exit(1);
}

function run(cmd, args, cwd) {
  const bin = cmd === "npm" && process.platform === "win32" ? "npm.cmd" : cmd;
  const result = spawnSync(bin, args, { cwd, stdio: "inherit", env: process.env });
  if (result.error) {
    fail(`Failed to run "${cmd} ${args.join(" ")}": ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`Command "${cmd} ${args.join(" ")}" exited with code ${result.status}.`);
  }
}

function ensureEnvFile() {
  const envPath = path.join(ROOT, "backend", ".env");
  const examplePath = path.join(ROOT, "backend", ".env.example");

  if (fs.existsSync(envPath)) {
    console.log("[setup] backend/.env already exists, skipping.");
    return;
  }
  if (!fs.existsSync(examplePath)) {
    fail("backend/.env.example not found. Cannot create backend/.env.");
  }
  fs.copyFileSync(examplePath, envPath);
  console.log("[setup] Created backend/.env from backend/.env.example");
}

function install(dir) {
  const cwd = path.join(ROOT, dir);
  const useCi = fs.existsSync(path.join(cwd, "package-lock.json"));
  const args = useCi
    ? ["ci", "--no-audit", "--no-fund"]
    : ["install", "--no-audit", "--no-fund"];
  console.log(`[setup] Installing ${dir} dependencies (${useCi ? "npm ci" : "npm install"})...`);
  run("npm", args, cwd);
}

function main() {
  const [major] = process.versions.node.split(".").map(Number);
  if (!major || major < MIN_NODE_MAJOR) {
    fail(`Node.js >= ${MIN_NODE_MAJOR} is required. Found v${process.versions.node}.`);
  }
  console.log(`[setup] Node.js v${process.versions.node}`);

  ensureEnvFile();
  install("backend");
  install("frontend");

  console.log(`[setup] Done.

Next steps:
  Docker (recommended):
    docker compose up -d --build
    then open http://localhost:8000

  Manual (no Docker):
    npm run dev                 -> http://localhost:3000 (dev, hot reload)
    npm run build && npm start -> http://localhost:8000 (production)
`);
}

main();
