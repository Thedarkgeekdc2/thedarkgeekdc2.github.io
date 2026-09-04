#!/usr/bin/env node
/**
 * Auto-builds data/manifest.json by scanning data/class-N/(subject)/*.json
 *
 * Usage:
 *   node scripts/generate-manifest.js
 *
 * Workflow this enables:
 *   1. Create a topic JSON file (see data/README.md for the exact fields)
 *   2. Drop it inside data/class-<N>/<subject>/
 *   3. Run this script (or let the GitHub Action do it automatically)
 *   4. manifest.json is rebuilt for you - nothing to edit by hand.
 *
 * Nothing else in the repo is touched. If a file is missing a required
 * field it is skipped with a warning instead of breaking the whole build.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

function toPosix(p) { return p.split(path.sep).join('/'); }

function findTopicFiles() {
  const files = [];
  if (!fs.existsSync(DATA_DIR)) return files;
  for (const classDir of fs.readdirSync(DATA_DIR)) {
    const classPath = path.join(DATA_DIR, classDir);
    if (!fs.statSync(classPath).isDirectory()) continue;
    if (!/^class-\d+$/.test(classDir)) continue; // only data/class-N folders
    for (const subjectDir of fs.readdirSync(classPath)) {
      const subjectPath = path.join(classPath, subjectDir);
      if (!fs.statSync(subjectPath).isDirectory()) continue;
      for (const file of fs.readdirSync(subjectPath)) {
        if (!file.endsWith('.json')) continue; // skips .gitkeep etc.
        files.push(path.join(subjectPath, file));
      }
    }
  }
  return files;
}

function buildManifest() {
  const topics = [];
  const warnings = [];

  for (const fullPath of findTopicFiles()) {
    const relFile = toPosix(path.relative(ROOT, fullPath));
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
      warnings.push(`${relFile}: invalid JSON (${e.message}) - skipped`);
      continue;
    }
    const { class: cls, subject, topic, questions } = data;
    if (!Number.isInteger(cls)) { warnings.push(`${relFile}: missing/invalid "class" - skipped`); continue; }
    if (!subject) { warnings.push(`${relFile}: missing "subject" - skipped`); continue; }
    if (!topic) { warnings.push(`${relFile}: missing "topic" - skipped`); continue; }
    if (!Array.isArray(questions)) { warnings.push(`${relFile}: missing "questions" array - skipped`); continue; }

    topics.push({ file: relFile, class: cls, subject, topic, questionCount: questions.length });
  }

  topics.sort((a, b) =>
    a.class - b.class ||
    String(a.subject).localeCompare(String(b.subject)) ||
    String(a.topic).localeCompare(String(b.topic))
  );

  return { manifest: { version: 1, topics }, warnings };
}

const { manifest, warnings } = buildManifest();
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`✅ data/manifest.json rebuilt with ${manifest.topics.length} topic(s).`);
if (warnings.length) {
  console.log('\n⚠️  Skipped files:');
  warnings.forEach(w => console.log('   - ' + w));
}
