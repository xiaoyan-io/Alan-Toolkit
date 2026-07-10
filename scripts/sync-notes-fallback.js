const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'apps/prompt-workflow-notes/data/notes.json');
const JS_PATH = path.join(ROOT, 'apps/prompt-workflow-notes/script.js');

let notes;
try {
  notes = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
} catch (e) {
  console.error('Error: cannot read or parse notes.json -', e.message);
  process.exit(1);
}

if (!Array.isArray(notes)) {
  console.error('Error: notes.json must contain a JSON array');
  process.exit(1);
}

function escape(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function formatValue(v) {
  if (typeof v === 'string') return "'" + escape(v) + "'";
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (v === null) return 'null';
  if (Array.isArray(v)) return '[' + v.map(formatValue).join(', ') + ']';
  return String(v);
}

function formatNote(n) {
  const pairs = [];
  for (const k of Object.keys(n)) {
    pairs.push('    ' + k + ': ' + formatValue(n[k]));
  }
  return '  {\n' + pairs.join(',\n') + ',\n  }';
}

let js;
try {
  js = fs.readFileSync(JS_PATH, 'utf8');
} catch (e) {
  console.warn('Warning: cannot read script.js, creating placeholder');
  js = '';
}

const PATTERN = /const\s+fallbackNotes\s*=\s*\[[\s\S]*?\];/;
const hasPattern = PATTERN.test(js);

const lines = notes.length > 0 ? notes.map(formatNote).join(',\n') + ',\n' : '';
const replacement = 'const fallbackNotes = [\n' + lines + '];';

if (hasPattern) {
  js = js.replace(PATTERN, replacement);
  fs.writeFileSync(JS_PATH, js, 'utf8');
  console.log('Updated script.js fallbackNotes (' + notes.length + ' items)');
} else {
  console.log('Fallback array not yet in script.js — will be created during implementation');
  console.log('Preview of data (' + notes.length + ' items)');
}

// Verify JSON validity
try {
  JSON.parse(JSON.stringify(notes));
  console.log('notes.json is valid JSON ✓');
} catch (e) {
  console.error('notes.json is invalid JSON ✗', e.message);
  process.exit(1);
}
