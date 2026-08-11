#!/usr/bin/env node
// Reads a CTRF JSON report, mechanically derives a verdict per the amt-test-result
// wrapper schema's rules, validates the assembled wrapper against the schema with
// ajv, and writes it out.
//
// Verdict derivation (copied verbatim from the schema's `verdict` description):
//   hard_fail=true OR summary.failed>0        -> FAIL
//   all tests pass AND limitations non-empty  -> PASS_WITH_LIMITATIONS
//   all tests pass AND limitations empty      -> PASS
//
// summary.pending/summary.other are transcribed from the CTRF report (defaulting to
// 0 when absent). tests must equal passed+failed+skipped+pending+other, or the
// wrapper build fails (exit 2) rather than silently losing track of tests. Any
// pending/other tests are folded into `limitations` automatically, which caps the
// verdict at PASS_WITH_LIMITATIONS (never PASS) via the rule above.
//
// Exit codes:
//   0 - wrapper built + schema-valid (regardless of verdict), unless --gate and verdict==FAIL
//   1 - only when --gate is passed AND verdict == FAIL
//   2 - failure to build/validate the wrapper itself (bad CTRF input, ajv validation
//       failure, missing required args, file I/O errors, etc.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA_PATH = path.resolve(
  __dirname,
  '../.agent-tasks/schemas/test-result.json'
);

const VALID_EVIDENCE_LEVELS = ['ui', 'system_state', 'api_call', 'audit_trace'];

function die(message, code = 2) {
  console.error(`verdict.mjs: ${message}`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    limitations: [],
    hardFailReasons: [],
    evidence: [],
    gate: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--task-id':
        args.taskId = argv[++i];
        break;
      case '--commit-sha':
        args.commitSha = argv[++i];
        break;
      case '--ctrf':
        args.ctrfPath = argv[++i];
        break;
      case '--endpoint':
        args.endpoint = argv[++i];
        break;
      case '--stack-name':
        args.stackName = argv[++i];
        break;
      case '--region':
        args.region = argv[++i];
        break;
      case '--limitation': {
        const raw = argv[++i];
        if (raw === undefined) die(`--limitation requires a value ("item::reason")`);
        const sepIndex = raw.indexOf('::');
        if (sepIndex === -1) {
          die(`--limitation value must be in "item::reason" form, got: ${raw}`);
        }
        args.limitations.push({
          item: raw.slice(0, sepIndex),
          reason: raw.slice(sepIndex + 2),
        });
        break;
      }
      case '--hard-fail':
        args.hardFailReasons.push(argv[++i]);
        break;
      case '--evidence': {
        const raw = argv[++i];
        if (raw === undefined) die(`--evidence requires a value ("level::path[::description]")`);
        const parts = raw.split('::');
        const level = parts[0];
        const evidencePath = parts[1];
        if (!VALID_EVIDENCE_LEVELS.includes(level)) {
          die(`--evidence level must be one of ${VALID_EVIDENCE_LEVELS.join(', ')}, got: ${level}`);
        }
        if (!evidencePath) {
          die(`--evidence must include a path, got: ${raw}`);
        }
        const description = parts.length > 2 ? parts.slice(2).join('::') : undefined;
        args.evidence.push(
          description !== undefined
            ? { level, path: evidencePath, description }
            : { level, path: evidencePath }
        );
        break;
      }
      case '--out':
        args.out = argv[++i];
        break;
      case '--gate':
        args.gate = true;
        break;
      default:
        die(`unknown argument: ${arg}`);
    }
  }

  if (!args.taskId) die('--task-id is required');
  if (!args.commitSha) die('--commit-sha is required');
  if (!args.ctrfPath) die('--ctrf is required');

  return args;
}

