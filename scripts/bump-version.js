#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT_PKG = path.join(__dirname, "..", "package.json");
const CLIENT_PKG = path.join(__dirname, "..", "client", "package.json");

function bumpVersion(current, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) {
    throw new Error(`Cannot parse version "${current}" (expected x.y.z)`);
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  if (type === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump type: ${type}`);
}

// Conventional-commit style detection: "BREAKING CHANGE" anywhere in the
// message, or a "major:"/"feat!:" subject, means a major bump; a plain
// "feat:" subject means minor; everything else (fix:, chore:, docs:, or no
// prefix at all) is treated as a patch-level change.
function detectBumpType(commitMessage) {
  const subject = commitMessage.split("\n")[0];
  if (
    /BREAKING CHANGE/i.test(commitMessage) ||
    /^major:/i.test(subject) ||
    /^feat(\(.+\))?!:/i.test(subject)
  ) {
    return "major";
  }
  if (/^feat(\(.+\))?:/i.test(subject)) {
    return "minor";
  }
  return "patch";
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function applyBump(type, { rootPkgPath = ROOT_PKG, clientPkgPath = CLIENT_PKG } = {}) {
  const rootPkg = readJson(rootPkgPath);
  const newVersion = bumpVersion(rootPkg.version, type);
  rootPkg.version = newVersion;
  writeJson(rootPkgPath, rootPkg);

  if (fs.existsSync(clientPkgPath)) {
    const clientPkg = readJson(clientPkgPath);
    clientPkg.version = newVersion;
    writeJson(clientPkgPath, clientPkg);
  }

  return newVersion;
}

function main() {
  const args = process.argv.slice(2);
  const type = args[0] === "--from-commit-message" ? detectBumpType(args[1] || "") : args[0];

  if (!["major", "minor", "patch"].includes(type)) {
    console.error(
      'Usage: node scripts/bump-version.js <major|minor|patch> | --from-commit-message "<message>"'
    );
    process.exit(1);
  }

  console.log(applyBump(type));
}

if (require.main === module) {
  main();
}

module.exports = { bumpVersion, detectBumpType, applyBump };
