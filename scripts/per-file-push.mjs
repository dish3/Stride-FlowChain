import { execFileSync } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const requestedFiles = args.filter((arg) => arg !== "--dry-run");

function git(args, options = {}) {
  const command = ["git", ...args].join(" ");

  if (isDryRun && options.mutates) {
    console.log(`[dry-run] ${command}`);
    return "";
  }

  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : ["ignore", "pipe", "pipe"],
  }).trim();
}

function quotePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function statusEntries() {
  const output = git(["status", "--porcelain=v1", "-z", "-uall"]);
  if (!output) return [];

  const parts = output.split("\0").filter(Boolean);
  const entries = [];

  for (let i = 0; i < parts.length; i += 1) {
    const item = parts[i];
    const status = item.slice(0, 2);
    const file = item.slice(3);

    if (status.includes("R") || status.includes("C")) {
      const source = parts[i + 1];
      i += 1;
      entries.push({ status, file, source });
      continue;
    }

    entries.push({ status, file });
  }

  return entries;
}

function normalize(filePath) {
  return quotePath(path.normalize(filePath));
}

function changedEntries() {
  const requested = new Set(requestedFiles.map(normalize));

  return statusEntries().filter((entry) => {
    if (requested.size === 0) return true;

    const file = normalize(entry.file);
    const source = entry.source ? normalize(entry.source) : null;
    return requested.has(file) || (source ? requested.has(source) : false);
  });
}

function messageFor(entry) {
  const status = entry.status;
  const file = quotePath(entry.file);

  if (status.includes("D")) return `Remove ${file}`;
  if (status.includes("A") || status === "??") return `Add ${file}`;
  if (status.includes("R")) return `Rename ${quotePath(entry.source)} to ${file}`;
  return `Update ${file}`;
}

function pushArgs() {
  const branch = git(["branch", "--show-current"]);
  if (!branch) {
    throw new Error("Cannot push from a detached HEAD.");
  }

  try {
    git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    return ["push"];
  } catch {
    return ["push", "-u", "origin", branch];
  }
}

function run() {
  const entries = changedEntries();

  if (entries.length === 0) {
    console.log("No changed files to push.");
    return;
  }

  const pushCommand = pushArgs();

  for (const entry of entries) {
    const files = entry.source ? [entry.source, entry.file] : [entry.file];
    const commitMessage = messageFor(entry);

    console.log(`\n${commitMessage}`);
    git(["add", "--", ...files], { mutates: true, inherit: true });
    git(["commit", "-m", commitMessage], { mutates: true, inherit: true });
    git(pushCommand, { mutates: true, inherit: true });
  }
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
