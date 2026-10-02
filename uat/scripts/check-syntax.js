#!/usr/bin/env node
/**
 * check-syntax.js — CI syntax gate.
 *
 * Validates every tracked .js file parses and every tracked .json file is valid
 * JSON, so a single broken file cannot deploy. Run locally with:
 *
 *   node scripts/check-syntax.js
 *
 * Exits non-zero on the first category with failures, printing each offender.
 * Google Apps Script (.gs) files are skipped: they are not Node modules and
 * use GAS-only globals.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const SKIP = /(^|\/)(node_modules|\.wrangler|\.playwright-mcp)\//;

const tracked = execFileSync('git', ['ls-files', '*.js', '*.json'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .filter(file => !SKIP.test(file) && !file.endsWith('package-lock.json'));

const jsFiles = tracked.filter(file => file.endsWith('.js'));
const jsonFiles = tracked.filter(file => file.endsWith('.json'));

const jsFailures = [];
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', path.join(root, file)], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (error) {
    jsFailures.push({ file, detail: String(error.stderr || error.message).trim() });
  }
}

const jsonFailures = [];
for (const file of jsonFiles) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch (error) {
    jsonFailures.push({ file, detail: error.message });
  }
}

// node --check prints "file:line", a source excerpt, then the real error.
// Pull the SyntaxError/JSON error line rather than the useless filename header.
const meaningfulLine = detail => {
  const lines = String(detail).split('\n').map(line => line.trim()).filter(Boolean);
  return lines.find(line => /^(SyntaxError|Error|.*:\s*(Unexpected|Invalid|Expected))/.test(line))
    || lines[lines.length - 1]
    || 'unknown error';
};

const report = (label, failures) => {
  if (!failures.length) {
    console.log(`✓ ${label}: ok`);
    return true;
  }
  console.error(`✗ ${label}: ${failures.length} file(s) failed\n`);
  for (const { file, detail } of failures) {
    console.error(`  ${file}`);
    console.error(`    ${meaningfulLine(detail)}\n`);
  }
  return false;
};

console.log(`Checking ${jsFiles.length} JS and ${jsonFiles.length} JSON files...\n`);
const jsOk = report('JavaScript syntax', jsFailures);
const jsonOk = report('JSON validity', jsonFailures);

if (jsOk && jsonOk) {
  console.log('\nAll files valid.');
  process.exit(0);
}
console.error('\nSyntax gate failed — fix the files above before deploying.');
process.exit(1);