function loadCtrf(ctrfPath) {
  let raw;
  try {
    raw = fs.readFileSync(ctrfPath, 'utf-8');
  } catch (err) {
    die(`failed to read CTRF file at ${ctrfPath}: ${err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    die(`failed to parse CTRF file at ${ctrfPath} as JSON: ${err.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.results) {
    die(`CTRF file at ${ctrfPath} does not contain a "results" object`);
  }
  const summary = parsed.results.summary;
  if (!summary || typeof summary !== 'object') {
    die(`CTRF file at ${ctrfPath} does not contain results.summary`);
  }
  for (const key of ['tests', 'passed', 'failed', 'skipped']) {
    if (typeof summary[key] !== 'number') {
      die(`CTRF results.summary.${key} is missing or not a number (got: ${JSON.stringify(summary[key])})`);
    }
  }
  for (const key of ['pending', 'other']) {
    if (summary[key] !== undefined && typeof summary[key] !== 'number') {
      die(`CTRF results.summary.${key} is not a number (got: ${JSON.stringify(summary[key])})`);
    }
  }
  return parsed;
}

function deriveVerdict({ hardFail, summary, limitations }) {
  if (hardFail || summary.failed > 0) {
    return 'FAIL';
  }
  if (limitations.length > 0) {
    return 'PASS_WITH_LIMITATIONS';
  }
  return 'PASS';
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const ctrf = loadCtrf(args.ctrfPath);
  const ctrfSummary = ctrf.results.summary;

  // Mechanical transcription only — no LLM/human authoring of these numbers.
  const summary = {
    tests: ctrfSummary.tests,
    passed: ctrfSummary.passed,
    failed: ctrfSummary.failed,
    skipped: ctrfSummary.skipped,
    pending: ctrfSummary.pending ?? 0,
    other: ctrfSummary.other ?? 0,
  };

  const accounted =
    summary.passed + summary.failed + summary.skipped + summary.pending + summary.other;
  if (summary.tests !== accounted) {
    die(
      `CTRF summary mismatch: tests (${summary.tests}) !== passed+failed+skipped+pending+other (${accounted}); refusing to generate a verdict with unaccounted-for tests`
    );
  }

  // pending/other tests were never verified as passed or failed, so they always
  // count as a limitation and cap the verdict at PASS_WITH_LIMITATIONS (see deriveVerdict).
  const limitations = [...args.limitations];
  const unresolved = summary.pending + summary.other;
  if (unresolved > 0) {
    limitations.push({
      item: 'ctrf_pending_or_other_tests',
      reason: `${unresolved} test(s) reported as pending/other status and were not verified as passed or failed`,
    });
  }

  const hardFail = args.hardFailReasons.length > 0;
  const verdict = deriveVerdict({ hardFail, summary, limitations });

  const target = { commit_sha: args.commitSha };
  if (args.endpoint) target.endpoint = args.endpoint;
  if (args.stackName) target.stack_name = args.stackName;
  if (args.region) target.region = args.region;

  const wrapper = {
    schema_version: '1.0',
    task_id: args.taskId,
    target,
    verdict,
    hard_fail: hardFail,
    summary,
    ctrf,
    generated_at: new Date().toISOString(),
  };

  if (hardFail) {
    wrapper.hard_fail_reasons = args.hardFailReasons;
  }
  if (limitations.length > 0) {
    wrapper.limitations = limitations;
  }
  if (args.evidence.length > 0) {
    wrapper.evidence = args.evidence;
  }

  // Validate against the canonical (read-only) schema before writing anything out.
  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  } catch (err) {
    die(`failed to read canonical schema at ${SCHEMA_PATH}: ${err.message}`);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(wrapper);

  if (!valid) {
    console.error('verdict.mjs: wrapper failed schema validation:');
    for (const e of validate.errors) {
      console.error(`  ${e.instancePath || '(root)'} ${e.message} ${JSON.stringify(e.params)}`);
    }
    process.exit(2);
  }

  const outPath = args.out ?? 'test-result.json';
  try {
    fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(wrapper, null, 2) + '\n', 'utf-8');
  } catch (err) {
    die(`failed to write wrapper JSON to ${outPath}: ${err.message}`);
  }

  console.log(verdict);

  if (args.gate && verdict === 'FAIL') {
    process.exit(1);
  }
  process.exit(0);
}

main();
