#!/usr/bin/env node
// Classify a task branch's diff as high/normal risk — the R2 (cross-vendor
// review) trigger of the risk-tiered review design (proposal §5.2).
//
// Deterministic, path+content+size based. This is a MACHINE gate input: the
// PM must not override the result by judgement (recording a disagreement in
// events.jsonl is fine; skipping R2 on a `high` verdict is not).
//
// Usage (run by the task PM, worktree checked out):
//   node scripts/risk-classify.mjs --repo "$WT" --base "$BASE" [--threshold 500] [--out risk.json]
//   node scripts/risk-classify.mjs --files-from files.txt --diff-from diff.txt   # test mode (no git)
//
// Output (stdout + optional --out): JSON
//   { risk: "high"|"normal", changed_lines, threshold, reasons: [{rule, detail}], files: [...] }
// Exit codes: 0 = classified (either risk), 2 = could not classify (missing input / git failure).
// A failure to classify must be treated as HIGH by the caller (fail-closed).

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function die(msg) {
  console.error(`risk-classify.mjs: ${msg}`);
  process.exit(2);
}

// --- rules -------------------------------------------------------------------
// Path rules: any changed file matching → high.
const PATH_RULES = [
  // Match the keyword at a path-segment or word boundary anywhere in the path,
  // so directories (src/auth/handler.ts) and suffixed names (user-login.ts)
  // both fire. Over-matching (e.g. "tokenizer") is accepted — fail toward review.
  ['auth-authz', /(^|\/|[-_.])(auth[nz]?|authenticat|authoriz|session|login|logout|oauth|oidc|sso|jwt|token|passw|credential|secrets?|permission|rbac|acl|policy|guard)/i],
  ['tenant-billing-pii', /(^|\/)[^/]*(tenant|billing|payment|invoice|subscription|stripe|checkout|pii|personal[-_]?data|gdpr)[^/]*$/i],
  ['db-migration', /(^|\/)(migrations?|migrate)\//i],
  ['db-migration', /(^|\/)[^/]*\.(sql)$/i],
  ['iac', /(^|\/)(infra|infrastructure|terraform|cdk|pulumi)\//i],
  ['iac', /(^|\/)(template\.ya?ml|samconfig\.toml|serverless\.ya?ml|cdk\.json|[^/]*\.tf|[^/]*\.tfvars)$/i],
  ['ci-config', /^\.github\/workflows\//i],
  ['guard-config', /^(\.claude\/|\.mcp\.json$|scripts\/verdict\.mjs$|\.agent-tasks\/schemas\/)/i],
  ['dependencies', /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|requirements[^/]*\.txt|poetry\.lock|Pipfile(\.lock)?|pyproject\.toml|go\.(mod|sum)|Cargo\.(toml|lock)|Gemfile(\.lock)?|composer\.(json|lock))$/i],
];

// Content rules: applied to ADDED lines of the unified diff only.
const CONTENT_RULES = [
  ['auth-authz-content', /\b(authoriz|authenticat|is[_-]?admin|has[_-]?permission|jwt|bearer|session[_-]?(id|token)|set[-_]?cookie|csrf)\b/i],
  ['tenant-billing-content', /\b(tenant[_-]?id|billing|charge|invoice|price[_-]?id|subscription)\b/i],
  ['destructive-sql', /\b(drop\s+table|truncate\s+table|delete\s+from|drop\s+column)\b/i],
  // 2026-07-07 パイロット実測: 機微キー処理コード（password/apikey/secret 定数）が
  // 旧ルール（api_key の直後に := を要求）をすり抜けた。裸の語も拾う（fail toward review）。
  ['secrets-suspect', /\b(aws[_-]?secret|api[_-]?keys?|apikey|secrets?|password|passwd|private[_-]?key|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY)\b/i],
];

function classify({ files, addedLines, changedLines, threshold }) {
  const reasons = [];
  for (const f of files) {
    for (const [rule, re] of PATH_RULES) {
      if (re.test(f)) {
        reasons.push({ rule: `path:${rule}`, detail: f });
        break; // one reason per file is enough
      }
    }
  }
  const contentHits = new Map();
  for (const line of addedLines) {
    for (const [rule, re] of CONTENT_RULES) {
      if (re.test(line) && !contentHits.has(rule)) {
        contentHits.set(rule, line.trim().slice(0, 120));
      }
    }
  }
  for (const [rule, sample] of contentHits) {
    reasons.push({ rule: `content:${rule}`, detail: sample });
  }
  if (changedLines > threshold) {
    reasons.push({ rule: 'size:changed-lines', detail: `${changedLines} > ${threshold}` });
  }
  return {
    risk: reasons.length > 0 ? 'high' : 'normal',
    changed_lines: changedLines,
    threshold,
    reasons,
    files,
  };
}

// --- input collection ----------------------------------------------------------
function argValue(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function main() {
  const argv = process.argv.slice(2);
  const threshold = Number(argValue(argv, '--threshold') ?? 500);
  const out = argValue(argv, '--out');

  let files, diffText;
  const filesFrom = argValue(argv, '--files-from');
  const diffFrom = argValue(argv, '--diff-from');
  if (filesFrom || diffFrom) {
    // Test mode: read pre-captured git output. Both required.
    if (!filesFrom || !diffFrom) die('--files-from and --diff-from must be used together');
    try {
      files = fs.readFileSync(filesFrom, 'utf-8').split(/\r?\n/).filter(Boolean);
      diffText = fs.readFileSync(diffFrom, 'utf-8');
    } catch (e) { die(`cannot read input: ${e.message}`); }
  } else {
    const repo = argValue(argv, '--repo');
    const base = argValue(argv, '--base');
    if (!repo || !base) die('usage: risk-classify.mjs --repo <worktree> --base <ref> [--threshold N] [--out file] | --files-from f --diff-from f');
    try {
      files = execFileSync('git', ['diff', '--name-only', base], { cwd: repo, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
        .split(/\r?\n/).filter(Boolean);
      diffText = execFileSync('git', ['diff', '-U0', base], { cwd: repo, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
      // Untracked (never-added) files are INVISIBLE to `git diff <base>` — a new
      // src/auth/login.ts would silently escape classification (observed in the
      // 2026-07-07 pilot). Include them: path rules see the filename, content
      // rules see the whole file as added lines.
      const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: repo, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
        .split(/\r?\n/).filter(Boolean);
      const extraAdded = [];
      for (const f of untracked) {
        files.push(f);
        try {
          const st = fs.statSync(`${repo}/${f}`);
          if (st.size > 1024 * 1024) continue; // skip huge/binary-ish blobs; path rules still apply
          const body = fs.readFileSync(`${repo}/${f}`, 'utf-8');
          if (body.includes('\0')) continue; // binary
          for (const line of body.split(/\r?\n/)) extraAdded.push(`+${line}`);
        } catch { /* unreadable file: path rules still apply */ }
      }
      if (extraAdded.length > 0) diffText += '\n' + extraAdded.join('\n');
    } catch (e) { die(`git diff failed (treat as HIGH, fail-closed): ${e.message}`); }
  }

  const addedLines = diffText.split(/\r?\n/).filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const removedCount = diffText.split(/\r?\n/).filter((l) => l.startsWith('-') && !l.startsWith('---')).length;
  const changedLines = addedLines.length + removedCount;

  const result = classify({ files, addedLines, changedLines, threshold });
  const json = JSON.stringify(result, null, 2);
  if (out) fs.writeFileSync(out, json + '\n');
  console.log(json);
}

main();
