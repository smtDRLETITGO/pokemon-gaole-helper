// Phase 0 helper: extract the Nuxt SSR payload (window.__NUXT__) from the saved HTML
// and reveal the data schema for the card list (so we know field names for stats/star/photo).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML = join(__dirname, '_probe_cassette11.html');

const html = readFileSync(HTML, 'utf8');

// 1. locate window.__NUXT__ assignment
const m = html.match(/window\.__NUXT__\s*=\s*(\{.*\})\s*;?/s)
        || html.match(/window\["__NUXT__"\]\s*=\s*(\{.*\})\s*;?/s);
if (!m) { console.error('[extract] __NUXT__ not found'); process.exit(2); }
const raw = m[1];
console.log('[extract] __NUXT__ raw length:', raw.length);

let payload;
try { payload = JSON.parse(raw); }
catch (e) { console.error('[extract] JSON parse failed:', e.message); process.exit(3); }
console.log('[extract] top-level keys:', Object.keys(payload));

// 2. stringify and locate first card number to understand nesting
const s = JSON.stringify(payload);
const idx = s.indexOf('2-2-001');
console.log('\n[extract] first "2-2-001" at char', idx, 'of', s.length);
if (idx >= 0) {
  // print a window of raw JSON around it to see field names
  const win = s.slice(Math.max(0, idx - 400), idx + 700);
  console.log('--- raw JSON window around 2-2-001 ---');
  console.log(win);
  console.log('--- end window ---');
}

// 3. search for stat-like keys anywhere
console.log('\n[extract] searching for stat/key tokens in payload:');
for (const kw of ['"hp"','"hp_','"attack"','"atk"','"defense"','"def"','"sp_attack"','"spAtk"','"speed"','"spd"','"star"','"rating"','"rare"','"move"','"waza"','"type"','"image"','"img"','"photo"','"front"','"back"','"cassette"']) {
  const c = (s.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g')) || []).length;
  if (c) console.log(`   ${kw}: ${c}`);
}

// 4. save parsed payload (pretty top) for later scraping use
writeFileSync(join(__dirname, '_nuxt_payload.json'), JSON.stringify(payload, null, 2));
console.log('\n[extract] saved parsed payload -> scripts/_nuxt_payload.json');
