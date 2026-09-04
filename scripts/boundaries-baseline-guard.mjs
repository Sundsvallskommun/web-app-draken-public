#!/usr/bin/env node
/**
 * Boundary baseline guard: the two baseline files may only shrink.
 *
 * The frontend's import boundaries (docs/architecture/boundaries.md) tolerate a fixed set of
 * pre-existing violations, recorded in
 *
 *   frontend/.dependency-cruiser-known-violations.json   (dependency-cruiser, `yarn lint:deps`)
 *   frontend/eslint-suppressions.json                    (ESLint bulk suppressions, `yarn lint:strict`)
 *
 * Both tools pass as long as a violation is in its baseline, so nothing stops a change from
 * "fixing" a failing check by regenerating the baseline. This script does: it compares each
 * baseline against the same file on a base git ref and fails when any entry is new or its
 * count went up. Removing entries is always fine.
 *
 * Usage:
 *   node scripts/boundaries-baseline-guard.mjs [base-ref]
 *
 * The base ref comes from argv, else from GITHUB_BASE_REF (set by GitHub Actions on
 * pull_request events). Refs are tried as given and as origin/<ref>, so a branch name works in
 * CI, where only remote-tracking refs exist. With no base ref at all (push to develop/main) the
 * script exits 0 with a note; likewise when a baseline does not exist on the base ref yet.
 * A base ref that is given but cannot be resolved is an error: a silently skipped guard is
 * worse than a red job.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

/**
 * dependency-cruiser's baseline reporter writes an array of violations. Every violation is one
 * entry, keyed by rule and edge so the report can say exactly which import is new.
 */
function dependencyCruiserEntries(json) {
  if (!Array.isArray(json)) {
    throw new Error(
      "expected an array of violations (dependency-cruiser --output-type baseline)"
    );
  }
  const entries = new Map();
  for (const violation of json) {
    const key = `${violation.rule?.name ?? "?"}: ${violation.from} -> ${
      violation.to
    }`;
    entries.set(key, (entries.get(key) ?? 0) + 1);
  }
  return entries;
}

/**
 * ESLint's suppressions file is { [file]: { [ruleId]: { count } } }. One entry per file+rule,
 * carrying the number of suppressed violations.
 */
function eslintSuppressionEntries(json) {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new Error(
      "expected an object keyed by file (ESLint bulk suppressions)"
    );
  }
  const entries = new Map();
  for (const [file, rules] of Object.entries(json)) {
    for (const [ruleId, { count }] of Object.entries(rules)) {
      entries.set(`${file} [${ruleId}]`, count);
    }
  }
  return entries;
}

const BASELINES = [
  {
    file: "frontend/.dependency-cruiser-known-violations.json",
    unit: "known import-boundary violations",
    parse: dependencyCruiserEntries,
  },
  {
    file: "frontend/eslint-suppressions.json",
    unit: "suppressed ESLint violations",
    parse: eslintSuppressionEntries,
  },
];

/**
 * git is resolved from a fixed list of absolute locations rather than from PATH: the CI runners
 * and the developer machines this repo targets all have /usr/bin/git, and Homebrew's is the usual
 * override. Set GIT_BINARY to an absolute path to use another installation.
 */
const GIT_LOCATIONS = [
  "/usr/bin/git",
  "/usr/local/bin/git",
  "/opt/homebrew/bin/git",
];

function resolveGitBinary() {
  const override = process.env.GIT_BINARY;
  if (override) {
    if (!path.isAbsolute(override) || !existsSync(override)) {
      throw new Error(
        `GIT_BINARY must be an absolute path to an existing git executable, got "${override}"`
      );
    }
    return override;
  }
  const found = GIT_LOCATIONS.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `git not found at ${GIT_LOCATIONS.join(
        ", "
      )}; set GIT_BINARY to its absolute path`
    );
  }
  return found;
}

const gitBinary = resolveGitBinary();

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync(gitBinary, ["-C", repoRoot, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function resolveBaseRef(requested) {
  for (const candidate of [requested, `origin/${requested}`]) {
    const sha = git(
      ["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`],
      { allowFailure: true }
    );
    if (sha) return { ref: candidate, sha: sha.trim().slice(0, 9) };
  }
  return null;
}

function readBaseline(source, text, parse, describe) {
  try {
    return parse(JSON.parse(text));
  } catch (error) {
    throw new Error(`${describe}: could not read ${source}: ${error.message}`);
  }
}

function total(entries) {
  let sum = 0;
  for (const count of entries.values()) sum += count;
  return sum;
}

function main() {
  const requested = process.argv[2] ?? process.env.GITHUB_BASE_REF;
  if (!requested) {
    console.info(
      "boundaries-baseline-guard: no base ref (argv or GITHUB_BASE_REF); nothing to compare against, skipping."
    );
    return 0;
  }

  const base = resolveBaseRef(requested);
  if (!base) {
    console.error(
      `boundaries-baseline-guard: base ref "${requested}" not found (tried "${requested}" and "origin/${requested}").\n` +
        `Fetch it first, e.g. git fetch --depth=1 origin ${requested}`
    );
    return 1;
  }
  console.info(
    `boundaries-baseline-guard: comparing against ${base.ref} (${base.sha})`
  );

  let failed = false;
  for (const { file, unit, parse } of BASELINES) {
    const baseText = git(["show", `${base.ref}:${file}`], {
      allowFailure: true,
    });
    if (baseText === null) {
      console.info(
        `  ${file}: does not exist on ${base.ref}, nothing to compare against (first baseline), skipping.`
      );
      continue;
    }
    const baseEntries = readBaseline(
      `${base.ref}:${file}`,
      baseText,
      parse,
      file
    );

    const localPath = path.join(repoRoot, file);
    const currentEntries = existsSync(localPath)
      ? readBaseline(file, readFileSync(localPath, "utf8"), parse, file)
      : new Map();

    const grown = [];
    for (const [key, count] of currentEntries) {
      const before = baseEntries.get(key) ?? 0;
      if (count > before) grown.push({ key, before, count });
    }

    const verdict = grown.length === 0 ? "OK" : "GREW";
    console.info(
      `  ${file}: ${total(baseEntries)} -> ${total(
        currentEntries
      )} ${unit}  ${verdict}`
    );
    for (const { key, before, count } of grown) {
      console.info(`    + ${key}  (${before} -> ${count})`);
    }
    if (grown.length > 0) failed = true;
  }

  if (failed) {
    console.error(
      "\nboundaries-baseline-guard: FAIL - the boundary baselines may only shrink.\n" +
        "Fix the violation instead of recording it: move the concept down into the domain that owns it, or up\n" +
        'into the shell. See docs/architecture/boundaries.md, "When a rule fires".'
    );
    return 1;
  }
  console.info("boundaries-baseline-guard: OK");
  return 0;
}

process.exitCode = main();
