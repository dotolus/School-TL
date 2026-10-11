#!/usr/bin/env node
// PreToolUse hook (Bash, filtered to `git push` in .claude/settings.json):
// runs ESLint and blocks the push if it fails.
const { execSync } = require("child_process");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");

let output = "";
let failed = false;
try {
  output = execSync("npm run --silent lint", { cwd: repoRoot, encoding: "utf8" });
} catch (err) {
  failed = true;
  output = `${err.stdout || ""}${err.stderr || ""}`;
}

if (failed) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `ESLint found problems - fix them before pushing:\n\n${output.slice(0, 4000)}`,
      },
    })
  );
}
