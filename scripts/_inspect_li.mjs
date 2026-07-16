// Phase 0: print ONE full <li class="cassette-list__item"> block to see what data is rendered.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, '_probe_cassette11.html'), 'utf8');

// grab first <li class="cassette-list__item" ...> ... </li>
const re = /<li class="cassette-list__item"[^>]*>([\s\S]*?)<\/li>/i;
const m = html.match(re);
if (!m) { console.error('no li found'); process.exit(1); }
const block = m[1].replace(/\s+/g, ' ').trim();
console.log('=== ONE <li> BLOCK (first card) ===');
console.log(block.slice(0, 1600));
console.log('\n=== length:', block.length, '===');

// also: does the page contain a stats-bearing pattern per card? search for "HP" with context
const hpIdx = html.indexOf('HP');
if (hpIdx >= 0) {
  console.log('\n=== context around first "HP" ===');
  console.log(html.slice(hpIdx - 200, hpIdx + 200).replace(/\s+/g, ' '));
}
