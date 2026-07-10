const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'assets/data/tools.json');
const JS_PATH = path.join(ROOT, 'script.js');

let tools;
try {
  tools = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
} catch (e) {
  console.error('Error: cannot read or parse tools.json -', e.message);
  process.exit(1);
}

if (!Array.isArray(tools)) {
  console.error('Error: tools.json must contain a JSON array');
  process.exit(1);
}

function escape(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatTool(t) {
  const pairs = Object.keys(t).map(k => {
    const v = t[k];
    return typeof v === 'string' ? k + ": '" + escape(v) + "'" : k + ': ' + v;
  });
  return '  { ' + pairs.join(', ') + ' }';
}

let js;
try {
  js = fs.readFileSync(JS_PATH, 'utf8');
} catch (e) {
  console.error('Error: cannot read script.js -', e.message);
  process.exit(1);
}

const PATTERN = /const\s+fallbackTools\s*=\s*\[[\s\S]*?\];/;
const match = js.match(PATTERN);
if (!match) {
  console.error('Error: cannot find "const fallbackTools = [...]" in script.js');
  process.exit(1);
}

const lines = tools.length > 0 ? tools.map(formatTool).join(',\n') + ',\n' : '';
const replacement = 'const fallbackTools = [\n' + lines + '];';

js = js.replace(PATTERN, replacement);
fs.writeFileSync(JS_PATH, js, 'utf8');

console.log('Updated script.js fallbackTools (' + tools.length + ' items)');
